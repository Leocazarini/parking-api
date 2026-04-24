from fastapi import HTTPException, status


class SubscriberNotFoundError(HTTPException):
    def __init__(self, subscriber_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mensalista {subscriber_id} não encontrado",
        )


class VehicleNotFoundError(HTTPException):
    def __init__(self, vehicle_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Veículo {vehicle_id} não encontrado",
        )


class DuplicateCPFError(HTTPException):
    def __init__(self, cpf: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"CPF {cpf} já cadastrado",
        )


class DuplicatePlateError(HTTPException):
    def __init__(self, plate: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Placa {plate} já cadastrada como veículo de mensalista",
        )
