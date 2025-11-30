from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated, Any

from authlib.common.security import generate_token
from authlib.integrations.httpx_client import AsyncOAuth2Client
from authlib.jose import jwt
from litestar import Litestar, Request, get
from litestar.connection import ASGIConnection
from litestar.datastructures import State
from litestar.exceptions import ClientException, InternalServerException
from litestar.middleware.session.server_side import (
    ServerSideSessionBackend,
    ServerSideSessionConfig,
)
from litestar.params import Parameter
from litestar.response import Redirect
from litestar.security.session_auth import SessionAuth
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .config import (
    KEYCLOAK_AUTH_URL,
    KEYCLOAK_CLIENT_ID,
    KEYCLOAK_REALM_PUBKEY,
    KEYCLOAK_TOKEN_URL,
)
from .database import async_engine
from .models import AuthUser


@asynccontextmanager
async def keycloak_client(app: Litestar) -> AsyncGenerator[None, None]:
    keycloak_client = getattr(app.state, 'keycloak_client', None)
    if keycloak_client is None:
        keycloak_client = AsyncOAuth2Client(
            client_id=KEYCLOAK_CLIENT_ID,
            client_secret=None,
            scope='openid email',
            code_challenge_method='S256',
        )
        app.state.keycloak_client = keycloak_client

    try:
        yield
    finally:
        await keycloak_client.aclose()


@get('/login')
async def login(state: State, request: Request) -> Redirect:
    client: AsyncOAuth2Client = state.keycloak_client
    nonce = generate_token()
    code_verifier = generate_token(48)
    request.session['nonce'] = nonce
    request.session['code_verifier'] = code_verifier
    auth_uri, oauth_state = client.create_authorization_url(
        url=KEYCLOAK_AUTH_URL,
        response_type='code',
        redirect_uri=request.url_for('callback'),
        nonce=nonce,
        code_verifier=code_verifier,
    )
    request.session['oauth_state'] = oauth_state
    return Redirect(path=auth_uri)


@get('/callback', name='callback')
async def callback(
    code: str,
    oauth_state: Annotated[str, Parameter(query='state')],
    state: State,
    request: Request,
    transaction: AsyncSession,
) -> None:
    client: AsyncOAuth2Client = state.keycloak_client
    if oauth_state != request.session['oauth_state']:
        # TODO: log more stuff
        raise ClientException('State is invalid')
    token = await client.fetch_token(
        url=KEYCLOAK_TOKEN_URL,
        grant_type='authorization_code',
        redirect_uri=request.url_for('callback'),
        code=code,
        code_verifier=request.session.get('code_verifier'),
    )
    id_token = jwt.decode(token['id_token'], key=KEYCLOAK_REALM_PUBKEY)
    if id_token['nonce'] != request.session['nonce']:
        raise ClientException('Invalid nonce')

    user = await transaction.scalar(
        select(AuthUser).where(AuthUser.user_id == id_token['sub'])
    )
    if user is None:
        user = AuthUser(
            user_id=id_token['sub'],
            # TODO: user chooses username at other endpoint? I don't think
            # preferred_username claim is unique.
            username=generate_token(32),
        )
        transaction.add(user)
        try:
            transaction.commit()
        except Exception:
            raise InternalServerException
    request.session['user_id'] = id_token['sub']
    # TODO: consider returning serialized user here
    return None


async def retrieve_user_handler(
    session: dict[str, Any],
    connection: ASGIConnection[Any, Any, Any, Any],
) -> AuthUser | None:
    if user_id := session.get('user_id'):
        async with async_engine.begin() as conn:
            return await conn.scalar(
                select(AuthUser).where(AuthUser.user_id == user_id)
            )
    return None


session_auth = SessionAuth[AuthUser, ServerSideSessionBackend](
    retrieve_user_handler=retrieve_user_handler,
    session_backend_config=ServerSideSessionConfig(),
    exclude=['/login', '/callback', '/schema'],
)
