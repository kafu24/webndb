from typing import Sequence

import structlog
from sqlalchemy import Text, cast, delete, exc, func, select, update
from sqlalchemy.dialects.postgresql import array, insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import (
    Gender,
    Language,
    Staff,
    StaffAlias,
    StaffExtlink,
    StaffLang,
    StaffNovel,
    StaffType,
)

from .schemas import StaffAliasWriteSchema, StaffExtlinkWriteSchema

logger = structlog.stdlib.get_logger()


async def select_staff(db_session: AsyncSession, staff_id: str) -> Staff:
    """Get a record in the `staff` table by PK."""
    staff = await db_session.scalar(
        select(Staff)
        .where(cast(Staff.staff_id, Text) == staff_id)
        .options(
            # Citus needs the distributed table's PK in the ON clause so we
            # have to use joinedload, not selectinload (puts in WHERE clause).
            selectinload(Staff.langs.and_(StaffLang.staff_id == Staff.staff_id)),
            selectinload(Staff.aliases.and_(StaffAlias.staff_id == Staff.staff_id)),
            selectinload(Staff.extlinks.and_(StaffExtlink.staff_id == Staff.staff_id)),
        )
    )
    return staff


async def select_nonexistent_staff_id(
    db_session: AsyncSession, staff_ids: set[str]
) -> Sequence[int]:
    """Returns sequence of staff_id values that aren't associated with
    a staff record.
    """
    if not staff_ids:
        return []
    unnested = func.unnest(array(staff_ids)).column_valued('t')
    stmt = (
        select(unnested)
        .join(Staff, unnested == cast(Staff.staff_id, Text), isouter=True)
        .where(Staff.staff_id.is_(None))
    )
    return (await db_session.scalars(stmt)).all()


async def select_multiple_staff(
    db_session: AsyncSession, staff_ids: Sequence[str]
) -> Sequence[Staff]:
    return (
        await db_session.scalars(
            select(Staff).where(cast(Staff.staff_id, Text).in_(staff_ids))
        )
    ).all()


async def insert_staff(
    db_session: AsyncSession,
    staff_type: StaffType,
    gender: Gender,
    primary_lang: Language,
    main_alias: str,
    description: str | None,
) -> Staff:
    try:
        staff = Staff(
            staff_type=staff_type,
            gender=gender,
            primary_lang=primary_lang,
            main_alias=main_alias,
            description=description,
        )
        db_session.add(staff)
        # Do not commit, it will violate FK constraints
        await db_session.flush()
    except Exception:
        logger.exception('Unexpected error')
        raise
    return staff


async def update_staff(
    db_session: AsyncSession,
    staff_id: str,
    staff_type: StaffType,
    gender: Gender,
    primary_lang: Language,
    main_alias: str,
    description: str | None,
) -> Staff:
    try:
        stmt = (
            update(Staff)
            .where(cast(Staff.staff_id, Text) == staff_id)
            .values(
                staff_type=staff_type,
                gender=gender,
                primary_lang=primary_lang,
                main_alias=main_alias,
                description=description,
            )
        )
        staff = await db_session.scalar(
            stmt.returning(Staff), execution_options={'populate_existing': True}
        )
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise
    return staff


async def upsert_staff_langs(
    db_session: AsyncSession, staff_id: int, langs: list[Language]
) -> list[StaffLang]:
    try:
        stmt = insert(StaffLang).values(
            [{'staff_id': staff_id, 'lang': l} for l in langs]
        )
        stmt = stmt.on_conflict_do_nothing()
        ret_langs = (
            await db_session.scalars(
                stmt.returning(StaffLang), execution_options={'populate_existing': True}
            )
        ).all()
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise
    return ret_langs


async def clear_staff_langs(db_session: AsyncSession, staff_id: int):
    try:
        await db_session.execute(
            delete(StaffLang).where(StaffLang.staff_id == staff_id)
        )
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise


async def upsert_staff_aliases(
    db_session: AsyncSession, staff_id: int, aliases: list[StaffAliasWriteSchema]
) -> list[StaffAlias]:
    try:
        stmt = insert(StaffAlias).values(
            [
                {
                    'staff_id': staff_id,
                    'order_pos': i,
                    'name': a.name,
                    'latin': a.latin,
                }
                for a, i in zip(aliases, range(len(aliases)))
            ]
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[StaffAlias.name, StaffAlias.staff_id],
            set_=dict(name=StaffAlias.name, latin=StaffAlias.latin),
        )
        ret_aliases = (
            await db_session.scalars(
                stmt.returning(StaffAlias),
                execution_options={'populate_existing': True},
            )
        ).all()
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise
    return ret_aliases


async def clear_staff_aliases(db_session: AsyncSession, staff_id: int):
    try:
        await db_session.execute(
            delete(StaffAlias).where(StaffAlias.staff_id == staff_id)
        )
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise


async def upsert_staff_extlinks(
    db_session: AsyncSession, staff_id: int, extlinks: list[StaffExtlinkWriteSchema]
) -> list[StaffExtlink]:
    if not extlinks:
        return []
    try:
        stmt = insert(StaffExtlink).values(
            [
                {
                    'staff_id': staff_id,
                    'order_pos': i,
                    'link': l.link,
                }
                for l, i in zip(extlinks, range(len(extlinks)))
            ]
        )
        res_extlinks = (
            await db_session.scalars(
                stmt.returning(StaffExtlink),
                execution_options={'populate_existing': True},
            )
        ).all()
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise
    return res_extlinks


async def clear_staff_extlinks(db_session: AsyncSession, staff_id: int):
    try:
        await db_session.execute(
            delete(StaffExtlink).where(StaffExtlink.staff_id == staff_id)
        )
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise


async def insert_staff_novel_by_novel_id(
    db_session: AsyncSession,
    novel_id: str,
    staff_ids: Sequence[str],
) -> Sequence[StaffNovel]:
    if not staff_ids:
        return []
    try:
        stmt = insert(StaffNovel).values(
            [{'novel_id': int(novel_id), 'staff_id': int(id)} for id in staff_ids]
        )
        staff_novels = (
            await db_session.scalars(
                stmt.returning(StaffNovel),
                execution_options={'populate_existing': True},
            )
        ).all()
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise
    return staff_novels


async def clear_staff_novel_by_novel_id(db_session: AsyncSession, novel_id: str):
    try:
        await db_session.execute(
            delete(StaffNovel).where(cast(StaffNovel.novel_id, Text) == novel_id)
        )
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise
