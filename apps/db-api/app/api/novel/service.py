import structlog
from sqlalchemy import Text, cast, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Novel

logger = structlog.stdlib.get_logger()


async def select_novel(db_session: AsyncSession, novel_id: str) -> Novel:
    """Get a record in the `novel` table by PK."""
    return await db_session.scalar(
        select(Novel)
        .where(cast(Novel.novel_id, Text) == novel_id)
        .options(selectinload(Novel.titles))
    )
