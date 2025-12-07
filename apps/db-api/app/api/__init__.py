from litestar import Router

from .novel.views import novel_router
from .staff.views import staff_router
from .volume.views import volume_router

api_router = Router('/', route_handlers=[novel_router, staff_router, volume_router])
