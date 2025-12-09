from datetime import datetime
from typing import Sequence

import structlog
from sqlalchemy import Text, cast, delete, exc, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Language, Novel, NovelStaff, NovelTitle, PublicationStatus, Staff

from ..volume.schemas import VolumeTitleWriteSchema
from .schemas import NovelStaffWriteSchema, NovelTitleWriteSchema

logger = structlog.stdlib.get_logger()


def find_repeated_lang_titles(
    titles: list[NovelTitleWriteSchema] | list[VolumeTitleWriteSchema],
) -> Language | None:
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


async def select_novels(
    db_session: AsyncSession, novel_ids: Sequence[int]
) -> Sequence[Novel]:
    return (
        await db_session.scalars(select(Novel).where(Novel.novel_id.in_(novel_ids)))
    ).all()


async def insert_novel(
    db_session: AsyncSession,
    original_language: Language | None,
    description: str | None,
    status: PublicationStatus,
    start_release_date: datetime | None,
    end_release_date: datetime | None,
) -> Novel:
    """Inserts a record in the `novel` table."""
    try:
        novel = Novel(
            original_language=original_language,
            description=description,
            status=status,
            start_release_date=start_release_date,
            end_release_date=end_release_date,
        )
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
    status: PublicationStatus,
    start_release_date: datetime | None,
    end_release_date: datetime | None,
) -> Novel:
    """Updates the novel identified by `novel_id`."""
    try:
        stmt = (
            update(Novel)
            .where(cast(Novel.novel_id, Text) == novel_id)
            .values(
                original_language=original_language,
                description=description,
                status=status,
                start_release_date=start_release_date,
                end_release_date=end_release_date,
            )
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


async def upsert_novel_staff(
    db_session: AsyncSession,
    novel_id: int,
    staff: list[NovelStaffWriteSchema],
    orm_staff: list[Staff],
) -> Sequence[NovelStaff]:
    if not staff:
        return []
    orm_staff_dict: dict[int, Staff] = dict()
    for s in orm_staff:
        orm_staff_dict[s.staff_id] = s
    try:
        stmt = insert(NovelStaff).values(
            [
                {
                    'novel_id': novel_id,
                    'order_pos': i,
                    'staff_id': int(s.staff_id),
                    'staff_main_alias': orm_staff_dict[int(s.staff_id)].main_alias,
                    'role': s.role,
                    'note': s.note,
                }
                for s, i in zip(staff, range(len(staff)))
            ]
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[NovelStaff.novel_id, NovelStaff.staff_id, NovelStaff.role],
            set_=dict(
                staff_main_alias=stmt.excluded.staff_main_alias,
                role=stmt.excluded.role,
                note=stmt.excluded.note,
            ),
        )
        novel_staff = (
            await db_session.scalars(
                stmt.returning(NovelStaff),
                execution_options={'populate_existing': True},
            )
        ).all()
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise
    return novel_staff


async def update_novel_staff_by_staff_id(
    db_session: AsyncSession, staff_id: int, new_alias: str
):
    try:
        await db_session.execute(
            update(NovelStaff)
            .where(NovelStaff.staff_id == staff_id)
            .values(staff_main_alias=new_alias)
        )
    except Exception:
        logger.exception('Unexpected error')
        raise


async def clear_novel_staff(db_session: AsyncSession, novel_id: str):
    try:
        await db_session.execute(
            delete(NovelStaff).where(cast(NovelStaff.novel_id, Text) == novel_id)
        )
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise
