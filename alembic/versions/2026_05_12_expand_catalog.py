"""expand vehicle catalog with classic cars and Outro option

Revision ID: 3c4d5e6f7a8b
Revises: 2b3c4d5e6f7a
Create Date: 2026-05-12 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

revision: str = "3c4d5e6f7a8b"
down_revision: Union[str, None] = "2b3c4d5e6f7a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adiciona "Outro" em cores
    op.execute(
        "INSERT INTO vehicle_color (name) VALUES ('Outro') "
        "ON CONFLICT (name) DO NOTHING"
    )

    # Adiciona modelos clássicos e "Outro"
    op.execute(
        "INSERT INTO vehicle_model (name) VALUES "
        # Clássicos VW
        "('Fusca'), ('Brasília'), ('Kombi'), ('Variant'), ('TL'), "
        "('Santana'), ('Quantum'), ('Parati'), ('Passat'), "
        # Clássicos Chevrolet/GM
        "('Opala'), ('Chevette'), ('Kadett'), ('Monza'), ('Vectra'), "
        "('Astra'), ('Zafira'), ('Omega'), ('Blazer'), ('Caravan'), "
        # Clássicos Ford
        "('Escort'), ('Del Rey'), ('Pampa'), ('Belina'), ('Maverick'), "
        "('Corcel'), ('Verona'), ('Galaxie'), "
        # Clássicos Fiat
        "('147'), ('Premio'), ('Elba'), ('Spazio'), ('Fiorino'), "
        "('Tempra'), ('Tipo'), ('Brava'), ('Marea'), ('Stilo'), "
        "('Bravo'), ('Linea'), "
        # Clássicos Volkswagen adicionais
        "('Logus'), ('Apollo'), ('Gol Quadrado'), "
        # Motos Honda adicionais
        "('CB 300'), ('CB 500'), ('CB 600'), ('CB 1000'), "
        "('NXR Bros'), ('Titan 160'), ('Pop 110'), ('PCX 150'), "
        "('ADV 150'), ('Hornet'), "
        # Motos Yamaha adicionais
        "('MT-03'), ('MT-07'), ('MT-09'), ('Lander'), ('Tenere'), "
        "('R3'), ('R6'), "
        # Motos Kawasaki
        "('Ninja 300'), ('Ninja 400'), ('Ninja 650'), ('Z400'), ('Versys'), "
        # Motos Honda clássicas
        "('CB 125'), ('CG 125'), ('CG 150'), "
        # SUVs e picapes adicionais
        "('Duster Oroch'), ('Spin'), ('Captiva'), ('Trailblazer'), "
        "('Equinox'), ('Trax'), ('Bolt'), "
        "('Bronco Sport'), ('Territory'), ('Maverick Pick'), "
        "('Freemont'), ('Toro'), "
        # Sedãs e hatches adicionais
        "('Cruze Sport6'), ('Onix RS'), ('HB20 X'), "
        "('208 GT'), ('2008 GT'), ('Fastback Audace'), "
        # Importados populares
        "('Civic SI'), ('Accord'), ('City Hatch'), "
        "('Corolla GR-S'), ('Yaris Sedan'), ('Hilux SW4'), "
        "('Tiguan'), ('Jetta'), ('Amarok V6'), "
        "('Fiat 500'), "
        # Elétricos / híbridos
        "('BYD Dolphin'), ('BYD Seal'), ('BYD Tan'), ('BYD Song'), "
        "('GWM Ora'), ('Haval H6'), "
        "('Volvo XC40'), ('Volvo XC60'), "
        # Opção genérica
        "('Outro') "
        "ON CONFLICT (name) DO NOTHING"
    )


def downgrade() -> None:
    op.execute("DELETE FROM vehicle_color WHERE name = 'Outro'")
    op.execute(
        "DELETE FROM vehicle_model WHERE name IN ("
        "'Fusca','Brasília','Kombi','Variant','TL',"
        "'Santana','Quantum','Parati','Passat',"
        "'Opala','Chevette','Kadett','Monza','Vectra',"
        "'Astra','Zafira','Omega','Blazer','Caravan',"
        "'Escort','Del Rey','Pampa','Belina','Maverick',"
        "'Corcel','Verona','Galaxie',"
        "'147','Premio','Elba','Spazio','Fiorino',"
        "'Tempra','Tipo','Brava','Marea','Stilo',"
        "'Bravo','Linea',"
        "'Logus','Apollo','Gol Quadrado',"
        "'CB 300','CB 500','CB 600','CB 1000',"
        "'NXR Bros','Titan 160','Pop 110','PCX 150',"
        "'ADV 150','Hornet',"
        "'MT-03','MT-07','MT-09','Lander','Tenere',"
        "'R3','R6',"
        "'Ninja 300','Ninja 400','Ninja 650','Z400','Versys',"
        "'CB 125','CG 125','CG 150',"
        "'Duster Oroch','Spin','Captiva','Trailblazer',"
        "'Equinox','Trax','Bolt',"
        "'Bronco Sport','Territory','Maverick Pick',"
        "'Freemont','Toro',"
        "'Cruze Sport6','Onix RS','HB20 X',"
        "'208 GT','2008 GT','Fastback Audace',"
        "'Civic SI','Accord','City Hatch',"
        "'Corolla GR-S','Yaris Sedan','Hilux SW4',"
        "'Tiguan','Jetta','Amarok V6',"
        "'Fiat 500',"
        "'BYD Dolphin','BYD Seal','BYD Tan','BYD Song',"
        "'GWM Ora','Haval H6',"
        "'Volvo XC40','Volvo XC60',"
        "'Outro'"
        ")"
    )
