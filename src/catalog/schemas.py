from pydantic import BaseModel


class CatalogItemCreate(BaseModel):
    name: str


class CatalogItemUpdate(BaseModel):
    name: str


class ColorResponse(BaseModel):
    id: int
    name: str


class ModelResponse(BaseModel):
    id: int
    name: str
