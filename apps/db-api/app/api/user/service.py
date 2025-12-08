from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuthUser


async def select_auth_user(db_session: AsyncSession, user_id: str) -> AuthUser:
    return await db_session.scalar(select(AuthUser).where(AuthUser.user_id == user_id))
