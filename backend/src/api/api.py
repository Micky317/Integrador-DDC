from fastapi import APIRouter
from src.api.endpoints import video
from src.api.endpoints import clinical
from src.api.endpoints import xray
from src.api.endpoints import admin

api_router = APIRouter()

# Registro de routers por módulo
api_router.include_router(video.router, tags=["Análisis de Video"])
api_router.include_router(clinical.router, prefix="/clinical", tags=["Datos Clínicos"])
api_router.include_router(xray.router, tags=["Radiografías"])
api_router.include_router(admin.router, prefix="/admin", tags=["Administración"])
