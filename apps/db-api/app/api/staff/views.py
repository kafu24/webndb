from typing import TYPE_CHECKING, Annotated

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

from app.const import (
    EXTLINK_MAX_LEN,
    INVALID_WEBNDB_ID,
    STAFF_ALIAS_NAME_MAX,
    STAFF_ALIASES_MAX,
    STAFF_DESCRIPTION_MAX,
    STAFF_EXTTLINK_MAX,
)
from app.meili import format_meili_api_error, update_index

from ..novel.schemas import to_novel_schema
from ..novel.service import select_novels, update_novel_staff_by_staff_id
from ..novel.views import get_meili_novel_index
from ..problem_details import (
    ExtraSourceEnum,
    ProblemDetailsExtraSchema,
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
    StaffCreateSchema,
    StaffIDMeta,
    StaffIDParam,
    StaffQueryRequest,
    StaffSchema,
    StaffUpdateSchema,
    to_staff_schema,
)
from .service import (
    clear_staff_aliases,
    clear_staff_extlinks,
    clear_staff_langs,
    insert_staff,
    select_staff,
    update_staff,
    upsert_staff_aliases,
    upsert_staff_extlinks,
    upsert_staff_langs,
)

if TYPE_CHECKING:
    from app.models import Language

PATH = '/staff'
logger = structlog.stdlib.get_logger()


async def get_meili_staff_index(state: State) -> AsyncIndex:
    client: AsyncClient = state.meili_client
    try:
        index = await client.get_index('staff')
    except MeilisearchApiError as e:
        if e.status_code == 404:  # Index doesn't exist
            index = await client.create_index('staff', primary_key='staff_id')
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
    dependencies={'query_request': Provide(StaffQueryRequest, sync_to_thread=True)},
    tags=['staff'],
    summary='Query staff',
    description=f'Search for and fetch staff member entries.',
    response_description=GENERIC_RESPONSE_DESCRIPTION,
    responses={
        400: create_400_response_spec(
            description='Bad request syntax or validation error',
            include_validation_error=True,
            validation_detail_example='Validation failed for GET /?sort=staff_id',
            validation_message_example=(
                f"Expected `str` matching regex '{create_sort_pattern(sortable_attributes)}'"
            ),
            validation_key_example='sort',
            validation_source_example='query',
        )
    },
)
async def query_staff(
    meili_index: AsyncIndex, query_request: StaffQueryRequest
) -> QueryResponse[StaffSchema]:
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
    path='/{staff_id:str}',
    exclude_from_auth=True,
    tags=['staff'],
    summary='Get staff',
    description='Retrieve a staff by their WebNDB staff ID.',
    response_description=GENERIC_RESPONSE_DESCRIPTION,
    responses={
        400: create_400_response_spec(
            description='Bad request syntax or validation error',
            include_validation_error=True,
            validation_detail_example=(
                f'Validation failed for GET /staff/{INVALID_WEBNDB_ID}'
            ),
            validation_message_example=(
                f'Expected `str` of length <= {StaffIDMeta.max_length}'
            ),
            validation_key_example='staff_id',
            validation_source_example='path',
        ),
        404: create_404_response_spec(
            description=(
                'Staff ID in path parameter is not associated with a staff member'
            ),
            detail_example='Could not find a staff member identified by staff ID 0',
        ),
    },
)
async def get_staff(
    transaction: AsyncSession, staff_id: Annotated[str, StaffIDParam]
) -> StaffSchema:
    staff = await select_staff(transaction, staff_id)
    if staff is None:
        raise NotFoundException(
            f'Could not find a staff member identified by staff ID {staff_id}'
        )
    return await to_staff_schema(staff)


def check_alias_and_primary_lang(
    data: StaffCreateSchema | StaffUpdateSchema,
    primary_language: 'Language' = None,
    languages: list['Language'] = None,
    main_alias: str = None,
    aliases_names: list[str] = None,
):
    if primary_language is None:
        primary_language = data.primary_language
    if languages is None:
        languages = data.languages
    if main_alias is None:
        main_alias = data.main_alias
    if aliases_names is None:
        aliases_names = [a.name for a in data.aliases]
    if primary_language not in languages:
        raise ClientException(
            f'Primary language {primary_language} is not in `languages`'
        )
    if main_alias not in aliases_names:
        raise ClientException(f'Main alias {main_alias} is not in `aliases.name`')


def check_duplicate_alias(data: StaffCreateSchema | StaffUpdateSchema):
    if data.aliases is UNSET:
        return
    seen_alias_names = dict()
    for a, i in zip(data.aliases, range(len(data.aliases))):
        index = seen_alias_names.get(a.name)
        if index is not None:
            raise ClientException(
                f'`name` {a.name} is used in multiple aliases',
                extra=ProblemDetailsExtraSchema(
                    message=f'`name` {a.name} is used by aliases[{index}]',
                    key=f'aliases[{i}].name',
                    source=ExtraSourceEnum.BODY,
                ),
            )
        seen_alias_names[a.name] = i


@post(
    exclude_from_auth=True,
    path='/',
    guards=[required_request_body_guard],
    tags=['staff'],
    summary='Create staff member',
    description='Create a new staff member',
    operation_class=custom_operation(
        custom_reqbody(
            description=(
                f'Descriptions are limited to {STAFF_DESCRIPTION_MAX} characters.'
                f' Aliases are limited to {STAFF_ALIAS_NAME_MAX} characters.'
                f' There can be up to {STAFF_ALIASES_MAX} aliases.'
                f' External links are limited to {EXTLINK_MAX_LEN} characters.'
                f' There can be up to {STAFF_EXTTLINK_MAX} external links.\n'
                '\n'
                'There must be at least one alias and one language.'
                ' `primary_language` must be set and it must be a value in'
                ' the `languages` array.'
                ' `main_alias` must be set and it must be equal to an'
                " alias's `name` from the `aliases` array.\n"
                '\n'
                'Duplicate values in `languages` are ignored.'
                ' Duplicate values in `aliases.name` is not allowed.'
            ),
            required=True,
        )
    ),
    response_headers=[LocationHeader, ContentLocationHeader],
    response_description='Staff created, representation follows',
    responses={
        400: create_400_response_spec(
            description=(
                'Bad request syntax, validation error, `primary_language` is'
                ' not in `languages`, or `main_alias` is not in `aliases`'
            ),
            client_error_detail_example="Primary language 'en' is not in `languages`",
            include_validation_error=True,
            validation_detail_example='Validation failed for POST /staff',
            validation_message_example="Invalid enum value 'foo'",
            validation_key_example='gender',
            validation_source_example='body',
        )
    },
)
async def create_staff(
    transaction: AsyncSession, meili_index: AsyncIndex, data: StaffCreateSchema
) -> Response[StaffSchema]:
    check_alias_and_primary_lang(data)
    check_duplicate_alias(data)
    try:
        staff = await insert_staff(
            transaction,
            data.staff_type,
            data.gender,
            data.primary_language,
            data.main_alias,
            data.description,
        )
        langs = await upsert_staff_langs(transaction, staff.staff_id, data.languages)
        aliases = await upsert_staff_aliases(transaction, staff.staff_id, data.aliases)
        extlinks = await upsert_staff_extlinks(
            transaction, staff.staff_id, data.extlinks
        )
        res = await to_staff_schema(staff, langs, aliases, extlinks)
        await meili_index.add_documents([res])
    except Exception:
        raise InternalServerException
    return Response(
        content=res,
        headers={
            'Location': f'/staff/{staff.staff_id}',
            'Content-Location': f'/staff/{staff.staff_id}',
        },
    )


@patch(
    path='/{staff_id:str}',
    dependencies={'meili_novel_index': get_meili_novel_index},
    tags=['staff'],
    summary='Update staff member',
    description='Update the staff member identified by `novel_id`.',
    operation_class=custom_operation(
        custom_reqbody(
            description=(
                f'Descriptions are limited to {STAFF_DESCRIPTION_MAX} characters.'
                f' Aliases are limited to {STAFF_ALIAS_NAME_MAX} characters.'
                f' There can be up to {STAFF_ALIASES_MAX} aliases.'
                f' External links are limited to {EXTLINK_MAX_LEN} characters.'
                f' There can be up to {STAFF_EXTTLINK_MAX} external links.\n'
                '\n'
                '`languages`, `aliases`, and `extlinks` are arrays.'
                ' The value will replace the current collection. To update just'
                ' one value in the array, you must include all current values or'
                ' else those values will be lost.\n'
                '\n'
                'There must be at least one alias and one language.'
                ' The updated state of the resource must be such that'
                " `primary_language` is a value in the staff member's `languages`"
                ' and'
                " `main_alias` is a `name` value in the staff member's `aliases`.\n"
                '\n'
                'Duplicate values in `languages` are ignored.'
                ' Duplicate values in `aliases.name` is not allowed.'
            ),
            required=False,
        )
    ),
    response_description='Staff updated, representation follows',
    responses={
        400: create_400_response_spec(
            description=(
                'Bad request syntax, validation error, `primary_language` is'
                ' not in `languages`, or `main_alias` is not in `aliases`'
            ),
            client_error_detail_example="Primary language 'en' is not in `languages`",
            include_validation_error=True,
            validation_detail_example='Validation failed for PATCH /staff/3',
            validation_message_example="Invalid enum value 'foo'",
            validation_key_example='gender',
            validation_source_example='body',
        ),
        404: create_404_response_spec(
            description=(
                'Staff ID in path parameter is not associated with a staff member'
            ),
            detail_example='Could not find a staff member identified by staff ID 0',
        ),
    },
)
async def patch_staff(
    transaction: AsyncSession,
    meili_index: AsyncIndex,
    staff_id: Annotated[str, StaffIDParam],
    meili_novel_index: AsyncIndex,
    data: StaffUpdateSchema = None,
) -> StaffSchema:
    if data is None:
        data = StaffUpdateSchema()

    staff = await select_staff(transaction, staff_id)
    if staff is None:
        raise NotFoundException(
            f'Could not find a staff member identified by staff ID {staff_id}'
        )

    primary_lang = (
        staff.primary_lang if data.primary_language is UNSET else data.primary_language
    )
    old_main_alias = staff.main_alias
    main_alias = staff.main_alias if data.main_alias is UNSET else data.main_alias

    check_alias_and_primary_lang(
        data=data,
        primary_language=primary_lang,
        main_alias=main_alias,
        languages=[l.lang for l in staff.langs] if data.languages is UNSET else None,
        aliases_names=[a.name for a in staff.aliases]
        if data.aliases is UNSET
        else None,
    )
    check_duplicate_alias(data)

    try:
        staff = await update_staff(
            transaction,
            staff_id,
            staff.staff_type if data.staff_type is UNSET else data.staff_type,
            staff.gender if data.gender is UNSET else data.gender,
            primary_lang,
            main_alias,
            staff.description if data.description is UNSET else data.description,
        )
        langs = None
        aliases = None
        extlinks = None
        if data.languages is not UNSET:
            await clear_staff_langs(transaction, staff.staff_id)
            langs = await upsert_staff_langs(
                transaction, staff.staff_id, data.languages
            )
        if data.aliases is not UNSET:
            await clear_staff_aliases(transaction, staff.staff_id)
            aliases = await upsert_staff_aliases(
                transaction, staff.staff_id, data.aliases
            )
        if data.extlinks is not UNSET:
            await clear_staff_extlinks(transaction, staff.staff_id)
            extlinks = await upsert_staff_extlinks(
                transaction, staff.staff_id, data.extlinks
            )
        res = await to_staff_schema(staff, langs, aliases, extlinks)
        await meili_index.update_documents([res])
        # This is expensive, so only update index when necessary
        if data.main_alias is not UNSET and data.main_alias != old_main_alias:
            await update_novel_staff_by_staff_id(
                transaction, staff.staff_id, data.main_alias
            )
            staff_novels = await staff.awaitable_attrs.staff_novel
            novel_ids = [sn.novel_id for sn in staff_novels]
            novels = await select_novels(transaction, novel_ids)
            await meili_novel_index.update_documents(
                [await to_novel_schema(n) for n in novels]
            )
        await transaction.commit()
    except Exception:
        raise InternalServerException
    return res


staff_router = Router(
    path=PATH,
    dependencies={'meili_index': Provide(get_meili_staff_index)},
    route_handlers=[query_staff, get_staff, create_staff, patch_staff],
)
