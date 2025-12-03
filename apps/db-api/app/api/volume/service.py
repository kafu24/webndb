from typing import Sequence

import structlog
from sqlalchemy import Text, bindparam, cast, delete, exc, select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.const import VOLUME_ORDER_MAX
from app.models import Volume, VolumeOrdering, VolumeTitle

from .schemas import VolumeTitleWriteSchema

logger = structlog.stdlib.get_logger()


async def insert_initial_volume_ordering(db_session: AsyncSession, novel_id: int):
    """After a novel is created, a volume_ordering record should be
    created.

    `db_session` is flushed.
    """
    # Would prefer to do this as a trigger, but triggers aren't supported on
    # distributed tables.
    db_session.add(VolumeOrdering(novel_id=novel_id))
    db_session.flush()


async def get_next_order(db_session: AsyncSession, novel_id: str) -> int:
    volume_ordering = await db_session.scalar(
        select(VolumeOrdering).where(cast(VolumeOrdering.novel_id, Text) == novel_id)
    )
    return volume_ordering.next_order


async def insert_into_ordering(
    db_session: AsyncSession,
    novel_id: str,
    insert_index: int,
    volume_id: int,
):
    """Inserts `volume_id` into the `ordering` array of
    `volume_ordering` at `insert_index`. `next_order` is incremented.
    `volume_id` must refer to a valid volume (exists and is with
    `novel_id`).

    `db_session` is flushed, not committed.
    """

    volume_ordering = await db_session.scalar(
        select(VolumeOrdering).where(cast(VolumeOrdering.novel_id, Text) == novel_id)
    )
    # SQLAlchemy says its 1-indexed to match Postgres, but we map it to a Python
    # list, so it's 0 indexed anyway?
    volume_ordering.ordering.insert(insert_index - 1, volume_id)
    volume_ordering.next_order += 1
    await db_session.flush()


async def update_subsequent_orders(
    db_session: AsyncSession,
    novel_id: str,
    order_to_insert: int,
):
    """Increments `volume_order` by 1 for volumes with an order greater
    than or equal to `order_to_insert`.

    `db_session` is flushed, not committed.
    """
    await db_session.execute(
        update(Volume)
        .where(
            cast(Volume.novel_id, Text) == novel_id,
            Volume.volume_order >= order_to_insert,
        )
        .values(volume_order=Volume.volume_order + 1)
    )
    await db_session.flush()


async def select_volume(
    db_session: AsyncSession, novel_id: str, volume_id: str
) -> Volume:
    """Get a record in the `volume` table by PK."""
    # novel_id is redundant, but it's useful for checking invalid API volume_id
    # E.g., if the (novel_id, volume_id) should be (1, 1) then sending (2, 1)
    # should be invalid.
    return await db_session.scalar(
        select(Volume)
        .where(
            cast(Volume.novel_id, Text) == novel_id,
            cast(Volume.volume_id, Text) == volume_id,
        )
        .options(selectinload(Volume.titles))
    )


async def insert_volume(
    db_session: AsyncSession,
    novel_id: str,
    volume_order: int = None,
) -> Volume:
    """Inserts a record in the `volume` table."""
    next_order = await get_next_order(db_session, novel_id)
    if volume_order is None or volume_order > next_order:
        volume_order = next_order
    assert next_order <= VOLUME_ORDER_MAX + 1
    try:
        # Unique constraint on volume_order, so we need to move everything
        # up if we're taking a space.
        if volume_order < next_order:
            await update_subsequent_orders(db_session, novel_id, volume_order)
        # Can't use SQLAlchemy's cast(novel_id, BigInteger) since asyncpg
        # doesn't like converting 'str' to integer even though I don't want
        # it to (I want Postgres to do it).
        # volume = Volume(novel_id=cast(novel_id, BigInteger), volume_order=volume_order)
        stmt = text(
            'INSERT INTO volume (novel_id, volume_order) VALUES'
            ' (CAST(:novel_id AS BIGINT), :volume_order)'
            ' RETURNING *'
        ).bindparams(
            bindparam('novel_id', value=novel_id),
            bindparam('volume_order', value=volume_order),
        )
        result = (await db_session.execute(stmt)).fetchone()
        await db_session.flush()
        volume = Volume(
            volume_id=result.volume_id,
            novel_id=result.novel_id,
            volume_order=result.volume_order,
        )
        await insert_into_ordering(db_session, novel_id, volume_order, volume.volume_id)
    except Exception:
        logger.exception('Unexpected error')
        raise
    return volume


async def update_volume(
    db_session: AsyncSession,
    novel_id: str,
    volume_id: str,
    old_volume_order: int,
    volume_order: int,
) -> Volume:
    """Updates the volume identified by `volume_id`.

    Currently, the only column to be updated in this table is
    `volume_order`, so if that is not changing, don't call this
    function.
    """
    if old_volume_order == volume_order:
        return None
    next_order = await get_next_order(db_session, novel_id)
    if volume_order > next_order:
        volume_order = next_order
    assert next_order <= VOLUME_ORDER_MAX + 1
    try:
        if volume_order < old_volume_order:
            # We're moving backwards and taking up someone's place,
            # so we need to move everything up to the volume being updated.
            # Everything after the volume being updated will not move.
            await db_session.execute(
                update(Volume)
                .where(
                    cast(Volume.novel_id, Text) == novel_id,
                    Volume.volume_order >= volume_order,
                    Volume.volume_order < old_volume_order,
                )
                .values(volume_order=Volume.volume_order + 1)
            )
        else:
            # We're moving forwards. Everything between the volume being
            # updated to its new location (inclusive) should move back.
            await db_session.execute(
                update(Volume)
                .where(
                    cast(Volume.novel_id, Text) == novel_id,
                    Volume.volume_order > old_volume_order,
                    Volume.volume_order <= volume_order,
                )
                .values(volume_order=Volume.volume_order - 1)
            )
        stmt = (
            update(Volume)
            .where(cast(Volume.volume_id, Text) == volume_id)
            .values(volume_order=volume_order)
        )
        volume = await db_session.scalar(
            stmt.returning(Volume), execution_options={'populate_existing': True}
        )
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise
    return volume


async def upsert_volume_titles(
    db_session: AsyncSession,
    volume_id: str,
    novel_id: str,
    titles: list[VolumeTitleWriteSchema],
) -> Sequence[VolumeTitle]:
    """Upsert records in the `volume_title` table."""
    try:
        stmt = insert(VolumeTitle).values(
            [
                {
                    'volume_id': int(volume_id),
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
            index_elements=[
                VolumeTitle.volume_id,
                VolumeTitle.novel_id,
                VolumeTitle.lang,
            ],
            set_=dict(
                official=stmt.excluded.official,
                title=stmt.excluded.title,
                latin=stmt.excluded.latin,
            ),
        )
        titles = (
            await db_session.scalars(
                stmt.returning(VolumeTitle),
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


async def clear_volume_titles(db_session: AsyncSession, volume_id: str):
    try:
        await db_session.execute(
            delete(VolumeTitle).where(cast(VolumeTitle.volume_id, Text) == volume_id)
        )
    except exc.SQLAlchemyError as e:
        logger.exception(e._message())
        raise
    except Exception:
        logger.exception('Unexpected error')
        raise
