from enum import StrEnum

from sqlalchemy import Identity, MetaData, PrimaryKeyConstraint, event, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.schema import ForeignKey
from sqlalchemy.types import BigInteger, Boolean, Enum, Text


class Language(StrEnum):
    """IETF language tag."""

    EN = 'en'  # English
    KO = 'ko'  # Korean
    ZH_HANS = 'zh-Hans'  # Chinese, Han (Simplified)
    ZH_HANT = 'zh-Hant'  # Chinese, Han (Traditional)
    JA = 'ja'  # Japanese


class Base(DeclarativeBase):
    metadata = MetaData(
        naming_convention={
            'ix': 'ix_%(column_0_N_label)s',
            'uq': 'uq_%(table_name)s_%(column_0_N_name)s',
            'ck': 'ck_%(table_name)s_%(constraint_name)s',
            'fk': 'fk_%(table_name)s_%(column_0_N_name)s_%(referred_table_name)s',
            'pk': 'pk_%(table_name)s',
        }
    )
    type_annotation_map = {
        Language: Enum(
            Language, name='language', values_callable=lambda x: [e.value for e in x]
        )
    }

    def __repr__(self):
        return (
            f'{self.__class__.__name__}('
            + ', '.join(
                [
                    f'{field}={getattr(self, field)}'
                    for field in self.__mapper__.columns.keys()
                ]
            )
            + ')'
        )


class WebNovel(Base):
    __tablename__ = 'web_novel'

    web_novel_id: Mapped[int] = mapped_column(
        BigInteger, Identity(always=True), primary_key=True
    )
    original_language: Mapped[Language | None]
    description: Mapped[str | None] = mapped_column(Text)

    titles: Mapped[list['WebNovelTitle']] = relationship(
        back_populates='web_novel',
        cascade='all, delete-orphan',
        passive_deletes=True,
        order_by='WebNovelTitle.official',
    )


@event.listens_for(WebNovel.__table__, 'after_create')
def distribute_web_novel(target, connection, **kw):
    connection.execute(
        text("SELECT create_distributed_table('web_novel', 'web_novel_id')")
    )


class WebNovelTitle(Base):
    __tablename__ = 'web_novel_title'

    web_novel_id: Mapped[int] = mapped_column(
        ForeignKey('web_novel.web_novel_id', ondelete='CASCADE')
    )
    language: Mapped[Language]
    official: Mapped[bool] = mapped_column(Boolean)
    title: Mapped[str] = mapped_column(Text)
    latin: Mapped[str | None] = mapped_column(Text)

    web_novel: Mapped[WebNovel] = relationship(back_populates='titles')

    __table_args__ = (PrimaryKeyConstraint('web_novel_id', 'language'),)


@event.listens_for(WebNovelTitle.__table__, 'after_create')
def distribute_web_novel_title(target, connection, **kw):
    connection.execute(
        text("SELECT create_distributed_table('web_novel_title', 'web_novel_id')")
    )
