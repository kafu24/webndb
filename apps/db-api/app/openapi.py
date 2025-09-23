from litestar.openapi import OpenAPIConfig
from litestar.openapi.plugins import SwaggerRenderPlugin

openapi_config = OpenAPIConfig(
    title='WebNDB API',
    summary='HTTP API to interact with the WebNDB database',
    description=(
        # fmt: off
        """OpenAPI document: [openapi.json](/schema/openapi.json)

## Introduction

This document describes the HTTP API to interact with the
Web Novel Database (WebNDB).

### Pagination

Query `GET` operations support pagination through the `max_page_size` and
`page_token` query parameters.
If the `GET` request's response has a `prev_page_token` or a `next_page_token`,
then that value can be used to go to the next page in
the previous or next direction, respectively.

## Contact

Issue tracker: [https://github.com/250MHz/webndb/issues][1]

[1]: https://github.com/250MHz/webndb/issues
"""
        # fmt: on
    ),
    # `version` is the version of the OpenAPI Document, not the version of the
    # API being described.
    version='0.1.0',
    security=None,  # TODO
    render_plugins=[SwaggerRenderPlugin('latest', path='/')],
)
