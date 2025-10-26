from typing import TYPE_CHECKING, Annotated

from litestar.params import Parameter
from msgspec import UNSET, Meta

from app.const import WEBNDB_ID_MAX_LEN
from app.models import Language

from ..schemas import (
    BaseStruct,
    QueryRequest,
    create_filter_param,
    create_q_param,
    create_sort_parameter,
    create_sort_pattern,
)
from .meili import filterable_attributes, searchable_attributes, sortable_attributes

if TYPE_CHECKING:
    from app.models import Novel, NovelTitle

NovelIDMeta = Meta(
    max_length=WEBNDB_ID_MAX_LEN,
    title='Novel ID',
    description='WebNDB identifier for a web novel',
    examples=['1'],
)

NovelIDParam = Parameter(
    max_length=WEBNDB_ID_MAX_LEN,
    title=NovelIDMeta.title,
    description=NovelIDMeta.description,
)

NovelIDResponseType = Annotated[
    str,
    Meta(
        title=NovelIDMeta.title,
        description=NovelIDMeta.description,
        examples=NovelIDMeta.examples,
    ),
]

NovelOlangType = Annotated[
    Language | None,
    Meta(
        title='Original Language',
        description=(
            'IETF language tag for the original language the web novel is written in'
        ),
        examples=[Language.EN],
    ),
]

NovelDescriptionType = Annotated[
    str | None,
    Meta(
        title='Web Novel Description',
        description=(
            'Short, English description of a web novel without spoilers.'
            ' If copied from somewhere else, it should be sourced.'
        ),
        examples=[
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod'
            ' tempor incididunt ut labore et dolore magna aliqua.'
        ],
    ),
]

NovelTitleType = Annotated[
    str,
    Meta(
        title='Web Novel Title',
        description='Title of a web novel in the origianl script',
    ),
]

NovelTitleLatinType = Annotated[
    str | None,
    Meta(
        title='Latin Title',
        description="Romanized version of a web novel's title",
    ),
]

NovelTitleOfficialType = Annotated[
    bool,
    Meta(
        title='Official',
        description='Boolean indicating whether a title is an official translation',
    ),
]


class NovelTitleSchema(BaseStruct):
    """Representation of a web novel title in responses."""

    lang: Language = UNSET
    title: NovelTitleType = UNSET
    latin: NovelTitleLatinType = UNSET
    official: NovelTitleOfficialType = UNSET


def to_novel_title_schema(title: 'NovelTitle') -> NovelTitleSchema:
    return NovelTitleSchema(
        lang=title.lang,
        title=title.title,
        latin=title.latin,
        official=title.official,
    )


class NovelSchema(BaseStruct):
    """Representation of a web novel in responses."""

    novel_id: NovelIDResponseType = UNSET
    original_language: NovelOlangType = UNSET
    description: NovelDescriptionType = UNSET
    titles: Annotated[
        list[NovelTitleSchema],
        Meta(
            title='Web Novel Titles',
            description='Array of titles associated with the web novel',
            examples=[
                [
                    NovelTitleSchema(
                        lang=Language.EN,
                        title='My Web Novel',
                        latin=None,
                        official=True,
                    ),
                    NovelTitleSchema(
                        lang=Language.ZH_HANS,
                        title='我的网络小说',
                        latin='Wo de wangluo xiaoshuo',
                        official=False,
                    ),
                    NovelTitleSchema(
                        lang=Language.KO,
                        title='나의 웹소설',
                        latin='Naui wepsoseol',
                        official=False,
                    ),
                ]
            ],
        ),
    ] = UNSET


async def to_novel_schema(
    novel: 'Novel', titles: list['NovelTitle'] = None
) -> NovelSchema:
    if titles is None:
        titles = await novel.awaitable_attrs.titles
    return NovelSchema(
        novel_id=str(novel.novel_id),
        original_language=novel.original_language,
        description=novel.description,
        titles=[to_novel_title_schema(t) for t in titles],
    )


class NovelQueryRequest(QueryRequest):
    q: Annotated[str, create_q_param(searchable_attributes)] = ''
    filter: Annotated[str, create_filter_param(filterable_attributes)] = ''
    sort: Annotated[
        list[Annotated[str, Meta(pattern=create_sort_pattern(sortable_attributes))]]
        | None,
        create_sort_parameter(sortable_attributes),
    ] = None
