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

### Querying

TODO: add guidance on how to use query parameters for query endpoints

## Contact

Issue tracker: [https://github.com/kafu24/webndb/issues][1]

[1]: https://github.com/kafu24/webndb/issues
"""
        # fmt: on
    ),
    # `version` is the version of the OpenAPI Document, not the version of the
    # API being described.
    version='0.1.0',
    security=None,  # TODO
    render_plugins=[SwaggerRenderPlugin('latest', path='/')],
)
