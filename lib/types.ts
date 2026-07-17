export type TimeEntryType = "entrada" | "inicio_pausa" | "fim_pausa" | "saida";
export type VacationStatus = "pendente" | "aprovado" | "recusado";
export type VerificationStatus = "pendente" | "confirmado" | "rever";
export type HourBankTransactionType = "credito_extra" | "pagamento" | "folga" | "ajuste";

export type Employee = {
  id: string;
  code: string;
  name: string;
  role: string;
  admissionDate: string;
  weeklyHours: number;
  vacationAllowance: number;
  vacationUsed: number;
  pinHint: string;
  active: boolean;
};

export type TimeEntry = {
  id: string;
  employeeId: string;
  type: TimeEntryType;
  dateTime: string;
  deviceLabel: string;
  photoUrl?: string;
  verificationStatus: VerificationStatus;
  verificationFlags: string[];
  note?: string;
};

export type VacationRequest = {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  businessDays: number;
  status: VacationStatus;
  note?: string;
};

export type HourBankTransaction = {
  id: string;
  employeeId: string;
  type: HourBankTransactionType;
  minutes: number;
  date: string;
  status: "pendente" | "aprovado";
  note: string;
};

export type DailySummary = {
  employeeId: string;
  date: string;
  entrada?: string;
  inicioPausa?: string;
  fimPausa?: string;
  saida?: string;
  workedMinutes: number;
  expectedMinutes: number;
  overtimeMinutes: number;
  verificationStatus: VerificationStatus;
  verificationFlags: string[];
  issue?: string;
};
