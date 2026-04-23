from fastapi import HTTPException, status


class PlateAlreadyActiveError(HTTPException):
    def __init__(self, plate: str) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Placa {plate} já possui entrada ativa",
        )


class EntryNotFoundError(HTTPException):
    def __init__(self, entry_id: int) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entrada {entry_id} não encontrada ou já finalizada",
        )


class ConfigNotFoundError(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuração de estacionamento não encontrada",
        )


class InvalidColorError(HTTPException):
    def __init__(self, color_id: int) -> None:
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Cor com id {color_id} não encontrada",
        )
