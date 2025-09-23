from typing import TYPE_CHECKING, Annotated

from msgspec import UNSET, Meta

from app.const import WEB_NOVEL_ID_MAX
from app.models import Language

from ..schemas import BaseStruct

if TYPE_CHECKING:
    from app.models import Novel, NovelTitle

WebNovelIDMeta = Meta(
    ge=0,
    le=WEB_NOVEL_ID_MAX,
    title='Web Novel ID',
    description='WebNDB identifier for a web novel',
    examples=['1'],
)

WebNovelIDResponseType = Annotated[
    str,
    Meta(
        title=WebNovelIDMeta.title,
        description=WebNovelIDMeta.description,
        examples=WebNovelIDMeta.examples,
    ),
]

WebNovelOlangType = Annotated[
    Language | None,
    Meta(
        title='Original Language',
        description=(
            'IETF language tag for the original language the web novel is written in'
        ),
        examples=[Language.EN],
    ),
]

WebNovelDescriptionType = Annotated[
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

WebNovelTitleType = Annotated[
    str,
    Meta(
        title='Web Novel Title',
        description='Title of a web novel in the origianl script',
    ),
]

WebNovelTitleLatinType = Annotated[
    str | None,
    Meta(
        title='Latin Title',
        description="Romanized version of a web novel's title",
    ),
]

WebNovelTitleOfficialType = Annotated[
    bool,
    Meta(
        title='Official',
        description='Boolean indicating whether a title is an official translation',
    ),
]


class WebNovelTitleSchema(BaseStruct):
    """Representation of a web novel title in responses."""

    language: Language = UNSET
    title: WebNovelTitleType = UNSET
    latin: WebNovelTitleLatinType = UNSET
    official: WebNovelTitleOfficialType = UNSET


def to_web_novel_title_schema(title: 'NovelTitle') -> WebNovelTitleSchema:
    return WebNovelTitleSchema(
        language=title.lang,
        title=title.title,
        latin=title.latin,
        official=title.official,
    )


class WebNovelSchema(BaseStruct):
    """Representation of a web novel in responses."""

    web_novel_id: WebNovelIDResponseType = UNSET
    original_language: WebNovelOlangType = UNSET
    description: WebNovelDescriptionType = UNSET
    titles: Annotated[
        list[WebNovelTitleSchema],
        Meta(
            title='Web Novel Titles',
            description='Array of titles associated with the web novel',
            examples=[
                [
                    WebNovelTitleSchema(
                        language=Language.EN,
                        title='My Web Novel',
                        latin=None,
                        official=True,
                    ),
                    WebNovelTitleSchema(
                        language=Language.ZH_HANS,
                        title='我的网络小说',
                        latin='Wo de wangluo xiaoshuo',
                        official=False,
                    ),
                    WebNovelTitleSchema(
                        language=Language.KO,
                        title='나의 웹소설',
                        latin='Naui wepsoseol',
                        official=False,
                    ),
                ]
            ],
        ),
    ] = UNSET


def to_web_novel_schema(web_novel: 'Novel') -> WebNovelSchema:
    return WebNovelSchema(
        web_novel_id=str(web_novel.novel_id),
        original_language=web_novel.original_language,
        description=web_novel.description,
        titles=[to_web_novel_title_schema(t) for t in web_novel.titles],
    )
