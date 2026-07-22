"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard, TabletSmartphone, UserRound } from "lucide-react";

const managerLinks = [
  { href: "/", label: "Painel", icon: LayoutDashboard },
  { href: "/tablet", label: "Tablet", icon: TabletSmartphone },
  { href: "/funcionario", label: "Funcionario", icon: UserRound },
  { href: "/admin", label: "Admin", icon: ClipboardList }
];

const employeeLinks = [
  { href: "/tablet", label: "Tablet", icon: TabletSmartphone },
  { href: "/funcionario", label: "Funcionario", icon: UserRound }
];

export function Nav() {
  const pathname = usePathname();
  const links = pathname.startsWith("/tablet") || pathname.startsWith("/funcionario") ? employeeLinks : managerLinks;

  return (
    <nav className="flex flex-wrap items-center gap-2 border-b border-black/10 bg-white/80 px-4 py-3 backdrop-blur">
      <div className="mr-4 text-lg font-bold text-ink">Ponto MVP</div>
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="focus-ring inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-sage"
        >
          <Icon size={17} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
