from typing import Annotated

from msgspec import Meta

from app.models import AuthUser

from ..schemas import BaseStruct

UserIDMeta = Meta(
    title='User ID',
    description='Identifier for a user',
    examples=['d165faa5-f09d-445b-ad26-ddea44e328a9'],
)

UsernameMeta = Meta(title='Username', examples=['rcf710sSBCMGMHvVi3M3kqExU0IfKij7'])


class UserSchema(BaseStruct):
    user_id: Annotated[str, UserIDMeta]
    username: Annotated[str, UsernameMeta]


def to_user_schema(user: AuthUser) -> UserSchema:
    return UserSchema(user_id=user.user_id, username=user.username)
