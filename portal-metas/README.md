# 🎯 Portal de Metas — Contas a Receber

Portal para gestão de metas de inadimplência da equipe de contas a receber. Registre metas batidas, calcule comissões automaticamente (com multiplicadores por prazo) e consulte valores por funcionário.

---

## 📋 O que o portal faz

- **Registra metas batidas** por unidade (ACJ, ASD, APF, AVP, AVL, AVA, AVS)
- **Calcula comissões automaticamente** para todos os 3 funcionários (Juliana, Nathália, Vinícius)
- **Aplica multiplicadores por prazo** automaticamente:
  - ≤ 40 dias → **125%** da meta
  - ≤ 60 dias → **100%** da meta
  - ≤ 90 dias → **70%** da meta
  - \> 90 dias → **50%** da meta
- **Gestão de pagamentos**: marque como pago/pendente
- **Consulta por funcionário**: cada um vê o que tem a receber

---

## 🚀 Configuração passo a passo

### Passo 1 — Criar conta no Supabase (banco de dados, gratuito)

1. Acesse **https://supabase.com** e clique em **"Start your project"**
2. Crie uma conta com Google ou GitHub
3. Clique em **"New project"**
4. Preencha:
   - **Organization**: crie uma ou use a que aparecer
   - **Name**: `portal-metas` (pode ser qualquer nome)
   - **Database Password**: crie uma senha forte e **anote ela**
   - **Region**: `South America (São Paulo)` — mais rápido para o Brasil
5. Clique em **"Create new project"** e aguarde ~2 minutos

### Passo 2 — Criar as tabelas no Supabase

1. No painel do Supabase, clique em **"SQL Editor"** no menu da esquerda
2. Clique em **"New query"**
3. Abra o arquivo `supabase_schema.sql` deste projeto
4. Copie **todo o conteúdo** do arquivo e cole no editor SQL
5. Clique no botão **"RUN"** (ou pressione Ctrl+Enter)
6. Aguarde — deve aparecer mensagem de sucesso

> ✅ Isso cria todas as tabelas, insere os funcionários, unidades e os valores de comissão da planilha.

### Passo 3 — Pegar as credenciais do Supabase

1. No menu do Supabase, vá em **Settings → API**
2. Copie dois valores:
   - **Project URL** (parece com `https://xyzabc.supabase.co`)
   - **Project API Keys → anon / public** (chave longa)
3. Abra o arquivo `.env.local.example` do projeto
4. Renomeie para `.env.local`
5. Preencha:
```
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

### Passo 4 — Publicar no Vercel (gratuito)

#### Opção A: Pelo GitHub (recomendado)

1. Crie conta em **https://github.com** se não tiver
2. Crie um repositório novo (pode ser privado)
3. Faça upload de todos os arquivos desta pasta para o repositório
   - Clique em **"uploading an existing file"** na página do repositório
   - Selecione todos os arquivos e pastas da pasta `portal-metas`
   - Commit as mudanças
4. Acesse **https://vercel.com** e crie uma conta com o GitHub
5. Clique em **"New Project"**
6. Selecione o repositório que você criou
7. Na tela de configuração, adicione as **variáveis de ambiente**:
   - Clique em **"Environment Variables"**
   - Adicione `NEXT_PUBLIC_SUPABASE_URL` com o valor do Passo 3
   - Adicione `NEXT_PUBLIC_SUPABASE_ANON_KEY` com o valor do Passo 3
8. Clique em **"Deploy"**
9. Aguarde ~2 minutos → seu portal estará online!

#### Opção B: Upload direto pelo Vercel

1. Compacte a pasta `portal-metas` em um arquivo `.zip`
2. Acesse **https://vercel.com/new**
3. Arraste o `.zip` para a área de upload
4. Adicione as variáveis de ambiente conforme acima
5. Deploy!

---

## 🧪 Testar localmente (opcional, para quem tem Node.js)

```bash
# Instalar Node.js em https://nodejs.org (versão LTS)
# Depois, na pasta do projeto:

npm install
cp .env.local.example .env.local
# Edite .env.local com suas credenciais do Supabase

npm run dev
# Abra http://localhost:3000
```

---

## 📊 Estrutura de Comissões (conforme planilha)

| Unidade | Sigla | Responsável | <4% | <3% | <2% |
|---------|-------|-------------|-----|-----|-----|
| Arquimedes - Cidade Jardim | ACJ | Juliana | R$50 | R$100 | R$150 |
| Arquimedes - Santos Dumont | ASD | Juliana | R$50 | R$75 | R$100 |
| Arquimedes - Porto Ferreira | APF | Juliana | R$50 | R$75 | R$100 |
| Avicenna Pirassununga | AVP | Nathália | R$50 | R$75 | R$100 |
| Avicenna Leme | AVL | Nathália | R$85 | R$135 | R$185 |
| Avicenna Araras | AVA | Vinícius | R$50 | R$100 | R$150 |
| Avicenna Sumaré | AVS | Vinícius | R$50 | R$100 | R$150 |

> Todos os funcionários recebem comissão em todas as unidades (valores diferenciados para o responsável vs. não-responsável — conforme planilha).

---

## ❓ Dúvidas frequentes

**Posso alterar os valores de comissão depois?**
Sim! No painel do Supabase, vá em **Table Editor → comissoes** e edite os valores diretamente.

**Como adicionar uma nova unidade?**
No Supabase, acesse **Table Editor → unidades** e adicione uma linha. Depois vá em **comissoes** e adicione os valores para cada funcionário.

**E se eu errar ao registrar uma meta?**
No Supabase, acesse **Table Editor → metas_batidas** e delete o registro. Os pagamentos vinculados serão removidos automaticamente.
