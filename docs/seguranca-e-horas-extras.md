# Seguranca de marcacao e horas extras

## Decisao para o MVP

Nao vamos iniciar com FaceID ou reconhecimento facial automatico.

Para um estabelecimento pequeno, a protecao inicial sera:

- tablet fixo na loja;
- codigo do funcionario;
- PIN individual;
- foto no momento da marcacao;
- dispositivo identificado como "Tablet loja";
- marcacoes sem foto ou com foto duvidosa ficam para revisao;
- gestor confirma as marcacoes antes do fechamento mensal.

Esta abordagem reduz troca de PIN sem entrar imediatamente em biometria automatizada.

## Por que evitar biometria no inicio

Reconhecimento facial e outros sistemas biometricos tratam dados sensiveis. A CNPD indica que, no contexto laboral, o tratamento pode ser admitido para controlo de assiduidade, mas exige requisitos especificos, uso de templates nao reversiveis, garantias adequadas e, em certas situacoes, avaliacao de impacto.

Para o MVP, foto de conferencia e menos complexa: nao identifica automaticamente a pessoa; apenas permite ao gestor verificar se a marcacao parece coerente.

## Foto apenas na entrada

Para reduzir armazenamento e atrito operacional:

- a foto e obrigatoria apenas na `entrada`;
- `inicio_pausa`, `fim_pausa` e `saida` usam codigo, PIN e validacao de local;
- o gestor pode rever a foto de entrada quando houver duvida.

Isto reduz cerca de 75% do volume de fotos em relacao a fotografar todas as quatro marcacoes do dia.

## Validacao por rede da loja

O navegador nao permite ler diretamente o nome do Wi-Fi por privacidade. A alternativa mais simples e validar o IP publico da loja.

Variavel opcional:

```text
ALLOWED_CLOCK_IPS=111.222.333.444
```

Se houver mais de um IP:

```text
ALLOWED_CLOCK_IPS=111.222.333.444,555.666.777.888
```

Se a variavel ficar vazia, o app nao bloqueia por IP.

Observacao: essa regra funciona melhor se a internet da loja tiver IP fixo. Se o IP mudar com frequencia, podemos evoluir para QR dinamico.

## Regra inicial de horas extras e banco de horas

Regra simples para teste:

```text
Horas liquidas do dia = saida - entrada - pausas
Horas extras do dia = max(0, horas liquidas - 8h)
```

As horas extras devem aparecer separadas das horas normais e entrar como credito no banco de horas, depois da revisao do gestor.

## Banco de horas

Cada funcionario passa a ter uma conta corrente de horas:

```text
Saldo do banco =
creditos de horas extras
- horas pagas
- horas abatidas em folga
+/- ajustes manuais aprovados
```

Tipos de movimento:

- `credito_extra`: hora extra aprovada e acumulada.
- `pagamento`: hora retirada do banco para pagamento a parte.
- `folga`: hora retirada do banco porque o funcionario gozou folga ou saiu mais cedo.
- `ajuste`: correcao manual com justificativa.

Exemplos:

```text
Funcionario fez 1h30 extra
=> banco recebe +1h30

Gestor decide pagar 1h
=> banco recebe -1h como pagamento

Funcionario sai 30 min mais cedo numa folga excepcional
=> banco recebe -0h30 como folga
```

## Fechamento mensal

Antes de pagar horas extras:

- conferir marcacoes incompletas;
- conferir marcacoes para rever;
- validar fotos das marcacoes suspeitas;
- corrigir horarios com justificativa;
- aprovar ou recusar creditos de horas extras;
- decidir se o saldo sera mantido, pago ou abatido em folga;
- exportar relatorio mensal.

## Evolucao futura

Se depois for realmente necessario reconhecimento facial/biometria:

- fazer avaliacao de impacto;
- usar fornecedor que gere template nao reversivel;
- nao guardar imagem facial como dado biometrico reutilizavel;
- documentar finalidade, prazo de retencao e acesso;
- garantir alternativa em caso de falha tecnica ou impossibilidade de uso.
