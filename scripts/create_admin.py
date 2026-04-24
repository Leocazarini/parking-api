#!/usr/bin/env python3
"""Cria o primeiro usuário admin no banco de dados.

Uso:
    python scripts/create_admin.py
    python scripts/create_admin.py --username admin --email admin@example.com --password senha123
"""
import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


async def main(username: str, email: str, password: str) -> None:
    from sqlalchemy import select

    from src.auth.service import hash_password
    from src.auth.tables import user_table
    from src.database import engine

    async with engine.begin() as conn:
        existing = await conn.execute(
            select(user_table).where(user_table.c.username == username)
        )
        if existing.first():
            print(f"Erro: usuário '{username}' já existe.")
            sys.exit(1)

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
    parser = argparse.ArgumentParser(description="Cria usuário admin")
    parser.add_argument("--username", default="admin")
    parser.add_argument("--email", default="admin@parking.local")
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    asyncio.run(main(args.username, args.email, args.password))
