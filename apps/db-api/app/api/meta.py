from typing import Annotated

from litestar.openapi.spec.enums import OpenAPIType
from litestar.params import Parameter
from msgspec import Meta

from app.config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE

MaxPageSize = Annotated[
    int,
    Parameter(
        ge=0,
        required=False,
        description=(
            'Maximum number of results to return. If unset or 0, a default value'
            f' of {DEFAULT_PAGE_SIZE} is used. Values above {MAX_PAGE_SIZE} will'
            f' be coerced to {MAX_PAGE_SIZE}.'
        ),
    ),
]

PageTokenType = Annotated[
    str | None,
    Parameter(
        schema_extra={'oneOf': None, 'type': OpenAPIType.STRING},
        required=False,
        description=(
            'Page token provided by a response to a previous query request.'
            ' Send the provided `previous_page_token` or `next_page_token`'
            ' to retrieve the previous or next page, respectively.'
            ' If unset, retrieve the first page.'
            ' If the literal string `last` is provided,'
            ' retrieve the last page.'
            # TODO: when `filter` field is added, explain that the filter can't
            # change if you want to use a page token.
            # AIP-158 says it's unnecesary to document that tokens expire
        ),
    ),
]

QueryItemsMeta = Meta(
    title='Items', description='Array of objects representing the query results'
)

PrevPageToken = Annotated[
    str,
    Meta(
        title='Previous Page Token',
        description=(
            'If this field is not present in the response, then there are no'
            ' more resources in the previous direction'
        ),
        examples=[
            'gAAAAAAfhbuQ0bR_0dE7aMS8-P8qlPiRA2jMRWg1dwAMv3tzSfAF0Bfl1IDGKi'
            '_ke-4fj8BqiwqGRh8magXsSoCitmbg3QduvrQ023y3x7cU_boraJM8AA2d8kYt'
            'uHMOLdh4XqX9AwsL'
        ],
    ),
]

NextPageToken = Annotated[
    str,
    Meta(
        title='Next Page Token',
        description=(
            'If this field is not present in the response, then there are no'
            ' more resources in the next direction'
        ),
        examples=[
            'gAAAAAAfhbuQWaxDAF08IyXCZENV1Z0H0aDRlO5NV3_ELyBvO0oSCPqzRPPSR1'
            'Igq_2zABwGu0fdou5NYMBO2wmvlFIuAv9aWVEfzlvH2t9ECisLNmr-6opTnzuk'
            '9gI3kUh1Fzg9UFkW'
        ],
    ),
]
