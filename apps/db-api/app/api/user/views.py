from typing import Any, Literal

import structlog
from litestar import Request, Router, get
from sqlalchemy.ext.asyncio import AsyncSession
from litestar.exceptions import InternalServerException

from app.models import AuthUser

from .schemas import UserSchema, to_user_schema
from .service import select_auth_user
from ..schemas import GENERIC_RESPONSE_DESCRIPTION

PATH = '/user'

logger = structlog.stdlib.get_logger()

@get(
    path='/',
    summary='Get user',
    description='Retrieve user logged into the session based on cookies.',
    response_description=GENERIC_RESPONSE_DESCRIPTION,
)
async def get_user(
    transaction: AsyncSession,
    request: Request[AuthUser, dict[Literal['user_id'], str], Any],
) -> UserSchema:
    # request.user is a user_id string
    user = await select_auth_user(transaction, request.user)
    if user is None:
        logger.exception('Session was assigned a non-existent user_id')
        raise InternalServerException
    return to_user_schema(user)


user_router = Router(path=PATH, route_handlers=[get_user])
