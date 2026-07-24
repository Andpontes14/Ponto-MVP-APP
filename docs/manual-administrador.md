# Manual do Administrador

## Acesso

1. Abra o sistema.
2. Entre na pagina `/admin`.
3. Informe o usuario e senha de administrador quando o navegador pedir.

## Painel diario

Na pagina inicial, acompanhe:

- funcionarios ativos;
- quem esta presente;
- jornadas fechadas;
- ferias pendentes;
- horas extras do dia;
- saldo acumulado do banco de horas.

Use este painel para conferir rapidamente se o dia esta normal.

## Cadastro de funcionarios

Na pagina `/admin`:

1. Clique em `Funcionario`.
2. Preencha codigo, nome, funcao, admissao, horas semanais, ferias e PIN.
3. Salve o cadastro.

Use codigos de 3 a 6 digitos e PIN de 4 a 6 digitos.

## Desativar funcionario

Use `Desativar` quando o funcionario nao deve mais marcar ponto, mas o historico deve continuar guardado.

Evite apagar funcionarios reais. Para funcionarios reais, o recomendado e desativar.

## Conferir ponto

Na area `Revisao de ponto e horas extras hoje`, confira:

- horas liquidas;
- horas extras;
- validacao da foto;
- observacoes de erro.

Se houver erro de marcacao, ajuste manualmente no Supabase ou registre a correcao administrativa conforme o processo interno.

## Ferias

Na area `Pedidos de ferias`:

1. Veja os pedidos pendentes.
2. Clique em `Aprovar` ou `Recusar`.
3. O funcionario conseguira ver o status na pagina dele.

## Banco de horas

Na area `Movimentos do banco de horas`:

- horas extras entram como credito;
- folgas e pagamentos entram como desconto;
- movimentos pendentes precisam de aprovacao.

Quando aprovar pagamento ou folga, o saldo aprovado do banco sera atualizado.

## Relatorio mensal

Clique em `Exportar CSV` para baixar o relatorio mensal.

O arquivo pode ser aberto no Excel e usado para conferencia de ponto, horas liquidas e horas extras.

## Rotina recomendada

Diariamente:

1. Verificar o painel diario.
2. Conferir marcacoes incompletas.
3. Conferir horas extras geradas.

Semanalmente:

1. Rever banco de horas.
2. Aprovar ou recusar pedidos pendentes.

Mensalmente:

1. Exportar CSV.
2. Conferir o espelho de ponto.
3. Fechar pagamentos ou folgas do banco de horas.
