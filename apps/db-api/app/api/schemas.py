import json
from typing import TYPE_CHECKING, Any

import msgspec
from msgspec import Struct

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
