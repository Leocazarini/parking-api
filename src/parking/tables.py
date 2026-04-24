from sqlalchemy import TIMESTAMP, Column, ForeignKey, Integer, Numeric, String, Table, Text, func

from src.database import metadata

parking_config = Table(
    "parking_config",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("hourly_rate", Numeric(10, 2), nullable=False, server_default="10.00"),
    Column("daily_rate", Numeric(10, 2), nullable=False, server_default="50.00"),
    Column("tolerance_minutes", Integer, nullable=False, server_default="5"),
)

parking_entry = Table(
    "parking_entry",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("plate", String(8), nullable=False),
    Column("color_id", Integer, ForeignKey("vehicle_color.id"), nullable=False),
    Column("model_id", Integer, ForeignKey("vehicle_model.id"), nullable=True),
    Column("client_type", String(12), nullable=False, server_default="regular"),
    Column("entry_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    Column("exit_at", TIMESTAMP(timezone=True), nullable=True),
    Column("amount_charged", Numeric(10, 2), nullable=True),
    Column("payment_method", String(12), nullable=True),
    Column("operator_id", Integer, ForeignKey("user.id"), nullable=True),
)

config_audit_log = Table(
    "config_audit_log",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("changed_by", Integer, ForeignKey("user.id"), nullable=False),
    Column(
        "changed_at",
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
    ),
    Column("field", String(50), nullable=False),
    Column("old_value", Text, nullable=True),
    Column("new_value", Text, nullable=True),
)
