from sqlalchemy import (
    TIMESTAMP,
    Column,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)

from src.database import metadata

subscriber = Table(
    "subscriber",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(255), nullable=False),
    Column("cpf", String(14), nullable=False),
    Column("phone", String(20), nullable=True),
    Column("email", String(255), nullable=True),
    Column("status", String(12), nullable=False, server_default="active"),
    Column("due_day", Integer, nullable=False),
    Column(
        "created_at",
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    ),
    UniqueConstraint("cpf", name="subscriber_cpf_key"),
)

subscriber_vehicle = Table(
    "subscriber_vehicle",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column(
        "subscriber_id",
        Integer,
        ForeignKey("subscriber.id", ondelete="CASCADE"),
        nullable=False,
    ),
    Column("plate", String(8), nullable=False),
    Column("model_id", Integer, ForeignKey("vehicle_model.id"), nullable=True),
    Column("color_id", Integer, ForeignKey("vehicle_color.id"), nullable=True),
    Column(
        "created_at",
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    ),
    UniqueConstraint("plate", name="subscriber_vehicle_plate_key"),
)

subscriber_payment = Table(
    "subscriber_payment",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("subscriber_id", Integer, ForeignKey("subscriber.id"), nullable=False),
    Column("amount", Numeric(10, 2), nullable=False),
    Column("reference_month", Date, nullable=False),
    Column("payment_date", Date, nullable=False),
    Column("payment_method", String(12), nullable=False),
    Column("notes", Text, nullable=True),
    Column(
        "created_at",
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    ),
)
