-- ============================================================
-- PORTAL METAS - CONTAS A RECEBER
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- Tabela de funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de unidades
CREATE TABLE IF NOT EXISTS unidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sigla TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de responsabilidades (quem cuida de qual unidade)
CREATE TABLE IF NOT EXISTS responsabilidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES unidades(id) ON DELETE CASCADE,
  UNIQUE(funcionario_id, unidade_id)
);

-- Tabela de valores de comissão por funcionário/unidade/meta
CREATE TABLE IF NOT EXISTS comissoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES unidades(id) ON DELETE CASCADE,
  meta TEXT NOT NULL CHECK (meta IN ('<4%', '<3%', '<2%')),
  valor NUMERIC(10,2) NOT NULL,
  UNIQUE(funcionario_id, unidade_id, meta)
);

-- Tabela de metas batidas (registros)
CREATE TABLE IF NOT EXISTS metas_batidas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unidade_id UUID REFERENCES unidades(id) ON DELETE CASCADE,
  meta TEXT NOT NULL CHECK (meta IN ('<4%', '<3%', '<2%')),
  data_vencimento DATE NOT NULL,  -- todo dia 20
  data_batida DATE NOT NULL,      -- quando a meta foi atingida
  dias_atraso INTEGER GENERATED ALWAYS AS (data_batida - data_vencimento) STORED,
  multiplicador NUMERIC(4,2) GENERATED ALWAYS AS (
    CASE
      WHEN (data_batida - data_vencimento) <= 40 THEN 1.25
      WHEN (data_batida - data_vencimento) <= 60 THEN 1.00
      WHEN (data_batida - data_vencimento) <= 90 THEN 0.70
      ELSE 0.50
    END
  ) STORED,
  observacao TEXT,
  criado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
  meta_batida_id UUID REFERENCES metas_batidas(id) ON DELETE CASCADE,
  valor_base NUMERIC(10,2) NOT NULL,
  valor_com_multiplicador NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  data_pagamento DATE,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(funcionario_id, meta_batida_id)
);

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

-- Inserir funcionários
INSERT INTO funcionarios (nome) VALUES
  ('Juliana'),
  ('Nathália'),
  ('Vinícius')
ON CONFLICT DO NOTHING;

-- Inserir unidades
INSERT INTO unidades (sigla, nome) VALUES
  ('ACJ', 'Arquimedes - Cidade Jardim'),
  ('ASD', 'Arquimedes - Santos Dumont'),
  ('APF', 'Arquimedes - Porto Ferreira'),
  ('AVP', 'Avicenna Pirassununga'),
  ('AVL', 'Avicenna Leme'),
  ('AVA', 'Avicenna Araras'),
  ('AVS', 'Avicenna Sumaré')
ON CONFLICT (sigla) DO NOTHING;

-- Inserir responsabilidades
INSERT INTO responsabilidades (funcionario_id, unidade_id)
SELECT f.id, u.id FROM funcionarios f, unidades u
WHERE (f.nome = 'Juliana' AND u.sigla IN ('ACJ', 'ASD', 'APF'))
   OR (f.nome = 'Nathália' AND u.sigla IN ('AVL', 'AVP'))
   OR (f.nome = 'Vinícius' AND u.sigla IN ('AVA', 'AVS'))
ON CONFLICT DO NOTHING;

-- Inserir comissões conforme planilha
-- Formato: funcionario, unidade, <4%, <3%, <2%
-- ACJ: Juliana=50/100/150 | Nathália=20/40/60 | Vinícius=20/40/60
-- ASD: Juliana=50/75/100  | Nathália=20/40/60 | Vinícius=20/40/60
-- APF: Juliana=50/75/100  | Nathália=20/40/60 | Vinícius=20/40/60
-- AVP: Juliana=20/40/60   | Nathália=50/75/100| Vinícius=20/40/60
-- AVL: Juliana=30/50/70   | Nathália=85/135/185| Vinícius=30/50/70
-- AVA: Juliana=20/40/60   | Nathália=20/40/60 | Vinícius=50/100/150
-- AVS: Juliana=20/40/60   | Nathália=20/40/60 | Vinícius=50/100/150

INSERT INTO comissoes (funcionario_id, unidade_id, meta, valor)
SELECT f.id, u.id, m.meta, m.valor
FROM funcionarios f, unidades u,
(VALUES
  ('Juliana','ACJ','<4%',50),('Juliana','ACJ','<3%',100),('Juliana','ACJ','<2%',150),
  ('Nathália','ACJ','<4%',20),('Nathália','ACJ','<3%',40),('Nathália','ACJ','<2%',60),
  ('Vinícius','ACJ','<4%',20),('Vinícius','ACJ','<3%',40),('Vinícius','ACJ','<2%',60),

  ('Juliana','ASD','<4%',50),('Juliana','ASD','<3%',75),('Juliana','ASD','<2%',100),
  ('Nathália','ASD','<4%',20),('Nathália','ASD','<3%',40),('Nathália','ASD','<2%',60),
  ('Vinícius','ASD','<4%',20),('Vinícius','ASD','<3%',40),('Vinícius','ASD','<2%',60),

  ('Juliana','APF','<4%',50),('Juliana','APF','<3%',75),('Juliana','APF','<2%',100),
  ('Nathália','APF','<4%',20),('Nathália','APF','<3%',40),('Nathália','APF','<2%',60),
  ('Vinícius','APF','<4%',20),('Vinícius','APF','<3%',40),('Vinícius','APF','<2%',60),

  ('Juliana','AVP','<4%',20),('Juliana','AVP','<3%',40),('Juliana','AVP','<2%',60),
  ('Nathália','AVP','<4%',50),('Nathália','AVP','<3%',75),('Nathália','AVP','<2%',100),
  ('Vinícius','AVP','<4%',20),('Vinícius','AVP','<3%',40),('Vinícius','AVP','<2%',60),

  ('Juliana','AVL','<4%',30),('Juliana','AVL','<3%',50),('Juliana','AVL','<2%',70),
  ('Nathália','AVL','<4%',85),('Nathália','AVL','<3%',135),('Nathália','AVL','<2%',185),
  ('Vinícius','AVL','<4%',30),('Vinícius','AVL','<3%',50),('Vinícius','AVL','<2%',70),

  ('Juliana','AVA','<4%',20),('Juliana','AVA','<3%',40),('Juliana','AVA','<2%',60),
  ('Nathália','AVA','<4%',20),('Nathália','AVA','<3%',40),('Nathália','AVA','<2%',60),
  ('Vinícius','AVA','<4%',50),('Vinícius','AVA','<3%',100),('Vinícius','AVA','<2%',150),

  ('Juliana','AVS','<4%',20),('Juliana','AVS','<3%',40),('Juliana','AVS','<2%',60),
  ('Nathália','AVS','<4%',20),('Nathália','AVS','<3%',40),('Nathália','AVS','<2%',60),
  ('Vinícius','AVS','<4%',50),('Vinícius','AVS','<3%',100),('Vinícius','AVS','<2%',150)
) AS m(func_nome, unidade_sigla, meta, valor)
WHERE f.nome = m.func_nome AND u.sigla = m.unidade_sigla
ON CONFLICT DO NOTHING;

-- ============================================================
-- VIEWS ÚTEIS
-- ============================================================

-- View: resumo de pagamentos por funcionário
CREATE OR REPLACE VIEW vw_resumo_pagamentos AS
SELECT
  f.nome AS funcionario,
  u.nome AS unidade,
  mb.meta,
  mb.data_vencimento,
  mb.data_batida,
  mb.dias_atraso,
  mb.multiplicador,
  p.valor_base,
  p.valor_com_multiplicador,
  p.status,
  p.data_pagamento,
  p.id AS pagamento_id
FROM pagamentos p
JOIN funcionarios f ON p.funcionario_id = f.id
JOIN metas_batidas mb ON p.meta_batida_id = mb.id
JOIN unidades u ON mb.unidade_id = u.id
ORDER BY mb.data_batida DESC;

-- ============================================================
-- ROW LEVEL SECURITY (básico - ajuste conforme necessário)
-- ============================================================
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsabilidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_batidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para anon (ajuste para auth se quiser login)
CREATE POLICY "allow_all_funcionarios" ON funcionarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_unidades" ON unidades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_responsabilidades" ON responsabilidades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_comissoes" ON comissoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_metas_batidas" ON metas_batidas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pagamentos" ON pagamentos FOR ALL USING (true) WITH CHECK (true);
