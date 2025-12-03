from litestar import Router

from .novel.views import novel_router
from .volume.views import volume_router

api_router = Router('/', route_handlers=[novel_router, volume_router])
