import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import init_db
from app.api import sessions, input_data, risk_score, chat, suggestions, tooltip
from app.rag.pipeline import build_vector_store

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Insurance Risk API...")
    await init_db()
    logger.info("Database initialized")

    if settings.openai_api_key:
        try:
            build_vector_store()
            logger.info("Vector store ready")
        except Exception as e:
            logger.warning(f"Vector store init failed (non-fatal): {e}")
    else:
        logger.warning("No OpenAI API key set — RAG and AI features disabled")

    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Insurance Risk & Pricing API",
    description="AI-powered insurance risk assessment and pricing system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(input_data.router)
app.include_router(risk_score.router)
app.include_router(chat.router)
app.include_router(suggestions.router)
app.include_router(suggestions.router_validate)
app.include_router(tooltip.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
