import json
from typing import TYPE_CHECKING, Annotated, Any, Generic, TypeVar

import msgspec
from litestar.openapi.spec.enums import OpenAPIType
from litestar.params import Parameter
from msgspec import Meta, Struct

from app.config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE

if TYPE_CHECKING:
    from typing import Any

GENERIC_RESPONSE_DESCRIPTION = 'Request fulfilled, representation follows'


class JSONNull:
    pass


JSON_NULL = JSONNull()
"""Litestar uses `None` to denote when something is not set in their
internal OpenAPI class, so when preparing to convert from their class
to JSON, they cannot distinguish between `None` and unset. A value that
is `None` is excluded from conversion. This means you cannot set a
default value of `None` for Struct fields to get a literal `null` as
the default value in JSON.

Note that the conversion function itself does encode `None` as `null`.

Our workaround is to create a custom type that is not `None`, so it
won't be excluded from conversion to JSON, and then use a custom type
encoder to convert the custom type to `None` during JSON conversion so
that it will be encoded as `null`.
"""


def jsonnull_enc_hook(obj):
    if isinstance(obj, JSONNull):
        return None
    raise TypeError(f'Cannot encode objects of type {type(obj)}')


class bigint(int):
    pass


def bigint_enc_hook(obj):
    if isinstance(obj, bigint):
        return str(obj)
    raise TypeError(f'Cannot encode objects of type {type(obj)}')


class BaseStruct(Struct):
    def to_dict(self) -> dict[str, 'Any']:
        """Return serialized struct as a dictionary.

        In views tests, doing an equality comparison of this value with
        the JSON returned in responses is a tautology. That's just
        checking if a msgspec serialized struct is equal to a msgspec
        serialized struct.

        This method is useful when you want to check when something is
        present in a collection. E.g., tests involving pagination just
        care about whether the right number of resources were returned,
        not whether the representation correctly follows the documented
        schema.
        """
        return json.loads(
            msgspec.json.encode(self, enc_hook=bigint_enc_hook).decode('utf-8')
        )


def create_q_param(searchable_fields: list[str] = None) -> Parameter:
    return Parameter(
        description=(
            'Query string to set search terms. Search applies to'
            f' {",".join([f"`{f}`" for f in searchable_fields])}.\n'
            '\n'
            'Note that if `q` is not an empty string, there will only'
            ' be 1000 items to paginate through.'
        )
    )


def create_filter_param(filterable_fields: list[str]) -> Parameter:
    return Parameter(
        description=(
            'String with filter expressions to refine search results.'
            ' Available fields are:'
            f' {",".join([f"`{f}`" for f in filterable_fields])}.'
        )
    )


def create_sort_pattern(sortable_fields: list[str]) -> str:
    """`sort` in a `QueryRequest` child should have a type like:

    `Annotated[list[Annotated[str, Meta(pattern=...)]], Parameter()]`

    where `pattern` should be returned from this function.
    """
    return f'^({"|".join(sortable_fields)}):(asc|desc)$'


def create_sort_parameter(
    sortable_fields: list[str], default: list[str] = ['']
) -> Parameter:
    """`sort` in a `QueryRequest` child should have a type like:

    `Annotated[list[Annotated[str, Meta(pattern=...)]], Parameter()]`

    where `Parameter()` should be returned from this function.
    """
    return Parameter(
        schema_extra={
            'default': default,
            'oneOf': None,
            'type': OpenAPIType.ARRAY,
            'items': {
                'type': OpenAPIType.STRING,
                'pattern': create_sort_pattern(sortable_fields),
            },
        },
        description=(
            'Sort results according to specified fields and indicated order.'
            ' Note that if `q` is not empty, relevancy is prioritzed over sorting.'
            ' The following fields are available for sorting:'
            f' {",".join([f"`{f}`" for f in sortable_fields])}.'
        ),
        required=False,
    )


class QueryRequest(BaseStruct):
    """Base container for storing query parameters for query operations."""

    q: str = ''
    offset: Annotated[
        int,
        Parameter(
            ge=0,
            description=(
                'Sets the starting point in the search results'
                ' (the number of resources to skip)'
            ),
            # ge=0 doesn't show in OpenAPI schema
            schema_extra={'minimum': 0},
        ),
    ] = 0
    limit: Annotated[
        int,
        Parameter(
            ge=0,
            description=(
                'Sets the maximum number of documents returned by a request.'
                f' Unset uses a defalut value of {DEFAULT_PAGE_SIZE}.'
                f' Values above {MAX_PAGE_SIZE} will be coerced to {MAX_PAGE_SIZE}.'
            ),
            # ge=0 doesn't show in OpenAPI schema
            schema_extra={'minimum': 0},
        ),
    ] = DEFAULT_PAGE_SIZE
    fields: Annotated[
        list[str] | None,
        Parameter(
            # TODO: consider setting max_items
            schema_extra={
                'default': ['*'],
                'oneOf': None,
                'type': OpenAPIType.ARRAY,
                'items': {'type': OpenAPIType.STRING},
            },
            description=(
                'Configures the fields that are returned in items.'
                ' If `"*"` is received, then all fields are returned.'
                ' Non-existent fields are ignored.'
            ),
            required=False,
        ),
    ] = None
    filter: str = ''
    sort: list[str] | None = None

    def __post_init__(self):
        self.limit = min(self.limit, MAX_PAGE_SIZE)
        # We can't use msgspec.field(default_factory) (nor `[]` which is syntatic
        # sugar for the same thing) as the default value for a field.
        # It'll have the type `msgspec._core.Default` which raises a validation
        # error since it doesn't match with the expected `list` type.
        # Workaround is to use `None` as default value and change it to some list
        # in __post_init__().
        if self.fields is None:
            self.fields = ['*']
        if self.sort is None:
            self.sort = []


T = TypeVar('T')


QueryItemsMeta = Meta(
    title='Items', description='Array of objects representing the query results'
)


class QueryResponse(BaseStruct, Generic[T]):
    """Container for data returned from a query."""

    items: Annotated[list[T], QueryItemsMeta]
    query: Annotated[str, Meta(description='Query originating the response')]
    offset: Annotated[int, Meta(description='Number of resources skipped')]
    limit: Annotated[int, Meta(description='Number of resources to take')]
