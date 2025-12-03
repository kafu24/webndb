from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    Identity,
    Index,
    MetaData,
    PrimaryKeyConstraint,
    UniqueConstraint,
    event,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, TIMESTAMP
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import BigInteger, Boolean, Enum, Integer, SmallInteger, Text

from .const import (
    CHAPTER_ORDER_MAX,
    NOVEL_DESCRIPTION_MAX,
    NOVEL_TITLE_MAX,
    RELEASE_TITLE_MAX,
    VOLUME_ORDER_MAX,
    VOLUME_TITLE_MAX,
)


class Language(StrEnum):
    """IETF language tag."""

    EN = 'en'  # English
    KO = 'ko'  # Korean
    ZH_HANS = 'zh-Hans'  # Chinese, Han (Simplified)
    ZH_HANT = 'zh-Hant'  # Chinese, Han (Traditional)
    JA = 'ja'  # Japanese


class PublicationStatus(StrEnum):
    """Publication status."""

    ONGOING = 'ongoing'
    COMPLETED = 'completed'
    HIATUS = 'hiatus'
    CANCELLED = 'cancelled'
    UNKNOWN = 'unknown'


class Base(AsyncAttrs, DeclarativeBase):
    metadata = MetaData(
        naming_convention={
            'ix': 'ix_%(table_name)s_%(column_0_N_label)s',
            'uq': 'uq_%(table_name)s_%(column_0_N_name)s',
            'ck': 'ck_%(table_name)s_%(constraint_name)s',
            'fk': 'fk_%(table_name)s_%(column_0_N_name)s_%(referred_table_name)s',
            'pk': 'pk_%(table_name)s',
        }
    )
    type_annotation_map = {
        Language: Enum(
            Language, name='language', values_callable=lambda x: [e.value for e in x]
        ),
        PublicationStatus: Enum(
            PublicationStatus,
            name='publication_status',
            values_callable=lambda x: [e.value for e in x],
        ),
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


class AuthUser(Base):
    __tablename__ = 'auth_user'

    # OIDC sub claim
    user_id: Mapped[str] = mapped_column(Text, primary_key=True)
    username: Mapped[str] = mapped_column(Text, unique=True)


class Novel(Base):
    __tablename__ = 'novel'

    novel_id: Mapped[int] = mapped_column(
        BigInteger, Identity(always=True), primary_key=True
    )
    original_language: Mapped[Language | None]
    description: Mapped[str | None] = mapped_column(
        Text,
        CheckConstraint(
            f'description IS NULL OR char_length(description) <= {NOVEL_DESCRIPTION_MAX}',
            name='novel_description_length',
        ),
    )
    status: Mapped[PublicationStatus] = mapped_column(
        server_default=PublicationStatus.UNKNOWN
    )

    titles: Mapped[list['NovelTitle']] = relationship(
        back_populates='novel',
        cascade='all, delete-orphan',
        passive_deletes=True,
        order_by='NovelTitle.official',
    )
    volumes: Mapped[list['Volume']] = relationship(
        back_populates='novel',
        passive_deletes='all',
        order_by='Volume.volume_order',
    )
    chapters: Mapped[list['Chapter']] = relationship(
        back_populates='novel',
        passive_deletes='all',
        order_by='Chapter.chapter_order',
    )


@event.listens_for(Novel.__table__, 'after_create')
def distribute_novel(target, connection, **kw):
    connection.execute(text("SELECT create_distributed_table('novel', 'novel_id')"))


class NovelTitle(Base):
    __tablename__ = 'novel_title'

    novel_id: Mapped[int] = mapped_column(
        ForeignKey('novel.novel_id', ondelete='CASCADE')
    )
    lang: Mapped[Language]
    official: Mapped[bool] = mapped_column(Boolean)
    title: Mapped[str] = mapped_column(
        Text,
        CheckConstraint(
            f'char_length(title) <= {NOVEL_TITLE_MAX}', name='novel_title_length'
        ),
    )
    latin: Mapped[str | None] = mapped_column(
        Text,
        CheckConstraint(
            f'latin IS NULL OR char_length(latin) <= {NOVEL_TITLE_MAX}',
            name='novel_title_latin_length',
        ),
    )
    # TODO: consider a check constraint so that `latin` is NULL if `lang`
    # doesn't have a romanized form.

    novel: Mapped[Novel] = relationship(back_populates='titles')

    __table_args__ = (PrimaryKeyConstraint('novel_id', 'lang'),)


@event.listens_for(NovelTitle.__table__, 'after_create')
def distribute_novel_title(target, connection, **kw):
    connection.execute(
        text(
            'SELECT create_distributed_table('
            "'novel_title', 'novel_id', colocate_with => 'novel')"
        )
    )


# TODO: update to support history in this table. Having a separate history
# table for this seems pointless.
class VolumeOrdering(Base):
    __tablename__ = 'volume_ordering'

    novel_id: Mapped[int] = mapped_column(
        ForeignKey('novel.novel_id'), primary_key=True
    )
    next_order: Mapped[int] = mapped_column(
        Integer,
        CheckConstraint(
            f'next_order >= 1 AND next_order <= {VOLUME_ORDER_MAX + 1}',
            name='volume_next_order_limit',
        ),
        default=text('1'),
    )
    ordering: Mapped[list[int]] = mapped_column(
        MutableList.as_mutable(ARRAY(Integer)),
        CheckConstraint(
            f'cardinality(ordering) <= {VOLUME_ORDER_MAX}',
            name='volume_ordering_cardinality',
        ),
        default=text('ARRAY[]::INTEGER[]'),
    )


@event.listens_for(VolumeOrdering.__table__, 'after_create')
def distribute_volume(target, connection, **kw):
    connection.execute(
        text(
            'SELECT create_distributed_table('
            "'volume_ordering', 'novel_id', colocate_with => 'novel')"
        )
    )


class Volume(Base):
    __tablename__ = 'volume'

    volume_id: Mapped[int] = mapped_column(BigInteger, Identity(always=True))
    """Database can't guarantee that volume_id is unique."""
    novel_id: Mapped[int] = mapped_column(ForeignKey('novel.novel_id'))
    volume_order: Mapped[int] = mapped_column(
        SmallInteger,
        CheckConstraint(
            f'volume_order >= 1 AND volume_order <= {VOLUME_ORDER_MAX}',
            name='volume_order_limit',
        ),
    )

    novel: Mapped[Novel] = relationship(back_populates='volumes')
    titles: Mapped[list['VolumeTitle']] = relationship(
        back_populates='volume',
        cascade='all, delete-orphan',
        passive_deletes=True,
        order_by='VolumeTitle.official',
    )
    # Citus doesn't let us use ON DELETE SET NULL volume_id in the chapter table.
    # SQLAlchemy will try to nullify child FKs when volume is deleted; I'd rather
    # do that manually then have the ORM do it, so set passive_deletes to 'all'
    # to disable that behavior.
    chapters: Mapped[list['Chapter']] = relationship(
        back_populates='volume',
        passive_deletes='all',
        order_by='Chapter.chapter_order',
        # foreign_keys=[volume_id],
        primaryjoin=(
            'and_(Volume.volume_id.is_not_distinct_from(foreign(Chapter.volume_id)),'
            ' Volume.novel_id == foreign(Chapter.novel_id))'
        ),
        overlaps='chapters',
    )

    __table_args__ = (
        # novel_id is included because Citus doesn't let us have a PK w/o the
        # distribution key.
        PrimaryKeyConstraint('volume_id', 'novel_id'),
        UniqueConstraint('novel_id', 'volume_order'),
    )


@event.listens_for(Volume.__table__, 'after_create')
def distribute_volume(target, connection, **kw):
    connection.execute(
        text(
            'SELECT create_distributed_table('
            "'volume', 'novel_id', colocate_with => 'novel')"
        )
    )


class VolumeTitle(Base):
    __tablename__ = 'volume_title'

    volume_id: Mapped[int] = mapped_column(BigInteger)
    novel_id: Mapped[int] = mapped_column(BigInteger)
    lang: Mapped[Language]
    official: Mapped[bool] = mapped_column(Boolean)
    title: Mapped[str] = mapped_column(
        Text,
        CheckConstraint(
            f'char_length(title) <= {VOLUME_TITLE_MAX}', name='volume_title_length'
        ),
    )
    latin: Mapped[str | None] = mapped_column(
        Text,
        CheckConstraint(
            f'latin IS NULL OR char_length(latin) <= {VOLUME_TITLE_MAX}',
            name='volume_title_latin_length',
        ),
    )

    volume: Mapped[Volume] = relationship(back_populates='titles')

    __table_args__ = (
        # novel_id is redundant, but needed to distribute this table
        PrimaryKeyConstraint('volume_id', 'novel_id', 'lang'),
        ForeignKeyConstraint(
            ['novel_id', 'volume_id'],
            ['volume.novel_id', 'volume.volume_id'],
            ondelete='CASCADE',
        ),
    )


@event.listens_for(VolumeTitle.__table__, 'after_create')
def distribute_volume_title(target, connection, **kw):
    connection.execute(
        text(
            'SELECT create_distributed_table('
            "'volume_title', 'novel_id', colocate_with => 'novel')"
        )
    )


# TODO: chapter_ordering_hist table, references novel


class Chapter(Base):
    __tablename__ = 'chapter'

    chapter_id: Mapped[int] = mapped_column(BigInteger, Identity(always=True))
    """Database can't guarantee that chapter_id is unique because we
    can't have unique constraints that don't include the distribution
    column.
    """
    novel_id: Mapped[int] = mapped_column(ForeignKey('novel.novel_id'))
    volume_id: Mapped[int | None] = mapped_column(BigInteger)
    chapter_order: Mapped[int] = mapped_column(
        SmallInteger,
        CheckConstraint(
            f'chapter_order >= 1 AND chapter_order <= {CHAPTER_ORDER_MAX}',
            name='chapter_order_limit',
        ),
    )

    novel: Mapped[Novel] = relationship(back_populates='chapters', overlaps='chapters')
    volume: Mapped[Volume] = relationship(
        back_populates='chapters', foreign_keys=[volume_id]
    )
    releases: Mapped[list['ChRelease']] = relationship(
        back_populates='chapter', passive_deletes='all'
    )

    __table_args__ = (
        # novel_id is included because Citus doesn't let us have a PK w/o the
        # distribution key.
        PrimaryKeyConstraint('chapter_id', 'novel_id'),
        UniqueConstraint('novel_id', 'chapter_order'),
        ForeignKeyConstraint(
            ['volume_id', 'novel_id'],
            ['volume.volume_id', 'volume.novel_id'],
        ),
        Index('ix_chapter_volume_id_novel_id', volume_id, novel_id),
        # Redundant unique constraint for release
        UniqueConstraint('chapter_id', 'novel_id'),
    )


@event.listens_for(Chapter.__table__, 'after_create')
def distribute_chapter(target, connection, **kw):
    connection.execute(
        text(
            'SELECT create_distributed_table('
            "'chapter', 'novel_id', colocate_with => 'novel')"
        )
    )


class ChRelease(Base):
    __tablename__ = 'ch_release'

    release_id: Mapped[int] = mapped_column(BigInteger, Identity(always=True))
    """Database can't guarantee that release_id is unique because we
    can't have unique constraints that don't include the distribution
    column.
    """
    release_date: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True))
    # TODO: last_updated_at date?
    chapter_id: Mapped[int] = mapped_column(BigInteger)
    novel_id: Mapped[int] = mapped_column(BigInteger)
    lang: Mapped[Language]
    official: Mapped[bool] = mapped_column(Boolean)
    title: Mapped[str] = mapped_column(
        Text,
        CheckConstraint(
            f'char_length(title) <= {RELEASE_TITLE_MAX}', name='ch_release_title_length'
        ),
    )
    latin: Mapped[str | None] = mapped_column(
        Text,
        CheckConstraint(
            f'latin IS NULL OR char_length(latin) <= {RELEASE_TITLE_MAX}',
            name='ch_release_title_latin_length',
        ),
    )

    chapter: Mapped[Chapter] = relationship(back_populates='releases')

    __table_args__ = (
        # novel_id is included because Citus doesn't let us have a PK w/o the
        # distribution key.
        PrimaryKeyConstraint('release_id', 'novel_id'),
        ForeignKeyConstraint(
            ['chapter_id', 'novel_id'], ['chapter.chapter_id', 'chapter.novel_id']
        ),
        Index('ix_ch_release_chapter_id_novel_id', chapter_id, novel_id),
    )


@event.listens_for(ChRelease.__table__, 'after_create')
def distribute_ch_release(target, connection, **kw):
    connection.execute(
        text(
            'SELECT create_distributed_table('
            "'ch_release', 'novel_id', colocate_with => 'novel')"
        )
    )
