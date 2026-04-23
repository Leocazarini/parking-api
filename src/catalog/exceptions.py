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
