"""Main FastAPI application entry point for VoiceStress."""

from __future__ import annotations

from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.errors import (
    AudioValidationError,
    ModelNotReadyError,
    audio_validation_exception_handler,
    generic_exception_handler,
    model_not_ready_exception_handler,
)
from backend.app.api.routes import router
from backend.app.model.classifier import get_classifier

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("voicestress")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan event to warm up ML model on startup."""
    logger.info("Initializing VoiceStress ML models...")
    try:
        classifier = get_classifier()
        logger.info(
            "VoiceStress ML classifier loaded successfully. Classes: %s",
            classifier.classes,
        )
    except Exception as e:
        logger.warning(
            "Could not load ML artifacts on startup: %s. Will retry on first request.",
            e,
        )
    yield
    logger.info("VoiceStress service shutting down.")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="VoiceStress API",
        version="1.0.0",
        description=(
            "Voice Stress Analysis research API. Positioned strictly as an entertainment "
            "and preliminary vocal acoustics research tool, NOT a lie detector."
        ),
        lifespan=lifespan,
    )

    # CORS configuration to allow local Vite frontend and live preview domains
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register custom exception handlers
    app.add_exception_handler(AudioValidationError, audio_validation_exception_handler)
    app.add_exception_handler(ModelNotReadyError, model_not_ready_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # Register API routes
    app.include_router(router)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
