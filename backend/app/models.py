from typing import Literal

from pydantic import BaseModel


class Currency(BaseModel):
    code: str
    name: str


class CurrenciesResponse(BaseModel):
    currencies: list[Currency]


class ConvertResponse(BaseModel):
    base: str
    target: str
    amount: float
    rate: float
    result: float
    source: Literal["cache", "db", "api"]
    timestamp: str


class TrendPoint(BaseModel):
    date: str
    rate: float


class TrendResponse(BaseModel):
    base: str
    target: str
    points: list[TrendPoint]


class Favorite(BaseModel):
    id: int
    base: str
    target: str
    created_at: str


class FavoritesResponse(BaseModel):
    favorites: list[Favorite]


class FavoriteCreate(BaseModel):
    base: str
    target: str


class HistoryEntry(BaseModel):
    base: str
    target: str
    amount: float
    result: float
    created_at: str


class HistoryResponse(BaseModel):
    history: list[HistoryEntry]


class BudgetRequest(BaseModel):
    base: str
    amount: float


class BudgetResult(BaseModel):
    currency: str
    rate: float
    converted: float


class BudgetResponse(BaseModel):
    base: str
    amount: float
    results: list[BudgetResult]
