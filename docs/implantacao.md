# Plano de implantacao do MVP

## 1. Criar contas

- GitHub: guardar o codigo.
- Supabase: banco de dados, autenticacao futura e backups.
- Vercel: publicar o aplicativo.

## 2. Preparar Supabase

1. Criar um projeto no Supabase.
2. Abrir SQL Editor.
3. Executar `supabase/schema.sql`.
4. Executar `supabase/seed.sql`.
5. Copiar `Project URL` e `anon public key`.
6. Copiar tambem a `service_role key`.
7. Confirmar que o bucket privado `time-photos` foi criado.

## 3. Preparar o projeto

1. Copiar `.env.example` para `.env.local`.
2. Preencher:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` nunca deve ser exposta no navegador. Ela fica apenas no servidor local ou nas variaveis privadas da Vercel.

3. Instalar dependencias:

```text
npm install
```

4. Rodar localmente:

```text
npm run dev
```

## 4. Publicar no GitHub

1. Criar repositorio `ponto-mvp`.
2. Enviar os arquivos do projeto.
3. Confirmar que `.env.local` nao foi enviado.

## 5. Publicar na Vercel

1. Importar o repositorio do GitHub.
2. Adicionar as variaveis de ambiente do Supabase.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Publicar.
4. Testar no tablet com o endereco da Vercel.

## 6. Validacao inicial

- Testar os tres funcionarios ficticios.
- Confirmar entrada, pausa, retorno e saida.
- Confirmar que uma foto aparece no bucket privado `time-photos`.
- Confirmar que PIN incorreto bloqueia a marcacao.
- Confirmar que a foto da marcacao e exigida no tablet.
- Conferir marcacoes para rever no painel administrativo.
- Verificar o painel diario.
- Verificar pedidos de ferias.
- Verificar horas extras separadas das horas normais.
- Verificar saldo do banco de horas por funcionario.
- Testar os movimentos: pagar horas, manter saldo ou abater com folga.
- Na saida, confirmar que hora extra gera credito pendente no banco de horas.
- Exportar CSV quando a funcao for implementada.

## 7. Antes de usar com funcionarios reais

- Trocar politicas permissivas do Supabase por regras com login/perfis.
- Esconder PINs e validar apenas hash no servidor.
- Definir prazo de retencao das fotos de marcacao.
- Informar que as fotos servem apenas para conferencia de assiduidade.
- Definir quem pode aprovar ferias e corrigir ponto.
- Definir quem pode aprovar creditos e descontos no banco de horas.
- Definir regra interna para pagamento, acumulacao e folga excepcional.
- Documentar a regra interna de registo de ponto.
- Informar os trabalhadores sobre os dados recolhidos.
