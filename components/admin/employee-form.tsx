"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EmployeeForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(formData: FormData) {
    setIsSubmitting(true);
    setMessage("A cadastrar funcionario...");

    const payload = {
      code: formData.get("code"),
      name: formData.get("name"),
      role: formData.get("role"),
      admissionDate: formData.get("admissionDate"),
      weeklyHours: formData.get("weeklyHours"),
      vacationAllowance: formData.get("vacationAllowance"),
      vacationUsed: formData.get("vacationUsed"),
      pin: formData.get("pin")
    };

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Nao foi possivel cadastrar.");
        return;
      }

      setMessage(`Funcionario ${result.employee.name} cadastrado.`);
      setIsOpen(false);
      router.refresh();
    } catch {
      setMessage("Erro de comunicacao ao cadastrar funcionario.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mb-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="focus-ring inline-flex h-11 items-center gap-2 rounded-md bg-ink px-4 font-semibold text-white"
        >
          {isOpen ? <X size={18} /> : <Plus size={18} />}
          {isOpen ? "Fechar cadastro" : "Funcionario"}
        </button>
      </div>

      {isOpen ? (
        <form action={submit} className="mt-4 rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="Codigo" name="code" placeholder="004" required />
            <Field label="Nome" name="name" placeholder="Nome completo" required />
            <Field label="Funcao" name="role" placeholder="Sala, Cozinha..." required />
            <Field label="Admissao" name="admissionDate" type="date" required />
            <Field label="Horas semanais" name="weeklyHours" type="number" defaultValue="40" required />
            <Field label="Ferias anuais" name="vacationAllowance" type="number" defaultValue="22" required />
            <Field label="Ferias ja usadas" name="vacationUsed" type="number" defaultValue="0" required />
            <Field label="PIN inicial" name="pin" type="password" placeholder="4 a 6 digitos" required />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="focus-ring h-11 rounded-md bg-moss px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Guardar funcionario
            </button>
            {message ? <span className="text-sm font-semibold text-moss">{message}</span> : null}
          </div>
        </form>
      ) : message ? (
        <div className="mt-3 rounded-md bg-[#eef6ed] px-3 py-2 text-sm font-semibold text-moss">{message}</div>
      ) : null}
    </section>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  required
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-black/65">
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        className="focus-ring mt-2 h-11 w-full rounded-md border border-black/15 bg-white px-3 text-ink"
      />
    </label>
  );
}
