from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import init_firebase
from app.config import CORS_ORIGINS
from app.db import init_schema
from app.routers import budget, chat, convert, currencies, favorites, history, trend


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_schema()
    init_firebase()
    yield


app = FastAPI(title="Currency Converter API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(currencies.router, prefix="/api")
app.include_router(convert.router, prefix="/api")
app.include_router(trend.router, prefix="/api")
app.include_router(favorites.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(budget.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
