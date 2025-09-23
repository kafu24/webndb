from typing import TYPE_CHECKING

from sqlakeyset.asyncio import select_page
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import WebNovel

if TYPE_CHECKING:
    from sqlakeyset import Page
    from sqlalchemy import Row, Tuple


async def query(
    db_session: AsyncSession, max_page_size: int, bookmark: str | None
) -> 'Page[Row[Tuple[WebNovel]]]':
    """Query web novels."""
    q = select(WebNovel).order_by(WebNovel.web_novel_id)
    return await select_page(db_session, q, per_page=max_page_size, page=bookmark)
