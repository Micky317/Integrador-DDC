import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Importaciones modulares
from src.middleware.analytics import AnalyticsMiddleware
from src.api.api import api_router

load_dotenv()

app = FastAPI(
    title="DDC Pasitos Firmes API",
    description="Sistema Integrado de Rehabilitación para Displasia de Cadera",
    version="2.1.0"
)

# 1. Configuración de Middlewares (Senior Mode)
app.add_middleware(AnalyticsMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Inclusión de Rutas Modulares
app.include_router(api_router)

@app.get("/", tags=["Salud"])
async def health_check():
    return {
        "status": "online", 
        "project": "Pasitos Firmes DDC",
        "version": "2.1.0"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=True)
