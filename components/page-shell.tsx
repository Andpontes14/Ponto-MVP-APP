import { Nav } from "./nav";

export function PageShell({
  children,
  title,
  subtitle
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-moss">Seventh Brunch</p>
          <h1 className="mt-2 text-3xl font-bold text-ink md:text-4xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-base text-black/65">{subtitle}</p>
        </header>
        {children}
      </div>
    </main>
  );
}
