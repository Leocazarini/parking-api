from fastapi import HTTPException, status


class UserNotFoundError(HTTPException):
    def __init__(self, user_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuário {user_id} não encontrado",
        )


class DuplicateUsernameError(HTTPException):
    def __init__(self, username: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{username}' já cadastrado",
        )


class DuplicateEmailError(HTTPException):
    def __init__(self, email: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{email}' já cadastrado",
        )
