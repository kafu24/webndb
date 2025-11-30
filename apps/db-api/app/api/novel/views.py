from typing import Annotated

import structlog
from litestar import Response, Router, get, patch, post
from litestar.datastructures import State
from litestar.di import Provide
from litestar.exceptions import (
    ClientException,
    InternalServerException,
    NotFoundException,
)
from meilisearch_python_sdk import AsyncClient, AsyncIndex
from meilisearch_python_sdk.errors import MeilisearchApiError
from msgspec import UNSET
from sqlalchemy.ext.asyncio import AsyncSession

from app.const import INVALID_WEBNDB_ID, NOVEL_DESCRIPTION_MAX, NOVEL_TITLE_MAX
from app.meili import format_meili_api_error

from ..problem_details import (
    create_400_response_spec,
    create_404_response_spec,
    required_request_body_guard,
)
from ..schemas import (
    GENERIC_RESPONSE_DESCRIPTION,
    ContentLocationHeader,
    LocationHeader,
    QueryResponse,
    create_sort_pattern,
    custom_operation,
    custom_reqbody,
)
from .meili import filterable_attributes, searchable_attributes, sortable_attributes
from .schemas import (
    NovelCreateSchema,
    NovelIDMeta,
    NovelIDParam,
    NovelQueryRequest,
    NovelSchema,
    NovelUpdateSchema,
    to_novel_schema,
)
from .service import (
    clear_novel_titles,
    find_repeated_lang_titles,
    insert_novel,
    select_novel,
    update_novel,
    upsert_novel_titles,
)

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


@get(
    path='/',
    exclude_from_auth=True,
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
                f"Expected `str` matching regex '{create_sort_pattern(sortable_attributes)}'"
            ),
            validation_key_example='sort',
            validation_source_example='query',
        )
    },
)
async def query_novels(
    meili_index: AsyncIndex, query_request: NovelQueryRequest
) -> QueryResponse[NovelSchema]:
    try:
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
    except MeilisearchApiError as e:
        raise format_meili_api_error(e)
    except Exception:
        raise InternalServerException


@get(
    path='/{novel_id:str}',
    exclude_from_auth=True,
    tags=['novels'],
    summary='Get novel',
    description='Retrieve a novel by its WebNDB novel ID.',
    response_description=GENERIC_RESPONSE_DESCRIPTION,
    responses={
        400: create_400_response_spec(
            description='Bad request syntax or validation error',
            include_validation_error=True,
            validation_detail_example=(
                f'Validation failed for GET /novels/{INVALID_WEBNDB_ID}'
            ),
            validation_message_example=(
                f'Expected `str` of length <= {NovelIDMeta.max_length}'
            ),
            validation_key_example='novel_id',
            validation_source_example='path',
        ),
        404: create_404_response_spec(
            description='Novel ID in path parameter is not associated with a novel',
            detail_example='Could not find a novel identified by novel ID 0',
        ),
    },
)
async def get_novel(
    transaction: AsyncSession, novel_id: Annotated[str, NovelIDParam]
) -> NovelSchema:
    novel = await select_novel(transaction, novel_id)
    if novel is None:
        raise NotFoundException(
            f'Could not find a novel identified by novel ID {novel_id}'
        )
    return to_novel_schema(novel)


@post(
    path='/',
    guards=[required_request_body_guard],
    tags=['novels'],
    summary='Create novel',
    description='Create a new web novel entry.',
    operation_class=custom_operation(
        custom_reqbody(
            description=(
                f'Descriptions are limited to {NOVEL_DESCRIPTION_MAX} characters.'
                f' Titles are limited to {NOVEL_TITLE_MAX} characters.\n'
                '\n'
                'A novel must have at least one title.'
                ' There can only be one title per language.'
            ),
            required=True,
        )
    ),
    response_headers=[LocationHeader, ContentLocationHeader],
    response_description='Novel created, representation follows',
    responses={
        400: create_400_response_spec(
            description=(
                'Bad request syntax, validation error, or more than one title'
                ' per language'
            ),
            client_error_detail_example=(
                "Language 'en' is used by more than one title"
                ' but only one title per language is allowed'
            ),
            include_validation_error=True,
            validation_detail_example='Validation failed for POST /novels',
            validation_message_example="Invalid enum value 'eng'",
            validation_key_example='titles[0].lang',
            validation_source_example='body',
        )
    },
)
async def create_novel(
    transaction: AsyncSession, meili_index: AsyncIndex, data: NovelCreateSchema
) -> Response[NovelSchema]:
    rep_lang = find_repeated_lang_titles(data.titles)
    if rep_lang:
        raise ClientException(
            f"Language '{rep_lang}' is used by more than one title"
            ' but only one title per language is allowed'
        )

    try:
        novel = await insert_novel(
            transaction, data.original_language, data.description
        )
        titles = await upsert_novel_titles(transaction, novel.novel_id, data.titles)
        res = await to_novel_schema(novel, titles)
        await meili_index.add_documents([res])
    except Exception:
        raise InternalServerException
    return Response(
        content=res,
        headers={
            'Location': f'/novels/{novel.novel_id}',
            'Content-Location': f'/novels/{novel.novel_id}',
        },
    )


@patch(
    path='/{novel_id:str}',
    tags=['novels'],
    summary='Update novel',
    description='Update the web novel identified by `novel_id`.',
    operation_class=custom_operation(
        custom_reqbody(
            description=(
                f'Descriptions are limited to {NOVEL_DESCRIPTION_MAX} characters.'
                f' Titles are limited to {NOVEL_TITLE_MAX} characters.\n'
                '\n'
                'A novel must have at least one title.'
                ' There can only be one title per language.\n'
                '\n'
                'The value of `titles` replaces the current collection of titles.'
                ' To update just one title, the `titles` array must include all'
                ' current titles, or else those titles will be removed.'
            ),
            required=False,
        )
    ),
    response_description='Novel updated, representation follows',
    responses={
        400: create_400_response_spec(
            description=(
                'Bad request syntax, validation error, or more than one title'
                ' per language'
            ),
            client_error_detail_example=(
                "Language 'en' is used by more than one title"
                ' but only one title per language is allowed'
            ),
            include_validation_error=True,
            validation_detail_example='Validation failed for PATCH /novels/1',
            validation_message_example="Invalid enum value 'eng'",
            validation_key_example='titles[0].lang',
            validation_source_example='body',
        ),
        404: create_404_response_spec(
            description='Novel ID in path parameter is not associated with a novel',
            detail_example='Could not find a novel identified by novel ID 0',
        ),
    },
)
async def patch_novel(
    transaction: AsyncSession,
    meili_index: AsyncIndex,
    novel_id: Annotated[str, NovelIDParam],
    data: NovelUpdateSchema = None,
) -> NovelSchema:
    if data is None:
        data = NovelUpdateSchema()
    novel = await select_novel(transaction, novel_id)
    if novel is None:
        raise NotFoundException(
            f'Could not find a novel identified by novel ID {novel_id}'
        )

    if data.titles is not UNSET:
        rep_lang = find_repeated_lang_titles(data.titles)
        if rep_lang:
            raise ClientException(
                f"Language '{rep_lang}' is used by more than one title"
                ' but only one title per language is allowed'
            )

    try:
        novel = await update_novel(
            transaction,
            novel_id,
            await novel.awaitable_attrs.original_language
            if data.original_language is UNSET
            else data.original_language,
            await novel.awaitable_attrs.description
            if data.description is UNSET
            else data.description,
        )
        titles = None
        if data.titles is not UNSET:
            await clear_novel_titles(transaction, novel_id)
            titles = await upsert_novel_titles(transaction, novel_id, data.titles)
        res = await to_novel_schema(novel, titles)
        await meili_index.update_documents([res])
        await transaction.commit()
    except Exception:
        raise InternalServerException
    return res


novel_router = Router(
    path=PATH,
    dependencies={'meili_index': Provide(get_meili_novel_index)},
    route_handlers=[query_novels, get_novel, create_novel, patch_novel],
)
