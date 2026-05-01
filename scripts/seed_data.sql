-- =============================================================
-- SEED: Dados realistas para o sistema de estacionamento
-- Data de referência: Abril de 2026
-- Maringá - PR
-- =============================================================

BEGIN;

-- -----------------------------------------------------------
-- 1. Limpeza dos dados de clientes (mantém catálogos e config)
-- -----------------------------------------------------------
TRUNCATE TABLE subscriber_payment, subscriber_vehicle, parking_entry
    RESTART IDENTITY CASCADE;
DELETE FROM subscriber;
ALTER SEQUENCE subscriber_id_seq RESTART WITH 1;

-- -----------------------------------------------------------
-- 2. Mensalistas
-- -----------------------------------------------------------
-- status: 'active' | 'overdue'
-- is_active: true = cadastro ativo, false = cancelou mensalidade
INSERT INTO subscriber
    (name, cpf, phone, email, status, is_active, due_day,
     zip_code, street, number, complement, neighborhood, city, state)
VALUES
-- 1. Ativo - pagou Jan a Abr/2026
('Carlos Eduardo Ferreira', '34521678901', '(44) 99812-3456',
 'carlos.ferreira@gmail.com', 'active', true, 5,
 '87013-010', 'Av. Brasil', '1240', 'Apto 302', 'Centro', 'Maringá', 'PR'),

-- 2. Ativo - pagou Jan a Abr/2026
('Mariana Santos Lima', '56734210983', '(44) 99723-4567',
 'mariana.lima@hotmail.com', 'active', true, 10,
 '87020-190', 'Rua Joubert de Carvalho', '567', NULL, 'Zona 7', 'Maringá', 'PR'),

-- 3. Inadimplente - não pagou Abr/2026 (venc. dia 5)
('Roberto Alves Costa', '78345612034', '(44) 98812-9876',
 'roberto.costa@gmail.com', 'overdue', true, 5,
 '87025-380', 'Rua Santos Dumont', '890', 'Casa', 'Zona 3', 'Maringá', 'PR'),

-- 4. Ativo - pagou Jan a Abr/2026
('Fernanda Oliveira Melo', '23145698701', '(44) 99645-3210',
 'fernanda.melo@outlook.com', 'active', true, 15,
 '87030-200', 'Rua José Emílio Murta', '234', 'Sala 5', 'Zona 5', 'Maringá', 'PR'),

-- 5. Ativo - pagou Jan a Abr/2026
('João Pedro Carvalho', '91234567803', '(44) 99512-6789',
 'joao.carvalho@gmail.com', 'active', true, 10,
 '87015-460', 'Av. Cerro Azul', '1785', NULL, 'Zona 2', 'Maringá', 'PR'),

-- 6. Ativo - pagou Jan a Abr/2026
('Luciana Rodrigues Pereira', '45678901234', '(44) 99834-5678',
 'luciana.pereira@gmail.com', 'active', true, 5,
 '87013-500', 'Rua Castro Alves', '322', 'Apto 101', 'Centro', 'Maringá', 'PR'),

-- 7. Inadimplente - não pagou Abr/2026 (venc. dia 1)
('Thiago Mendes Souza', '67890123456', '(44) 98923-4567',
 'thiago.souza@hotmail.com', 'overdue', true, 1,
 '87040-110', 'Rua Pio XII', '89', NULL, 'Zona 6', 'Maringá', 'PR'),

-- 8. Ativo - entrou em Fev, pagou Fev a Abr/2026
('Ana Paula Vieira', '12309856734', '(44) 99712-3456',
 'anapaula.vieira@gmail.com', 'active', true, 20,
 '87023-710', 'Rua Pioneiro Luiz Pereira', '450', 'Apto 204', 'Zona 4', 'Maringá', 'PR'),

-- 9. Ativo - pagou Jan a Abr/2026
('Beatriz Cunha Nascimento', '34567890123', '(44) 99923-4501',
 'beatriz.nascimento@gmail.com', 'active', true, 10,
 '87010-900', 'Av. Mandacarú', '987', NULL, 'Zona 2', 'Maringá', 'PR'),

-- 10. Ativo - pagou Jan a Abr/2026
('Eduardo Torres Martins', '56789012345', '(44) 98834-5670',
 'eduardo.martins@outlook.com', 'active', true, 15,
 '87050-320', 'Rua Sebastião Abreu', '1102', 'Casa', 'Jardim Alvorada', 'Maringá', 'PR'),

-- 11. Inadimplente grave - não pagou Mar e Abr/2026 (venc. dia 5)
('Patrícia Lima Araújo', '89012345678', '(44) 99612-0987',
 'patricia.araujo@gmail.com', 'overdue', true, 5,
 '87016-430', 'Rua Josefina Saviani', '78', 'Apto 12', 'Zona 2', 'Maringá', 'PR'),

-- 12. Ativo - pagou Jan a Abr/2026
('Felipe Dias Gomes', '01234567890', '(44) 99723-4501',
 'felipe.gomes@gmail.com', 'active', true, 25,
 '87035-740', 'Rua Dep. Heitor de Alencar', '345', NULL, 'Jardim Universitário', 'Maringá', 'PR'),

-- 13. Inativo - cancelou mensalidade em Fev/2026
('André Luiz Barbosa', '23456789012', '(44) 98712-3400',
 'andre.barbosa@gmail.com', 'active', false, 10,
 '87013-210', 'Av. Duque de Caxias', '650', NULL, 'Centro', 'Maringá', 'PR');


-- -----------------------------------------------------------
-- 3. Veículos dos mensalistas
--    Cores: 2=Azul, 5=Branco, 8=Cinza, 11=Grafite, 16=Prata, 17=Preto, 22=Vermelho
--    Modelos: 6=Argo, 14=Civic, 17=Compass, 18=Corolla, 21=Creta, 37=Gol,
--             38=Golf, 39=HB20, 40=HB20S, 53=Onix, 54=Onix Plus, 60=Polo,
--             67=Sandero, 72=Strada, 74=T-Cross, 76=Tracker, 78=Uno, 81=Virtus
-- -----------------------------------------------------------
INSERT INTO subscriber_vehicle (subscriber_id, plate, model_id, color_id) VALUES
-- Carlos (1): Corolla Prata + Creta Branco
(1, 'AZB3C45', 18, 16),
(1, 'BCF4D56', 21, 5),
-- Mariana (2): HB20 Vermelho
(2, 'PQR5678', 39, 22),
-- Roberto (3): Onix Cinza
(3, 'DEF7B89', 53, 8),
-- Fernanda (4): Polo Preto + T-Cross Prata
(4, 'GHI8A90', 60, 17),
(4, 'HIL9B01', 74, 16),
-- João Pedro (5): Compass Grafite
(5, 'IJM0C12', 17, 11),
-- Luciana (6): Virtus Branco
(6, 'JKN1D23', 81, 5),
-- Thiago (7): Gol Vermelho
(7, 'KLO2E34', 37, 22),
-- Ana Paula (8): Tracker Azul
(8, 'LMP3F45', 76, 2),
-- Beatriz (9): Argo Branco + HB20S Preto
(9, 'MNQ4A56', 6, 5),
(9, 'NOR5B67', 40, 17),
-- Eduardo (10): Corolla Grafite
(10, 'OPS6C78', 18, 11),
-- Patrícia (11): Sandero Prata
(11, 'PQT7D89', 67, 16),
-- Felipe (12): Onix Plus Cinza + Strada Branco
(12, 'QRU8E90', 54, 8),
(12, 'RSV9F01', 72, 5),
-- André (13): Golf Preto
(13, 'STW0A12', 38, 17);


-- -----------------------------------------------------------
-- 4. Pagamentos dos mensalistas (mensalidade R$ 250,00)
-- -----------------------------------------------------------
INSERT INTO subscriber_payment
    (subscriber_id, amount, reference_month, payment_date, payment_method, notes)
VALUES
-- Carlos (1): Jan–Abr
(1, 250.00, '2026-01-01', '2026-01-04', 'pix',      NULL),
(1, 250.00, '2026-02-01', '2026-02-04', 'pix',      NULL),
(1, 250.00, '2026-03-01', '2026-03-05', 'pix',      NULL),
(1, 250.00, '2026-04-01', '2026-04-04', 'pix',      NULL),
-- Mariana (2): Jan–Abr
(2, 250.00, '2026-01-01', '2026-01-09', 'dinheiro', NULL),
(2, 250.00, '2026-02-01', '2026-02-08', 'dinheiro', NULL),
(2, 250.00, '2026-03-01', '2026-03-10', 'dinheiro', NULL),
(2, 250.00, '2026-04-01', '2026-04-10', 'dinheiro', NULL),
-- Roberto (3): Jan–Mar (inadimplente em Abr)
(3, 250.00, '2026-01-01', '2026-01-04', 'credito',  NULL),
(3, 250.00, '2026-02-01', '2026-02-05', 'credito',  NULL),
(3, 250.00, '2026-03-01', '2026-03-03', 'credito',  NULL),
-- Fernanda (4): Jan–Abr
(4, 250.00, '2026-01-01', '2026-01-14', 'debito',   NULL),
(4, 250.00, '2026-02-01', '2026-02-14', 'debito',   NULL),
(4, 250.00, '2026-03-01', '2026-03-14', 'debito',   NULL),
(4, 250.00, '2026-04-01', '2026-04-15', 'debito',   NULL),
-- João Pedro (5): Jan–Abr
(5, 250.00, '2026-01-01', '2026-01-09', 'pix',      NULL),
(5, 250.00, '2026-02-01', '2026-02-07', 'pix',      NULL),
(5, 250.00, '2026-03-01', '2026-03-10', 'pix',      NULL),
(5, 250.00, '2026-04-01', '2026-04-09', 'pix',      NULL),
-- Luciana (6): Jan–Abr
(6, 250.00, '2026-01-01', '2026-01-03', 'pix',      NULL),
(6, 250.00, '2026-02-01', '2026-02-03', 'pix',      NULL),
(6, 250.00, '2026-03-01', '2026-03-04', 'pix',      NULL),
(6, 250.00, '2026-04-01', '2026-04-03', 'pix',      NULL),
-- Thiago (7): Jan–Mar (inadimplente em Abr)
(7, 250.00, '2026-01-01', '2026-01-02', 'dinheiro', NULL),
(7, 250.00, '2026-02-01', '2026-02-03', 'dinheiro', NULL),
(7, 250.00, '2026-03-01', '2026-03-01', 'dinheiro', NULL),
-- Ana Paula (8): Fev–Abr (começou em Fev)
(8, 250.00, '2026-02-01', '2026-02-19', 'pix',      'Início da mensalidade'),
(8, 250.00, '2026-03-01', '2026-03-20', 'pix',      NULL),
(8, 250.00, '2026-04-01', '2026-04-19', 'pix',      NULL),
-- Beatriz (9): Jan–Abr
(9, 250.00, '2026-01-01', '2026-01-10', 'credito',  NULL),
(9, 250.00, '2026-02-01', '2026-02-09', 'credito',  NULL),
(9, 250.00, '2026-03-01', '2026-03-10', 'credito',  NULL),
(9, 250.00, '2026-04-01', '2026-04-08', 'credito',  NULL),
-- Eduardo (10): Jan–Abr
(10, 250.00, '2026-01-01', '2026-01-14', 'pix',     NULL),
(10, 250.00, '2026-02-01', '2026-02-14', 'pix',     NULL),
(10, 250.00, '2026-03-01', '2026-03-15', 'pix',     NULL),
(10, 250.00, '2026-04-01', '2026-04-15', 'pix',     NULL),
-- Patrícia (11): Jan–Fev (inadimplente em Mar e Abr)
(11, 250.00, '2026-01-01', '2026-01-04', 'dinheiro', NULL),
(11, 250.00, '2026-02-01', '2026-02-05', 'dinheiro', NULL),
-- Felipe (12): Jan–Abr
(12, 250.00, '2026-01-01', '2026-01-24', 'debito',   NULL),
(12, 250.00, '2026-02-01', '2026-02-25', 'debito',   NULL),
(12, 250.00, '2026-03-01', '2026-03-25', 'debito',   NULL),
(12, 250.00, '2026-04-01', '2026-04-25', 'debito',   NULL),
-- André (13): Jan–Fev (cancelou após Fev)
(13, 250.00, '2026-01-01', '2026-01-09', 'pix',      NULL),
(13, 250.00, '2026-02-01', '2026-02-09', 'pix',      'Último mês — cancelamento da mensalidade');


-- -----------------------------------------------------------
-- 5. Entradas de estacionamento
--    client_type: 'regular' | 'subscriber'
--    Tarifas regulares: R$10/h — diária máx. R$50
--    Mensalistas: amount_charged = 0.00 (incluído na mensalidade)
--    Timestamps em horário de Brasília (UTC-3)
-- -----------------------------------------------------------
INSERT INTO parking_entry
    (plate, color_id, model_id, client_type, entry_at, exit_at, amount_charged, payment_method)
VALUES

-- ====== JANEIRO 2026 ======

-- 06/Jan (Ter)
('ABC1234', 17, 53, 'regular', '2026-01-06 08:12:00-03', '2026-01-06 09:45:00-03', 15.00, 'pix'),
('QWE5678', 5,  39, 'regular', '2026-01-06 09:05:00-03', '2026-01-06 11:20:00-03', 25.00, 'dinheiro'),
('AZB3C45', 16, 18, 'subscriber', '2026-01-06 08:30:00-03', '2026-01-06 18:00:00-03', 0.00, NULL),

-- 07/Jan (Qua)
('RTY6789', 8,  37, 'regular', '2026-01-07 10:30:00-03', '2026-01-07 12:00:00-03', 15.00, 'credito'),
('JKN1D23', 5,  81, 'subscriber', '2026-01-07 07:50:00-03', '2026-01-07 17:45:00-03', 0.00, NULL),
('ZXC2345', 22, 78, 'regular', '2026-01-07 14:00:00-03', '2026-01-07 14:35:00-03', 10.00, 'dinheiro'),

-- 08/Jan (Qui)
('VBN3456', 16, 60, 'regular', '2026-01-08 08:00:00-03', '2026-01-08 12:30:00-03', 45.00, 'debito'),
('PQR5678', 22, 39, 'subscriber', '2026-01-08 09:00:00-03', '2026-01-08 17:30:00-03', 0.00, NULL),
('MNB4567', 11, 21, 'regular', '2026-01-08 11:15:00-03', '2026-01-08 13:00:00-03', 20.00, 'pix'),

-- 09/Jan (Sex)
('KJH5678', 5,  76, 'regular', '2026-01-09 07:45:00-03', '2026-01-09 09:00:00-03', 15.00, 'pix'),
('IJM0C12', 11, 17, 'subscriber', '2026-01-09 08:00:00-03', '2026-01-09 18:00:00-03', 0.00, NULL),
('FGH6789', 8,  53, 'regular', '2026-01-09 13:00:00-03', '2026-01-09 15:30:00-03', 25.00, 'dinheiro'),
('DSA7890', 17, 18, 'regular', '2026-01-09 16:00:00-03', '2026-01-09 17:45:00-03', 20.00, 'credito'),

-- 13/Jan (Ter)
('POI8901', 16, 67, 'regular', '2026-01-13 09:30:00-03', '2026-01-13 10:15:00-03', 10.00, 'pix'),
('MNQ4A56', 5,  6,  'subscriber', '2026-01-13 08:15:00-03', '2026-01-13 17:50:00-03', 0.00, NULL),
('LKJ9012', 2,  74, 'regular', '2026-01-13 12:00:00-03', '2026-01-13 14:00:00-03', 20.00, 'debito'),

-- 14/Jan (Qua)
('GFD0123', 22, 37, 'regular', '2026-01-14 08:45:00-03', '2026-01-14 10:00:00-03', 15.00, 'pix'),
('BCF4D56', 5,  21, 'subscriber', '2026-01-14 08:00:00-03', '2026-01-14 12:00:00-03', 0.00, NULL),
('TYU1234', 17, 54, 'regular', '2026-01-14 14:30:00-03', '2026-01-14 17:00:00-03', 25.00, 'dinheiro'),

-- 15/Jan (Qui)
('WER2345', 11, 18, 'regular', '2026-01-15 07:30:00-03', '2026-01-15 17:30:00-03', 50.00, 'credito'),
('OPS6C78', 11, 18, 'subscriber', '2026-01-15 08:00:00-03', '2026-01-15 18:00:00-03', 0.00, NULL),
('IOP3456', 5,  39, 'regular', '2026-01-15 10:00:00-03', '2026-01-15 11:30:00-03', 15.00, 'pix'),

-- 20/Jan (Ter)
('UYT4567', 8,  53, 'regular', '2026-01-20 09:00:00-03', '2026-01-20 11:00:00-03', 20.00, 'pix'),
('KLO2E34', 22, 37, 'subscriber', '2026-01-20 07:45:00-03', '2026-01-20 17:45:00-03', 0.00, NULL),
('HGF5678', 16, 81, 'regular', '2026-01-20 13:00:00-03', '2026-01-20 14:00:00-03', 10.00, 'dinheiro'),

-- 21/Jan (Qua)
('NMB6789', 17, 60, 'regular', '2026-01-21 08:20:00-03', '2026-01-21 10:50:00-03', 25.00, 'debito'),
('QRU8E90', 8,  54, 'subscriber', '2026-01-21 08:00:00-03', '2026-01-21 18:00:03', 0.00, NULL),
('BVC7890', 2,  21, 'regular', '2026-01-21 16:00:00-03', '2026-01-21 18:00:00-03', 20.00, 'pix'),

-- 27/Jan (Ter)
('XZA8901', 22, 37, 'regular', '2026-01-27 09:15:00-03', '2026-01-27 10:30:00-03', 15.00, 'dinheiro'),
('DEF7B89', 8,  53, 'subscriber', '2026-01-27 07:55:00-03', '2026-01-27 17:55:00-03', 0.00, NULL),
('CVB9012', 5,  78, 'regular', '2026-01-27 11:00:00-03', '2026-01-27 13:30:00-03', 25.00, 'credito'),


-- ====== FEVEREIRO 2026 ======

-- 03/Fev (Ter)
('SAQ0123', 16, 39, 'regular', '2026-02-03 08:00:00-03', '2026-02-03 10:00:00-03', 20.00, 'pix'),
('AZB3C45', 16, 18, 'subscriber', '2026-02-03 08:30:00-03', '2026-02-03 12:30:00-03', 0.00, NULL),
('WQA1234', 17, 17, 'regular', '2026-02-03 13:00:00-03', '2026-02-03 15:00:00-03', 20.00, 'debito'),

-- 04/Fev (Qua)
('ERT2345', 8,  21, 'regular', '2026-02-04 09:30:00-03', '2026-02-04 11:45:00-03', 25.00, 'pix'),
('PQR5678', 22, 39, 'subscriber', '2026-02-04 08:00:00-03', '2026-02-04 18:00:00-03', 0.00, NULL),
('DFG3456', 11, 76, 'regular', '2026-02-04 14:00:00-03', '2026-02-04 16:30:00-03', 25.00, 'dinheiro'),

-- 05/Fev (Qui)
('HJK4567', 5,  54, 'regular', '2026-02-05 07:50:00-03', '2026-02-05 09:00:00-03', 15.00, 'pix'),
('GHI8A90', 17, 60, 'subscriber', '2026-02-05 08:00:00-03', '2026-02-05 18:00:00-03', 0.00, NULL),
('POL5678', 16, 67, 'regular', '2026-02-05 11:30:00-03', '2026-02-05 13:30:00-03', 20.00, 'credito'),

-- 10/Fev (Ter) - pré-carnaval
('ZXS6789', 22, 37, 'regular', '2026-02-10 10:00:00-03', '2026-02-10 11:00:00-03', 10.00, 'dinheiro'),
('NOR5B67', 17, 40, 'subscriber', '2026-02-10 08:00:00-03', '2026-02-10 17:45:00-03', 0.00, NULL),
('MKI7890', 2,  53, 'regular', '2026-02-10 14:00:00-03', '2026-02-10 17:00:00-03', 30.00, 'pix'),

-- 11/Fev (Qua) - pré-carnaval
('JHG8901', 8,  18, 'regular', '2026-02-11 09:00:00-03', '2026-02-11 11:00:00-03', 20.00, 'debito'),
('RSV9F01', 5,  72, 'subscriber', '2026-02-11 07:30:00-03', '2026-02-11 12:00:00-03', 0.00, NULL),
('FDS9012', 17, 81, 'regular', '2026-02-11 13:30:00-03', '2026-02-11 14:30:00-03', 10.00, 'pix'),

-- 24/Fev (Ter) - pós-carnaval
('CVX0123', 16, 39, 'regular', '2026-02-24 08:15:00-03', '2026-02-24 10:15:00-03', 20.00, 'pix'),
('IJM0C12', 11, 17, 'subscriber', '2026-02-24 08:00:00-03', '2026-02-24 18:00:00-03', 0.00, NULL),
('BNM1234', 5,  60, 'regular', '2026-02-24 12:00:00-03', '2026-02-24 14:30:00-03', 25.00, 'credito'),

-- 25/Fev (Qua)
('PLK2345', 11, 21, 'regular', '2026-02-25 09:45:00-03', '2026-02-25 12:45:00-03', 30.00, 'pix'),
('JKN1D23', 5,  81, 'subscriber', '2026-02-25 07:55:00-03', '2026-02-25 18:05:00-03', 0.00, NULL),
('OKI3456', 22, 37, 'regular', '2026-02-25 15:00:00-03', '2026-02-25 17:30:00-03', 25.00, 'dinheiro'),

-- 26/Fev (Qui)
('MJU4567', 8,  76, 'regular', '2026-02-26 08:30:00-03', '2026-02-26 10:30:00-03', 20.00, 'debito'),
('LMP3F45', 2,  76, 'subscriber', '2026-02-26 08:00:00-03', '2026-02-26 18:00:00-03', 0.00, NULL),
('NHY5678', 16, 54, 'regular', '2026-02-26 11:00:00-03', '2026-02-26 13:00:00-03', 20.00, 'pix'),


-- ====== MARÇO 2026 ======

-- 02/Mar (Seg)
('BGT6789', 5,  39, 'regular', '2026-03-02 08:00:00-03', '2026-03-02 09:30:00-03', 15.00, 'pix'),
('MNQ4A56', 5,  6,  'subscriber', '2026-03-02 08:15:00-03', '2026-03-02 17:45:00-03', 0.00, NULL),
('VFR7890', 17, 18, 'regular', '2026-03-02 12:00:00-03', '2026-03-02 14:00:00-03', 20.00, 'credito'),

-- 03/Mar (Ter)
('CDW8901', 22, 37, 'regular', '2026-03-03 09:00:00-03', '2026-03-03 10:00:00-03', 10.00, 'dinheiro'),
('AZB3C45', 16, 18, 'subscriber', '2026-03-03 08:00:00-03', '2026-03-03 17:30:00-03', 0.00, NULL),
('XSQ9012', 11, 74, 'regular', '2026-03-03 14:30:00-03', '2026-03-03 17:30:00-03', 30.00, 'pix'),

-- 04/Mar (Qua)
('ZAQ0123', 8,  53, 'regular', '2026-03-04 07:45:00-03', '2026-03-04 08:45:00-03', 10.00, 'pix'),
('PQT7D89', 16, 67, 'subscriber', '2026-03-04 08:00:00-03', '2026-03-04 18:00:00-03', 0.00, NULL),
('WSX1234', 5,  81, 'regular', '2026-03-04 10:00:00-03', '2026-03-04 12:30:00-03', 25.00, 'debito'),

-- 10/Mar (Ter)
('EDC2345', 16, 60, 'regular', '2026-03-10 08:30:00-03', '2026-03-10 10:30:00-03', 20.00, 'pix'),
('BCF4D56', 5,  21, 'subscriber', '2026-03-10 07:50:00-03', '2026-03-10 12:00:00-03', 0.00, NULL),
('RFV3456', 2,  39, 'regular', '2026-03-10 13:00:00-03', '2026-03-10 15:00:00-03', 20.00, 'dinheiro'),
('TGB4567', 17, 17, 'regular', '2026-03-10 16:00:00-03', '2026-03-10 18:30:00-03', 25.00, 'credito'),

-- 11/Mar (Qua)
('YHN5678', 8,  54, 'regular', '2026-03-11 09:15:00-03', '2026-03-11 11:15:00-03', 20.00, 'pix'),
('OPS6C78', 11, 18, 'subscriber', '2026-03-11 08:00:00-03', '2026-03-11 18:00:00-03', 0.00, NULL),
('UJM6789', 22, 37, 'regular', '2026-03-11 12:30:00-03', '2026-03-11 14:00:00-03', 15.00, 'dinheiro'),

-- 17/Mar (Ter)
('IKO7890', 5,  78, 'regular', '2026-03-17 07:30:00-03', '2026-03-17 08:30:00-03', 10.00, 'pix'),
('KLO2E34', 22, 37, 'subscriber', '2026-03-17 08:00:00-03', '2026-03-17 17:55:00-03', 0.00, NULL),
('OLP8901', 16, 21, 'regular', '2026-03-17 10:00:00-03', '2026-03-17 13:00:00-03', 30.00, 'debito'),
('PLO9012', 17, 74, 'regular', '2026-03-17 14:00:00-03', '2026-03-17 16:00:00-03', 20.00, 'pix'),

-- 18/Mar (Qua)
('KJO0123', 11, 53, 'regular', '2026-03-18 08:45:00-03', '2026-03-18 10:00:00-03', 15.00, 'pix'),
('DEF7B89', 8,  53, 'subscriber', '2026-03-18 07:45:00-03', '2026-03-18 18:00:00-03', 0.00, NULL),
('JOK1234', 5,  39, 'regular', '2026-03-18 13:00:00-03', '2026-03-18 14:30:00-03', 15.00, 'credito'),

-- 24/Mar (Ter)
('HOK2345', 22, 81, 'regular', '2026-03-24 09:00:00-03', '2026-03-24 10:30:00-03', 15.00, 'dinheiro'),
('HIL9B01', 16, 74, 'subscriber', '2026-03-24 08:00:00-03', '2026-03-24 18:00:00-03', 0.00, NULL),
('GOL3456', 8,  37, 'regular', '2026-03-24 12:00:00-03', '2026-03-24 17:00:00-03', 50.00, 'debito'),

-- 25/Mar (Qua)
('FKO4567', 5,  60, 'regular', '2026-03-25 08:15:00-03', '2026-03-25 09:45:00-03', 15.00, 'pix'),
('QRU8E90', 8,  54, 'subscriber', '2026-03-25 08:00:00-03', '2026-03-25 18:00:00-03', 0.00, NULL),
('EJO5678', 17, 18, 'regular', '2026-03-25 13:30:00-03', '2026-03-25 15:30:00-03', 20.00, 'pix'),


-- ====== ABRIL 2026 ======

-- 01/Abr (Qua)
('DIO6789', 16, 76, 'regular', '2026-04-01 08:00:00-03', '2026-04-01 10:00:00-03', 20.00, 'pix'),
('MNQ4A56', 5,  6,  'subscriber', '2026-04-01 08:15:00-03', '2026-04-01 17:50:00-03', 0.00, NULL),
('CKO7890', 11, 17, 'regular', '2026-04-01 11:00:00-03', '2026-04-01 13:00:00-03', 20.00, 'dinheiro'),

-- 02/Abr (Qui)
('BJO8901', 5,  39, 'regular', '2026-04-02 09:00:00-03', '2026-04-02 10:30:00-03', 15.00, 'pix'),
('AZB3C45', 16, 18, 'subscriber', '2026-04-02 08:00:00-03', '2026-04-02 17:45:00-03', 0.00, NULL),
('AJO9012', 22, 53, 'regular', '2026-04-02 14:00:00-03', '2026-04-02 16:00:00-03', 20.00, 'credito'),

-- 07/Abr (Ter)
('ZIO0123', 8,  81, 'regular', '2026-04-07 08:30:00-03', '2026-04-07 09:30:00-03', 10.00, 'pix'),
('PQR5678', 22, 39, 'subscriber', '2026-04-07 08:00:00-03', '2026-04-07 18:00:00-03', 0.00, NULL),
('YIO1234', 16, 54, 'regular', '2026-04-07 10:00:00-03', '2026-04-07 12:00:00-03', 20.00, 'debito'),
('XIO2345', 17, 60, 'regular', '2026-04-07 13:30:00-03', '2026-04-07 15:00:00-03', 15.00, 'pix'),

-- 08/Abr (Qua)
('WIO3456', 5,  18, 'regular', '2026-04-08 07:50:00-03', '2026-04-08 09:50:00-03', 20.00, 'pix'),
('GHI8A90', 17, 60, 'subscriber', '2026-04-08 08:00:00-03', '2026-04-08 18:00:00-03', 0.00, NULL),
('VIO4567', 22, 37, 'regular', '2026-04-08 12:00:00-03', '2026-04-08 14:30:00-03', 25.00, 'dinheiro'),

-- 09/Abr (Qui)
('UIO5678', 11, 21, 'regular', '2026-04-09 09:00:00-03', '2026-04-09 11:00:00-03', 20.00, 'pix'),
('IJM0C12', 11, 17, 'subscriber', '2026-04-09 08:00:00-03', '2026-04-09 18:00:00-03', 0.00, NULL),
('TIO6789', 8,  76, 'regular', '2026-04-09 13:00:00-03', '2026-04-09 14:30:00-03', 15.00, 'credito'),

-- 14/Abr (Ter)
('SIO7890', 16, 39, 'regular', '2026-04-14 08:15:00-03', '2026-04-14 09:45:00-03', 15.00, 'pix'),
('NOR5B67', 17, 40, 'subscriber', '2026-04-14 08:00:00-03', '2026-04-14 17:55:00-03', 0.00, NULL),
('RIO8901', 5,  67, 'regular', '2026-04-14 11:30:00-03', '2026-04-14 13:30:00-03', 20.00, 'debito'),

-- 15/Abr (Qua)
('QIO9012', 17, 17, 'regular', '2026-04-15 08:00:00-03', '2026-04-15 12:00:00-03', 40.00, 'credito'),
('JKN1D23', 5,  81, 'subscriber', '2026-04-15 07:50:00-03', '2026-04-15 17:50:00-03', 0.00, NULL),
('PIO0123', 11, 54, 'regular', '2026-04-15 13:00:00-03', '2026-04-15 15:30:00-03', 25.00, 'pix'),

-- 22/Abr (Qua)
('OIO1234', 22, 53, 'regular', '2026-04-22 09:30:00-03', '2026-04-22 11:00:00-03', 15.00, 'dinheiro'),
('LMP3F45', 2,  76, 'subscriber', '2026-04-22 08:00:00-03', '2026-04-22 18:00:00-03', 0.00, NULL),
('NIO2345', 8,  39, 'regular', '2026-04-22 12:00:00-03', '2026-04-22 14:30:00-03', 25.00, 'pix'),
('MIO3456', 5,  81, 'regular', '2026-04-22 16:00:00-03', '2026-04-22 18:00:00-03', 20.00, 'debito'),

-- 23/Abr (Qui)
('LIO4567', 16, 60, 'regular', '2026-04-23 08:00:00-03', '2026-04-23 10:00:00-03', 20.00, 'pix'),
('OPS6C78', 11, 18, 'subscriber', '2026-04-23 08:00:00-03', '2026-04-23 18:00:00-03', 0.00, NULL),
('KIO5678', 17, 37, 'regular', '2026-04-23 11:00:00-03', '2026-04-23 13:00:00-03', 20.00, 'credito'),

-- 24/Abr (Sex)
('JIO6789', 5,  74, 'regular', '2026-04-24 09:00:00-03', '2026-04-24 11:30:00-03', 25.00, 'pix'),
('RSV9F01', 5,  72, 'subscriber', '2026-04-24 07:45:00-03', '2026-04-24 17:45:00-03', 0.00, NULL),
('IIO7890', 22, 53, 'regular', '2026-04-24 13:00:00-03', '2026-04-24 14:00:00-03', 10.00, 'dinheiro'),
('HIO8901', 11, 18, 'regular', '2026-04-24 15:00:00-03', '2026-04-24 17:30:00-03', 25.00, 'pix'),

-- 25/Abr (Sáb)
('GIO9012', 8,  21, 'regular', '2026-04-25 09:00:00-03', '2026-04-25 11:00:00-03', 20.00, 'dinheiro'),
('FIO0123', 16, 39, 'regular', '2026-04-25 10:30:00-03', '2026-04-25 12:30:00-03', 20.00, 'pix'),
('EIO1234', 5,  60, 'regular', '2026-04-25 14:00:00-03', '2026-04-25 16:00:00-03', 20.00, 'credito'),

-- 27/Abr (hoje — entradas em aberto usam NOW() para sempre ficarem no passado)
('DIO2345', 17, 76, 'regular', NOW() - INTERVAL '80 minutes',  NOW() - INTERVAL '5 minutes',  15.00, 'pix'),
('BCF4D56', 5,  21, 'subscriber', NOW() - INTERVAL '98 minutes',  NULL, NULL, NULL),
('KLO2E34', 22, 37, 'subscriber', NOW() - INTERVAL '118 minutes', NULL, NULL, NULL),
('CIO3456', 5,  54, 'regular', NOW() - INTERVAL '150 minutes', NOW() - INTERVAL '60 minutes', 15.00, 'dinheiro'),
('BIO4567', 22, 53, 'regular', NOW() - INTERVAL '208 minutes', NULL, NULL, NULL),
('AIO5678', 8,  18, 'regular', NOW() - INTERVAL '250 minutes', NOW() - INTERVAL '160 minutes', 15.00, 'pix'),
('ZZO6789', 16, 21, 'regular', NOW() - INTERVAL '328 minutes', NULL, NULL, NULL),
('YYO7890', 17, 39, 'regular', NOW() - INTERVAL '390 minutes', NOW() - INTERVAL '300 minutes', 15.00, 'credito');


COMMIT;
