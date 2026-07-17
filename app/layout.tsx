import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ponto MVP",
  description: "Registro de ponto e ferias para pequeno estabelecimento"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>{children}</body>
    </html>
  );
}
