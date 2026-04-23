from pydantic import BaseModel


class ColorResponse(BaseModel):
    id: int
    name: str


class ModelResponse(BaseModel):
    id: int
    name: str
