#!/usr/bin/env python3
"""Cria o primeiro usuário admin no banco de dados.

As variáveis FIRST_ADMIN_USERNAME, FIRST_ADMIN_EMAIL e FIRST_ADMIN_PASSWORD
devem estar definidas no arquivo .env na raiz do projeto.

Se já houver qualquer usuário cadastrado, o script encerra sem fazer nada
(comportamento esperado nas reinicializações do container).

Uso:
    python scripts/create_admin.py
"""
import asyncio
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def load_admin_config() -> tuple[str, str, str]:
    from pydantic import Field
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class AdminBootstrapSettings(BaseSettings):
        FIRST_ADMIN_USERNAME: str = Field(default="admin")
        FIRST_ADMIN_EMAIL: str = Field(default="admin@parking.local")
        FIRST_ADMIN_PASSWORD: str = Field(...)

        model_config = SettingsConfigDict(
            env_file=str(PROJECT_ROOT / ".env"),
            extra="ignore",
        )

    try:
        cfg = AdminBootstrapSettings()  # type: ignore[call-arg]
    except Exception:
        print(
            "Erro: FIRST_ADMIN_PASSWORD não encontrada no .env.\n"
            "Adicione ao .env:\n"
            "  FIRST_ADMIN_PASSWORD=sua_senha_aqui"
        )
        sys.exit(1)

    return cfg.FIRST_ADMIN_USERNAME, cfg.FIRST_ADMIN_EMAIL, cfg.FIRST_ADMIN_PASSWORD


async def main() -> None:
    from sqlalchemy import func, select

    from src.auth.service import hash_password
    from src.auth.tables import user_table
    from src.database import engine

    async with engine.begin() as conn:
        result = await conn.execute(select(func.count()).select_from(user_table))
        if result.scalar() > 0:
            print("Bootstrap: sistema já possui usuários cadastrados. Nada a fazer.")
            return

    username, email, password = load_admin_config()

    async with engine.begin() as conn:
        await conn.execute(
            user_table.insert().values(
                username=username,
                email=email,
                hashed_password=hash_password(password),
                role="admin",
                is_active=True,
            )
        )

    print(f"Admin '{username}' criado com sucesso.")


if __name__ == "__main__":
    asyncio.run(main())
