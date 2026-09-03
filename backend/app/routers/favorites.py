import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Response

from app import db
from app.auth import get_current_user
from app.models import Favorite, FavoriteCreate, FavoritesResponse

router = APIRouter()


def _to_favorite(row) -> Favorite:
    return Favorite(
        id=row["id"],
        base=row["base_currency"],
        target=row["target_currency"],
        created_at=row["created_at"],
    )


@router.get("/favorites", response_model=FavoritesResponse)
def list_favorites(user_id: str = Depends(get_current_user)) -> FavoritesResponse:
    rows = db.list_favorites(user_id)
    return FavoritesResponse(favorites=[_to_favorite(row) for row in rows])


@router.post("/favorites", response_model=Favorite, status_code=201)
def create_favorite(
    payload: FavoriteCreate, user_id: str = Depends(get_current_user)
) -> Favorite:
    try:
        row = db.insert_favorite(user_id, payload.base.upper(), payload.target.upper())
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="favorite already exists") from exc
    return _to_favorite(row)


@router.delete("/favorites/{favorite_id}", status_code=204)
def remove_favorite(favorite_id: int, user_id: str = Depends(get_current_user)) -> Response:
    row = db.get_favorite(favorite_id)
    if row is None:
        raise HTTPException(status_code=404, detail="not found")
    if row["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="forbidden")
    db.delete_favorite(favorite_id)
    return Response(status_code=204)
