import re
from typing import TYPE_CHECKING, Annotated

from litestar.params import Parameter
from msgspec import UNSET, Meta

from app.const import VOLUME_ORDER_MAX, VOLUME_TITLE_MAX, WEBNDB_ID_MAX_LEN
from app.models import Language

from ..novel.schemas import NovelIDMeta, NovelIDResponseType
from ..schemas import (
    JSON_NULL,
    BaseStruct,
    QueryRequest,
    create_filter_param,
    create_q_param,
    create_sort_parameter,
    create_sort_pattern,
    int_or_null_extra_json_schema,
    string_or_null_extra_json_schema,
)
from .meili import filterable_attributes, searchable_attributes, sortable_attributes

if TYPE_CHECKING:
    from app.models import Volume, VolumeTitle

VOLUME_ID_PATTERN = r'^\d+-\d+$'

VolumeIDMeta = Meta(
    max_length=WEBNDB_ID_MAX_LEN,
    pattern=VOLUME_ID_PATTERN,
    title='Volume ID',
    description='WebNDB identifier for a volume of a web novel',
    examples=['1-2'],
)

VolumeIDParam = Parameter(
    max_length=WEBNDB_ID_MAX_LEN,
    pattern=VolumeIDMeta.pattern,
    title=VolumeIDMeta.title,
    description=VolumeIDMeta.description,
)

VolumeOrderMeta = Meta(
    ge=1,
    le=VOLUME_ORDER_MAX,
    title='Volume Order',
    description='WebNDB value to track ordering of the volume',
)

VolumeOrderType = Annotated[
    Annotated[int, Meta(ge=VolumeOrderMeta.ge, le=VolumeOrderMeta.le)] | None,
    Meta(
        title=VolumeOrderMeta.title,
        description=VolumeOrderMeta.description,
        examples=[1],
        extra_json_schema=int_or_null_extra_json_schema(
            VolumeOrderMeta.ge, VolumeOrderMeta.le
        ),
    ),
]

VolumeTitleType = Annotated[
    str,
    Meta(
        max_length=VOLUME_TITLE_MAX,
        title='Volume Title',
        description='Title of a volume in the original script',
    ),
]

VolumeTitleLatinType = Annotated[
    Annotated[str, Meta(max_length=VOLUME_TITLE_MAX)] | None,
    Meta(
        title='Latin Title',
        description="Romanized version of a volume's title",
        extra_json_schema=string_or_null_extra_json_schema(VOLUME_TITLE_MAX),
    ),
]

VolumeTitleOfficialType = Annotated[
    bool,
    Meta(
        title='Official',
        description='Boolean indicating whether a title is an official translation',
    ),
]


class VolumeTitleSchema(BaseStruct):
    """Representation of a volume title in responses."""

    lang: Language = UNSET
    title: VolumeTitleType = UNSET
    latin: VolumeTitleLatinType = UNSET
    official: VolumeTitleOfficialType = UNSET


def to_volume_title_schema(title: 'VolumeTitle') -> VolumeTitleSchema:
    return VolumeTitleSchema(
        lang=title.lang, title=title.title, latin=title.latin, official=title.official
    )


class VolumeTitleWriteSchema(BaseStruct):
    lang: Language
    title: VolumeTitleType
    official: VolumeTitleOfficialType
    latin: VolumeTitleLatinType = None


VolumeTitlesMeta = Meta(
    min_length=1,
    title='Volume Titles',
    description='Array of titles associated with the volume',
    examples=[
        [
            VolumeTitleSchema(
                lang=Language.EN,
                title='My Volume',
                latin=None,
                official=True,
            ),
            VolumeTitleSchema(
                lang=Language.ZH_HANS,
                title='我的卷',
                latin='Wo de juan',
                official=False,
            ),
            VolumeTitleSchema(
                lang=Language.KO,
                title='나의 볼륨',
                latin='Naui bollyum',
                official=False,
            ),
        ]
    ],
    extra_json_schema={'extra': {'minItems': 1}},
)


class VolumeSchema(BaseStruct):
    """Representation of a volume in responses."""

    volume_id: Annotated[str, VolumeIDMeta] = UNSET
    novel_id: NovelIDResponseType = UNSET
    volume_order: Annotated[int, VolumeOrderMeta] = UNSET
    titles: Annotated[list[VolumeTitleSchema], VolumeTitlesMeta] = UNSET


def create_api_volume_id(volume: 'Volume') -> str:
    return f'{volume.novel_id}-{volume.volume_id}'


def parse_api_volume_id(volume_id: str) -> tuple[str, str]:
    """Returns string of DB's surrogate key portion of the API volume ID"""
    assert re.fullmatch(VOLUME_ID_PATTERN, volume_id)
    return tuple(volume_id.split('-'))


async def to_volume_schema(
    volume: 'Volume', titles: list['VolumeTitle'] = None
) -> VolumeSchema:
    if titles is None:
        titles = await volume.awaitable_attrs.titles
    return VolumeSchema(
        volume_id=create_api_volume_id(volume),
        novel_id=str(volume.volume_id),
        volume_order=volume.volume_order,
        titles=[to_volume_title_schema(t) for t in titles],
    )


class VolumeQueryRequest(QueryRequest):
    q: Annotated[str, create_q_param(searchable_attributes)] = ''
    filter: Annotated[str, create_filter_param(filterable_attributes)] = ''
    sort: Annotated[
        list[Annotated[str, Meta(pattern=create_sort_pattern(sortable_attributes))]]
        | None,
        create_sort_parameter(sortable_attributes),
    ] = None


class VolumeCreateSchema(BaseStruct):
    """Specifies the request body for creating a volume."""

    novel_id: Annotated[str, NovelIDMeta]
    titles: Annotated[list[VolumeTitleWriteSchema], VolumeTitlesMeta]
    volume_order: VolumeOrderType = JSON_NULL

    def __post_init__(self):
        if self.volume_order is JSON_NULL:
            self.volume_order = None


class VolumeUpdateSchema(BaseStruct):
    """Specifies the request body for updating a volume."""

    titles: Annotated[list[VolumeTitleWriteSchema], VolumeTitlesMeta] = UNSET
    volume_order: VolumeOrderType = UNSET
