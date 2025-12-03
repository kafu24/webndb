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

from app.const import INVALID_WEBNDB_ID, VOLUME_ORDER_MAX, VOLUME_TITLE_MAX
from app.meili import format_meili_api_error, update_index

from ..novel.service import find_repeated_lang_titles, select_novel
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
    VolumeCreateSchema,
    VolumeIDMeta,
    VolumeIDParam,
    VolumeQueryRequest,
    VolumeSchema,
    VolumeUpdateSchema,
    parse_api_volume_id,
    to_volume_schema,
)
from .service import (
    clear_volume_titles,
    get_next_order,
    insert_volume,
    select_volume,
    update_volume,
    upsert_volume_titles,
)

PATH = '/volumes'
logger = structlog.stdlib.get_logger()


async def get_meili_volume_index(state: State) -> AsyncIndex:
    client: AsyncClient = state.meili_client
    try:
        index = await client.get_index('volumes')
    except MeilisearchApiError as e:
        if e.status_code == 404:  # Index doesn't exist
            index = await client.create_index('volumes', primary_key='volume_id')
            await update_index(
                index,
                searchable_attributes=searchable_attributes,
                filterable_attributes=filterable_attributes,
                sortable_attributes=sortable_attributes,
            )
        else:
            logger.error('Could not get Meilisearch index')
            raise
    return index


@get(
    path='/',
    exclude_from_auth=True,
    dependencies={'query_request': Provide(VolumeQueryRequest, sync_to_thread=True)},
    tags=['volumes'],
    summary='Query volumes',
    description=f'Search for and fetch volumes.',
    response_description=GENERIC_RESPONSE_DESCRIPTION,
    responses={
        400: create_400_response_spec(
            description='Bad request syntax or validation error',
            include_validation_error=True,
            validation_detail_example='Validation failed for GET /volumes?sort=volume_id',
            validation_message_example=(
                f"Expected `str` matching regex '{create_sort_pattern(sortable_attributes)}'"
            ),
            validation_key_example='sort',
            validation_source_example='query',
        )
    },
)
async def query_volumes(
    meili_index: AsyncIndex, query_request: VolumeQueryRequest
) -> QueryResponse[VolumeSchema]:
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
    path='/{volume_id:str}',
    exclude_from_auth=True,
    tags=['volumes'],
    summary='Get volume',
    description='Retrieve a volume by its WebNDB volume ID.',
    response_description=GENERIC_RESPONSE_DESCRIPTION,
    responses={
        400: create_400_response_spec(
            description='Bad request syntax or validation error',
            include_validation_error=True,
            validation_detail_example=(
                f'Validation failed for GET /volumes/{INVALID_WEBNDB_ID}'
            ),
            validation_message_example=(
                f'Expected `str` of length <= {VolumeIDMeta.max_length}'
            ),
            validation_key_example='volume_id',
            validation_source_example='path',
        ),
        404: create_404_response_spec(
            description='Volume ID in path parameter is not associated with a volume',
            detail_example='Could not find a volume identified by volume ID 0-0',
        ),
    },
)
async def get_volume(
    transaction: AsyncSession, volume_id: Annotated[str, VolumeIDParam]
) -> VolumeSchema:
    novel_id, db_volume_id = parse_api_volume_id(volume_id)
    volume = await select_volume(transaction, novel_id, db_volume_id)
    if volume is None:
        raise NotFoundException(
            f'Could not find a volume identified by volume ID {volume_id}'
        )
    return to_volume_schema(volume)


@post(
    path='/',
    exclude_from_auth=True, # TODO: temp
    guards=[required_request_body_guard],
    tags=['volumes'],
    summary='Create volume',
    description='Create a new volume entry.',
    operation_class=custom_operation(
        custom_reqbody(
            description=(
                '`volume_order` is used to track the ordering of volumes'
                ' for a novel.'
                f' The order is an integer in the range [1, {VOLUME_ORDER_MAX}].'
                ' If `volume_order` is `null` (default),'
                ' then the volume will be inserted last in the collection.'
                ' A volume cannot be created if there are already'
                f' {VOLUME_ORDER_MAX} volumes for the specified novel.\n'
                '\n'
                f' Titles are limited to {VOLUME_TITLE_MAX} characters.\n'
                '\n'
                'A volume must have at least one title.'
                ' There can only be one title per language.'
            ),
            required=True,
        )
    ),
    response_headers=[LocationHeader, ContentLocationHeader],
    response_description='Volume created, representation follows',
    responses={
        400: create_400_response_spec(
            description=(
                'Bad request syntax, validation error, novel already has max'
                ' number of volumes, more than one title per language'
            ),
            client_error_detail_example=(
                'Novel identified by novel ID 123 already has the'
                ' maximum amount of volumes'
            ),
            include_validation_error=True,
            validation_detail_example='Validation failed for POST /volumes',
            validation_message_example="Invalid enum value 'eng'",
            validation_key_example='titles[0].lang',
            validation_source_example='body',
        ),
        404: create_404_response_spec(
            description='Novel ID in request body is not associated with a novel',
            detail_example='Could not find a novel identified by novel ID 0',
        ),
    },
)
async def create_volume(
    transaction: AsyncSession, meili_index: AsyncIndex, data: VolumeCreateSchema
) -> Response[VolumeSchema]:
    rep_lang = find_repeated_lang_titles(data.titles)
    if rep_lang:
        raise ClientException(
            f"Language '{rep_lang}' is used by more than one title"
            ' but only one title per language is allowed'
        )

    novel = await select_novel(transaction, data.novel_id)
    if novel is None:
        raise NotFoundException(
            f'Could not find a novel identified by novel ID {data.novel_id}'
        )

    next_order = await get_next_order(transaction, data.novel_id)
    if next_order > VOLUME_ORDER_MAX:
        raise ClientException(
            f'Novel identified by novel ID {data.novel_id} already has the'
            ' maximum amount of volumes'
        )

    try:
        volume = await insert_volume(transaction, data.novel_id, data.volume_order)
        titles = await upsert_volume_titles(
            transaction, volume.volume_id, data.novel_id, data.titles
        )
        res = await to_volume_schema(volume, titles)
        await meili_index.add_documents([res])
    except Exception:
        raise InternalServerException
    return Response(
        content=res,
        headers={
            'Location': f'/volumes/{res.volume_id}',
            'Content-Location': f'/volumes/{res.volume_id}',
        },
    )


@patch(
    path='/{volume_id:str}',
    exclude_from_auth=True, # TODO: temp
    tags=['volumes'],
    summary='Update volume',
    description='Update the volume identified by `volume_id`.',
    operation_class=custom_operation(
        custom_reqbody(
            description=(
                '`volume_order` is used to track the ordering of volumes'
                ' for a novel.'
                f' The order is an integer in the range [1, {VOLUME_ORDER_MAX}].'
                ' If volumes are ordered like [a, b, c],'
                ' moving "b" to 1 would give [b, a, c].'
                ' Moving "b" to 3 would give [a, c, b].'
                ' Omit `volume_order` or send its current value to not change'
                ' the volume order.\n'
                '\n'
                f' Titles are limited to {VOLUME_TITLE_MAX} characters.\n'
                '\n'
                'A volume must have at least one title.'
                ' There can only be one title per language.\n'
                '\n'
                'The value of `titles` replaces the current collection of titles.'
                ' To update just one title, the `titles` array must include all'
                ' current titles, or else those titles will be removed.'
            ),
            required=False,
        )
    ),
    response_description='Volume updated, representation follows',
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
            validation_detail_example='Validation failed for PATCH /volumes/1-2',
            validation_message_example="Invalid enum value 'eng'",
            validation_key_example='titles[0].lang',
            validation_source_example='body',
        ),
        404: create_404_response_spec(
            description='Volume ID in path parameter is not associated with a volume',
            detail_example='Could not find a volume identified by volume ID 0-0',
        ),
    },
)
async def patch_volume(
    transaction: AsyncSession,
    meili_index: AsyncIndex,
    volume_id: Annotated[str, VolumeIDParam],
    data: VolumeUpdateSchema = None,
) -> VolumeSchema:
    if data is None:
        data = VolumeUpdateSchema()
    novel_id, db_volume_id = parse_api_volume_id(volume_id)
    volume = await select_volume(transaction, novel_id, db_volume_id)
    if volume is None:
        raise NotFoundException(
            f'Could not find a volume identified by volume ID {volume_id}'
        )

    if data.titles is not UNSET:
        rep_lang = find_repeated_lang_titles(data.titles)
        if rep_lang:
            raise ClientException(
                f"Language '{rep_lang}' is used by more than one title"
                ' but only one title per language is allowed'
            )

    try:
        if data.volume_order is not UNSET and data.volume_order != volume.volume_order:
            volume = await update_volume(
                transaction,
                novel_id,
                db_volume_id,
                volume.volume_order,
                data.volume_order,
            )
        titles = None
        if data.titles is not UNSET:
            await clear_volume_titles(transaction, db_volume_id)
            titles = await upsert_volume_titles(
                transaction, db_volume_id, novel_id, data.titles
            )
        res = await to_volume_schema(volume, titles)
        await meili_index.update_documents([res])
        await transaction.commit()
    except Exception:
        raise InternalServerException
    return res


volume_router = Router(
    path=PATH,
    dependencies={'meili_index': Provide(get_meili_volume_index)},
    route_handlers=[query_volumes, get_volume, create_volume, patch_volume],
)
