from litestar import Router
from litestar import get as _get
from litestar.di import Provide
from sqlalchemy.ext.asyncio import AsyncSession

from ..pagination import create_page_tokens, process_page_size, process_page_token
from ..problem_details import pagination_400_response_spec
from ..schemas import (
    GENERIC_QUERY_PARAM_USAGE_NOTE,
    GENERIC_RESPONSE_DESCRIPTION,
    QueryRequest,
    QueryResponse,
)
from .schemas import WebNovelSchema, to_web_novel_schema
from .service import query

PATH = '/web-novels'


@_get(
    path='/',
    dependencies={'query_request': Provide(QueryRequest, sync_to_thread=True)},
    tags=['web novels'],
    summary='Query web novels',
    description=(
        f'Search for and fetch web novel entries.\n\n{GENERIC_QUERY_PARAM_USAGE_NOTE}'
    ),
    response_description=GENERIC_RESPONSE_DESCRIPTION,
    responses={400: pagination_400_response_spec(PATH)},
)
async def query_web_novels(
    transaction: AsyncSession, query_request: QueryRequest
) -> QueryResponse[WebNovelSchema]:
    try:
        bookmark = process_page_token(query_request, PATH)
    except Exception:
        raise
    page = await query(
        transaction, process_page_size(query_request.max_page_size), bookmark
    )
    return QueryResponse(
        [to_web_novel_schema(n) for (n,) in page],
        *create_page_tokens(query_request, PATH, page),
    )


web_novel_router = Router(path=PATH, route_handlers=[query_web_novels])
