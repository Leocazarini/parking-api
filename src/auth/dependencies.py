from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncConnection

from src.auth.exceptions import ForbiddenError, InactiveUserError, InvalidTokenError
from src.auth.service import decode_token, get_user_by_id
from src.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    conn: AsyncConnection = Depends(get_db),
) -> dict:
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise InvalidTokenError()
    user = await get_user_by_id(conn, int(payload["sub"]))
    if not user:
        raise InvalidTokenError()
    if not user["is_active"]:
        raise InactiveUserError()
    return user


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "admin":
        raise ForbiddenError()
    return current_user


async def require_operator_or_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] not in ("admin", "operator"):
        raise ForbiddenError()
    return current_user
