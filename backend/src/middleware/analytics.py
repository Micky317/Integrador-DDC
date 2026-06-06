import time
from starlette.middleware.base import BaseHTTPMiddleware
from src.analytics_service import analytics

class AnalyticsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start_time = time.time()
        
        # Procesar la petición
        response = await call_next(request)
        
        # Calcular latencia
        process_time = (time.time() - start_time) * 1000
        
        # Registrar en InfluxDB (sin bloquear la respuesta)
        try:
            analytics.log_system_metrics(
                endpoint=request.url.path,
                latency_ms=process_time,
                status_code=response.status_code
            )
        except Exception as e:
            print(f"⚠️ Error en AnalyticsMiddleware: {e}")
            
        response.headers["X-Process-Time"] = str(process_time)
        return response
