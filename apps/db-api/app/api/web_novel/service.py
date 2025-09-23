from typing import TYPE_CHECKING

from sqlakeyset.asyncio import select_page
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Novel

if TYPE_CHECKING:
    from sqlakeyset import Page
    from sqlalchemy import Row, Tuple


async def query(
    db_session: AsyncSession, max_page_size: int, bookmark: str | None
) -> 'Page[Row[Tuple[Novel]]]':
    """Query web novels."""
    q = select(Novel).order_by(Novel.novel_id)
    return await select_page(db_session, q, per_page=max_page_size, page=bookmark)
