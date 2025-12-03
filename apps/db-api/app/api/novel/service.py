from typing import Sequence

import structlog
from sqlalchemy import Text, cast, delete, exc, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Language, Novel, NovelTitle

from .schemas import NovelTitleWriteSchema

logger = structlog.stdlib.get_logger()


def find_repeated_lang_titles(titles: list[NovelTitleWriteSchema]) -> Language | None:
    """Returns a language if more than one element in `titles` uses that
    language. None otherwise.
    """
    seen_languages: set[Language] = set()
    for t in titles:
        if t.lang in seen_languages:
            return t.lang
        seen_languages.add(t.lang)
    return None


async def select_novel(db_session: AsyncSession, novel_id: str) -> Novel:
    """Get a record in the `novel` table by PK."""
    return await db_session.scalar(
        select(Novel)
        .where(cast(Novel.novel_id, Text) == novel_id)
        .options(selectinload(Novel.titles))
    )


async def insert_novel(
    db_session: AsyncSession,
    original_language: Language | None,
    description: str | None,
) -> Novel:
    """Inserts a record in the `novel` table."""
    try:
        novel = Novel(original_language=original_language, description=description)
        db_session.add(novel)
        await db_session.flush()
    except Exception:
        logger.exception('Unexpected error')
        raise
    return novel


async def update_novel(
    db_session: AsyncSession,
    novel_id: str,
    original_language: Language | None,
    description: str | None,
) -> Novel:
    """Updates the novel identified by `novel_id`."""
    try:
        stmt = (
            update(Novel)
            .where(cast(Novel.novel_id, Text) == novel_id)
            .values(original_language=original_language, description=description)
        )
        novel = await db_session.scalar(
            stmt.returning(Novel), execution_options={'populate_existing': True}
        )
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise
    return novel


async def upsert_novel_titles(
    db_session: AsyncSession, novel_id: str, titles: list[NovelTitleWriteSchema]
) -> Sequence[NovelTitle]:
    """Upsert records in the `novel_title` table."""
    try:
        stmt = insert(NovelTitle).values(
            [
                {
                    'novel_id': int(novel_id),
                    'lang': t.lang,
                    'official': t.official,
                    'title': t.title,
                    'latin': t.latin,
                }
                for t in titles
            ]
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[NovelTitle.novel_id, NovelTitle.lang],
            set_=dict(
                official=stmt.excluded.official,
                title=stmt.excluded.title,
                latin=stmt.excluded.latin,
            ),
        )
        titles = (
            await db_session.scalars(
                stmt.returning(NovelTitle),
                execution_options={'populate_existing': True},
            )
        ).all()
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise
    return titles


async def clear_novel_titles(db_session: AsyncSession, novel_id: str):
    try:
        await db_session.execute(
            delete(NovelTitle).where(cast(NovelTitle.novel_id, Text) == novel_id)
        )
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise
