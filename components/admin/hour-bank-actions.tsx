import { Check, Clock, CreditCard, Umbrella, X } from "lucide-react";
import { createHourBankDebit, decideHourBankTransaction } from "@/app/admin/actions";

type TransactionType = "credito_extra" | "pagamento" | "folga" | "ajuste";
type TransactionStatus = "pendente" | "aprovado" | "recusado";

export function HourBankActions({
  transactionId,
  employeeId,
  type,
  status,
  minutes,
  balanceMinutes
}: {
  transactionId: string;
  employeeId: string;
  employeeName: string;
  type: TransactionType;
  status: TransactionStatus;
  minutes: number;
  balanceMinutes: number;
}) {
  if (status === "pendente") {
    return (
      <div className="flex flex-wrap gap-2">
        <DecisionForm action="aprovar" icon={Check} label="Aprovar" tone="primary" transactionId={transactionId} />
        <DecisionForm action="recusar" icon={X} label="Recusar" transactionId={transactionId} />
      </div>
    );
  }

  if (status === "aprovado" && type === "credito_extra" && minutes > 0 && balanceMinutes > 0) {
    return (
      <details className="group">
        <summary className="focus-ring inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-black/15 bg-white px-3 text-sm font-semibold text-ink">
          <CreditCard size={15} />
          Baixar
        </summary>
        <div className="mt-2 grid min-w-[260px] gap-2 rounded-md border border-black/10 bg-white p-3 shadow-sm">
          <DebitForm employeeId={employeeId} icon={CreditCard} label="Pagar" type="pagamento" />
          <DebitForm employeeId={employeeId} icon={Umbrella} label="Folga" type="folga" />
        </div>
      </details>
    );
  }

  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-md bg-oat px-3 text-sm font-semibold text-black/55">
      <Clock size={15} />
      Sem acao
    </span>
  );
}

function DecisionForm({
  action,
  icon: Icon,
  label,
  tone = "neutral",
  transactionId
}: {
  action: "aprovar" | "recusar";
  icon: typeof Check;
  label: string;
  tone?: "primary" | "neutral";
  transactionId: string;
}) {
  return (
    <form action={decideHourBankTransaction}>
      <input type="hidden" name="transactionId" value={transactionId} />
      <input type="hidden" name="action" value={action} />
      <button
        type="submit"
        className={`focus-ring inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold ${
          tone === "primary" ? "bg-moss text-white" : "border border-black/15 bg-white text-ink"
        }`}
      >
        <Icon size={15} />
        {label}
      </button>
    </form>
  );
}

function DebitForm({
  employeeId,
  icon: Icon,
  label,
  type
}: {
  employeeId: string;
  icon: typeof CreditCard;
  label: string;
  type: "pagamento" | "folga";
}) {
  return (
    <form action={createHourBankDebit} className="grid gap-2">
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="type" value={type} />
      <label className="text-xs font-semibold uppercase text-black/55">
        Horas
        <input
          name="hours"
          type="number"
          min="0.25"
          step="0.25"
          required
          className="mt-1 h-9 w-full rounded-md border border-black/15 px-2 text-sm"
          placeholder="Ex: 1.5"
        />
      </label>
      <label className="text-xs font-semibold uppercase text-black/55">
        Observacao
        <input
          name="note"
          required
          className="mt-1 h-9 w-full rounded-md border border-black/15 px-2 text-sm"
          placeholder={type === "pagamento" ? "Pagamento de horas extras" : "Folga excepcional"}
        />
      </label>
      <button
        type="submit"
        className="focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-md bg-moss px-3 text-sm font-semibold text-white"
      >
        <Icon size={15} />
        {label}
      </button>
    </form>
  );
}
