from litestar import Router

from .web_novel.views import web_novel_router

api_router = Router('/', route_handlers=[web_novel_router])
