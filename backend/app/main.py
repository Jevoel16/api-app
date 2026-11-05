"""FastAPI entry point. Run from the repo root: uvicorn backend.app.main:app --reload"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.routes import VERSION, router
from core.config import settings
from core.http import UpstreamError


def create_app() -> FastAPI:
    app = FastAPI(title="ITD112 API Integration Backend", version=VERSION)

    # Only the Next.js frontend (another port) calls this API from a browser
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,  # the frontend sends no cookies
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @app.exception_handler(UpstreamError)
    async def upstream_error(_: Request, exc: UpstreamError):
        # The fault is in Open-Meteo/SoilGrids, not the client: 502 Bad Gateway
        return JSONResponse(status_code=502, content={"detail": f"Upstream API error: {exc.message}"})

    app.include_router(router)
    return app


app = create_app()
