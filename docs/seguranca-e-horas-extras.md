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
