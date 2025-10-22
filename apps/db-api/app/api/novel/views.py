import structlog
from litestar import Router
from litestar import get as _get
from litestar.datastructures import State
from litestar.di import Provide
from meilisearch_python_sdk import AsyncClient, AsyncIndex
from meilisearch_python_sdk.errors import MeilisearchApiError

from ..problem_details import create_400_response_spec
from ..schemas import (
    GENERIC_RESPONSE_DESCRIPTION,
    QueryResponse,
    create_sort_pattern,
)
from .meili import filterable_attributes, searchable_attributes, sortable_attributes
from .schemas import NovelQueryRequest, NovelSchema

PATH = '/novels'
logger = structlog.stdlib.get_logger()


async def get_meili_novel_index(state: State) -> AsyncIndex:
    client: AsyncClient = state.meili_client
    try:
        index = await client.get_index('novels')
    except MeilisearchApiError as e:
        if e.status_code == 404:  # Index doesn't exist
            index = await client.create_index('novels', primary_key='novel_id')
            # Order of searchable attributes matters; earlier elements are more
            # important when calculating relevancy.
            await index.update_searchable_attributes(searchable_attributes)
            await index.update_filterable_attributes(filterable_attributes)
            await index.update_sortable_attributes(sortable_attributes)
            await index.update_ranking_rules(
                ['words', 'sort', 'typo', 'proximity', 'attribute', 'exactness']
            )
        else:
            logger.error('Could not get Meilisearch index')
            raise
    return index


@_get(
    path='/',
    dependencies={'query_request': Provide(NovelQueryRequest, sync_to_thread=True)},
    tags=['novels'],
    summary='Query novels',
    description=f'Search for and fetch web novel entries.',
    response_description=GENERIC_RESPONSE_DESCRIPTION,
    responses={
        400: create_400_response_spec(
            description='Bad request syntax or validation error',
            include_validation_error=True,
            validation_detail_example='Validation failed for GET /novels?sort=novel_id',
            validation_message_example=(
                f"Expected `str` matching regex '{create_sort_pattern(sortable_attributes)}'",
            ),
            validation_key_example='sort',
            validation_source_example='query',
        )
    },
)
async def query_novels(
    meili_index: AsyncIndex, query_request: NovelQueryRequest
) -> QueryResponse[NovelSchema]:
    if query_request.q != '':
        meili_results = await meili_index.search(
            query=query_request.q,
            offset=query_request.offset,
            limit=query_request.limit,
            filter=query_request.filter,
            attributes_to_retrieve=query_request.fields,
            sort=query_request.sort,
        )
        return QueryResponse(
            items=meili_results.hits,
            query=meili_results.query,
            offset=meili_results.offset,
            limit=meili_results.limit,
        )
    meili_results = await meili_index.get_documents(
        offset=query_request.offset,
        limit=query_request.limit,
        fields=None if '*' in query_request.fields else query_request.fields,
        filter=query_request.filter,
        # Need to convert `sort` to CSV string for now until SDK converts it
        # to a CSV string when using GET to fetch documents.
        sort=','.join(query_request.sort),
    )
    return QueryResponse(
        items=meili_results.results,
        query=query_request.q,
        offset=meili_results.offset,
        limit=meili_results.limit,
    )


novel_router = Router(
    path=PATH,
    dependencies={'meili_index': Provide(get_meili_novel_index)},
    route_handlers=[query_novels],
)
