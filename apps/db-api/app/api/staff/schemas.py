from typing import TYPE_CHECKING, Annotated

from litestar.params import Parameter
from msgspec import UNSET, Meta

from app.const import (
    EXTLINK_MAX_LEN,
    STAFF_ALIAS_NAME_MAX,
    STAFF_ALIASES_MAX,
    STAFF_DESCRIPTION_MAX,
    STAFF_EXTTLINK_MAX,
    WEBNDB_ID_MAX_LEN,
)
from app.models import Gender, Language, StaffLang, StaffType

from ..schemas import (
    JSON_NULL,
    BaseStruct,
    QueryRequest,
    create_filter_param,
    create_q_param,
    create_sort_parameter,
    create_sort_pattern,
    string_or_null_extra_json_schema,
)
from .meili import filterable_attributes, searchable_attributes, sortable_attributes

if TYPE_CHECKING:
    from app.models import Staff, StaffAlias, StaffExtlink


StaffIDMeta = Meta(
    max_length=WEBNDB_ID_MAX_LEN,
    title='Staff ID',
    description='WebNDB identifier for a staff member',
    examples=['3'],
)

StaffIDParam = Parameter(
    max_length=WEBNDB_ID_MAX_LEN,
    title=StaffIDMeta.title,
    description=StaffIDMeta.description,
)

StaffIDResponseType = Annotated[
    str,
    Meta(
        title=StaffIDMeta.title,
        description=StaffIDMeta.description,
        examples=StaffIDMeta.examples,
    ),
]

StaffTypeType = Annotated[
    StaffType,
    Meta(
        title='Staff Type',
        description='Type of the staff member',
        examples=[StaffType.PERSON],
    ),
]

StaffGenderType = Annotated[
    Gender,
    Meta(
        title='Staff Gender',
        description='Gender of the staff member',
        examples=[Gender.MALE],
    ),
]

StaffPrimaryLanguageType = Annotated[
    Language,
    Meta(
        title='Primary Language',
        description='Main language that the staff member uses',
        examples=[Language.EN],
    ),
]

StaffMainAliasMeta = Meta(
    title='Staff Main Alias',
    description='Main alias that the staff goes by',
    examples=['John Doe'],
)

StaffMainAliasType = Annotated[str, StaffMainAliasMeta]

StaffDescriptionType = Annotated[
    Annotated[str, Meta(max_length=STAFF_DESCRIPTION_MAX)] | None,
    Meta(
        title='Staff Description',
        description='Short biography or notes about the staff member',
        examples=[
            'John Doe was born on January 1, 1970. He has written many web novels.'
        ],
        extra_json_schema=string_or_null_extra_json_schema(STAFF_DESCRIPTION_MAX),
    ),
]


StaffAliasType = Annotated[
    str,
    Meta(
        max_length=STAFF_ALIAS_NAME_MAX,
        title='Staff Alias Name',
        description='Name of an alias for a staff member',
    ),
]

StaffAliasLatinType = Annotated[
    Annotated[str, Meta(max_length=STAFF_ALIAS_NAME_MAX)] | None,
    Meta(
        title='Latin Title',
        description="Romanized version of a staff member's alias",
        extra_json_schema=string_or_null_extra_json_schema(STAFF_ALIAS_NAME_MAX),
    ),
]


class StaffAliasSchema(BaseStruct):
    """Representation of a staff member's alias in responses."""

    name: StaffAliasType = UNSET
    latin: StaffAliasLatinType = UNSET


def to_staff_alias_schema(alias: 'StaffAlias') -> StaffAliasSchema:
    return StaffAliasSchema(name=alias.name, latin=alias.latin)


class StaffAliasWriteSchema(BaseStruct):
    name: StaffAliasType
    latin: StaffAliasLatinType = None


StaffAliasesMeta = Meta(
    min_length=1,
    max_length=STAFF_ALIASES_MAX,
    title='Staff Aliases',
    description='Array of aliases of a staff member',
    examples=[
        [
            StaffAliasSchema(name='John Doe', latin=None),
            StaffAliasSchema(name='张三', latin='Zhang San'),
            StaffAliasSchema(name='فلان الفلاني', latin='Fulan AlFulani'),
        ]
    ],
    extra_json_schema={'extra': {'minItems': 1, 'maxItems': STAFF_ALIASES_MAX}},
)


StaffExtlinkLinkType = Annotated[
    str,
    Meta(
        max_length=EXTLINK_MAX_LEN,
        title='Staff External Link',
        description='External link associated with a staff member',
    ),
]


class StaffExtlinkSchema(BaseStruct):
    """Representation of a staff member's external link in responses."""

    link: StaffExtlinkLinkType = UNSET


def to_staff_extlink_schema(extlink: 'StaffExtlink') -> StaffExtlinkSchema:
    return StaffExtlinkSchema(link=extlink.link)


class StaffExtlinkWriteSchema(BaseStruct):
    link: StaffExtlinkLinkType


StaffExtlinksMeta = Meta(
    min_length=1,
    max_length=STAFF_EXTTLINK_MAX,
    title='Staff External Links',
    description='Array of external links for a staff member',
    examples=[
        [
            StaffExtlinkSchema(link='https://en.wikipedia.org/wiki/John_Doe'),
            StaffExtlinkSchema(link='https://en.wikipedia.org/wiki/Rudolf_Lingens'),
        ]
    ],
    extra_json_schema={'extra': {'minItems': 1, 'maxItems': STAFF_EXTTLINK_MAX}},
)


class StaffSchema(BaseStruct):
    """Representation of a staff member in responses."""

    staff_id: StaffIDResponseType = UNSET
    staff_type: StaffTypeType = UNSET
    gender: StaffGenderType = UNSET
    primary_language: StaffPrimaryLanguageType = UNSET
    main_alias: StaffMainAliasType = UNSET
    description: StaffDescriptionType = UNSET
    languages: list[Language] = UNSET
    aliases: Annotated[list[StaffAliasSchema], StaffAliasesMeta] = UNSET
    extlinks: Annotated[list[StaffExtlinkSchema], StaffExtlinksMeta] = UNSET


async def to_staff_schema(
    staff: 'Staff',
    languages: list[StaffLang] = None,
    aliases: list['StaffAlias'] = None,
    extlinks: list['StaffExtlink'] = None,
) -> StaffSchema:
    if languages is None:
        languages = await staff.awaitable_attrs.langs
    if aliases is None:
        aliases = await staff.awaitable_attrs.aliases
    if extlinks is None:
        extlinks = await staff.awaitable_attrs.extlinks
    return StaffSchema(
        staff_id=str(staff.staff_id),
        staff_type=staff.staff_type,
        gender=staff.gender,
        primary_language=staff.primary_lang,
        main_alias=staff.main_alias,
        description=staff.description,
        languages=[l.lang for l in languages],
        aliases=[to_staff_alias_schema(a) for a in aliases],
        extlinks=[to_staff_extlink_schema(l) for l in extlinks],
    )


class StaffQueryRequest(QueryRequest):
    q: Annotated[str, create_q_param(searchable_attributes)] = ''
    filter: Annotated[str, create_filter_param(filterable_attributes)] = ''
    sort: Annotated[
        list[Annotated[str, Meta(pattern=create_sort_pattern(sortable_attributes))]]
        | None,
        create_sort_parameter(sortable_attributes),
    ] = None


class StaffCreateSchema(BaseStruct):
    """Specifies the request body for creating a staff member."""

    primary_language: StaffPrimaryLanguageType
    main_alias: StaffMainAliasType
    languages: set[Language]
    aliases: Annotated[list[StaffAliasSchema], StaffAliasesMeta]
    extlinks: Annotated[list[StaffExtlinkSchema], StaffExtlinksMeta] = []
    staff_type: StaffTypeType = StaffType.PERSON
    gender: StaffGenderType = Gender.UNKNOWN
    description: StaffDescriptionType = JSON_NULL

    def __post_init__(self):
        if self.description is JSON_NULL:
            self.description = None


class StaffUpdateSchema(BaseStruct):
    """Specifies the request body for updating a staff member."""

    primary_language: StaffPrimaryLanguageType = UNSET
    main_alias: StaffMainAliasType = UNSET
    languages: set[Language] = UNSET
    aliases: Annotated[list[StaffAliasSchema], StaffAliasesMeta] = UNSET
    extlinks: Annotated[list[StaffExtlinkSchema], StaffExtlinksMeta] = UNSET
    staff_type: StaffTypeType = UNSET
    gender: StaffGenderType = UNSET
    description: StaffDescriptionType = UNSET
