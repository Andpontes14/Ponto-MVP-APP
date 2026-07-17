import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "success";
  icon: LucideIcon;
};

export function StatCard({ label, value, tone = "neutral", icon: Icon }: StatCardProps) {
  const toneClasses = {
    neutral: "border-black/10 bg-white",
    warning: "border-gold/40 bg-[#fff7e7]",
    success: "border-moss/25 bg-[#eef6ed]"
  };

  return (
    <section className={`rounded-lg border p-4 shadow-sm ${toneClasses[tone]}`}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-ink text-white">
        <Icon size={19} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-black/65">{label}</div>
    </section>
  );
}
