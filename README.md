# Ponto MVP

Aplicativo simples para registro de ponto e controle de ferias de um pequeno estabelecimento com ate 15 funcionarios.

## Telas do MVP

- `/` Painel diario do gestor.
- `/tablet` Marcacao de entrada, pausa, retorno e saida.
- `/funcionario` Consulta simples do funcionario.
- `/admin` Funcionarios, ferias e exportacao futura.
- `/admin` ja carrega funcionarios, ferias, marcacoes do dia e banco de horas diretamente do Supabase.
- Cadastro real de funcionarios pelo `/admin`, com PIN inicial guardado como hash.
- Foto obrigatoria apenas na entrada para conferencia do gestor.
- Validacao opcional por IP publico da loja.
- Horas extras separadas e acumuladas em banco de horas.
- Opcoes de pagar, manter saldo ou abater com folga excepcional.

## Dados de teste

| Codigo | Funcionario | PIN de teste |
|---|---|---|
| 001 | Maria Silva | 1234 |
| 002 | Joao Costa | 2468 |
| 003 | Ana Martins | 1357 |

## Proximas implementacoes

- Gravar marcacoes reais no Supabase.
- Validar PIN por funcao segura no Supabase.
- Enviar foto da marcacao para storage privado no Supabase.
- Aprovar creditos de horas extras no fechamento mensal.
- Registrar pagamento ou folga como baixa no banco de horas.
- Criar login de gestor.
- Corrigir ponto com historico.
- Exportar relatorio mensal em CSV/XLSX.
- Calcular dias uteis de ferias com feriados.

## Rodar localmente

```text
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Variaveis Supabase

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ALLOWED_CLOCK_IPS=
```

A chave `service_role` e usada apenas pela rota interna `/api/time-entry` para validar PIN, enviar foto ao bucket privado e gravar a marcacao.

`ALLOWED_CLOCK_IPS` e opcional. Se preenchida, a marcacao so funciona nos IPs indicados.
