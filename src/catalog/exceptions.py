from fastapi import HTTPException, status


class ColorNotFoundError(HTTPException):
    def __init__(self, color_id: int) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cor com id {color_id} não encontrada",
        )


class ModelNotFoundError(HTTPException):
    def __init__(self, model_id: int) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Modelo com id {model_id} não encontrado",
        )


class ColorInUseError(HTTPException):
    def __init__(self, color_id: int) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cor {color_id} está em uso e não pode ser removida",
        )


class ModelInUseError(HTTPException):
    def __init__(self, model_id: int) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Modelo {model_id} está em uso e não pode ser removido",
        )


class DuplicateColorError(HTTPException):
    def __init__(self, name: str) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cor '{name}' já cadastrada",
        )


class DuplicateModelError(HTTPException):
    def __init__(self, name: str) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Modelo '{name}' já cadastrado",
        )
