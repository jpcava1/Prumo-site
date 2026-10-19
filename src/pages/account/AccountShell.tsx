import { NavLink, Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Container } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/minha-conta", label: "Consultas", end: true },
  { to: "/minha-conta/documentos", label: "Documentos" },
  { to: "/minha-conta/pagamentos", label: "Pagamentos" },
  { to: "/minha-conta/dados", label: "Meus dados" },
  { to: "/minha-conta/ajuda", label: "Ajuda" },
];

export default function AccountShell() {
  const { profile, signOut } = useAuth();
  const staff = profile && profile.role !== "patient";
  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Minha conta</p>
          <h1 className="text-3xl font-semibold">{profile?.full_name ? `Olá, ${profile.full_name.split(" ")[0]}` : "Olá"}</h1>
        </div>
        <div className="flex items-center gap-4">
          {staff && (
            <NavLink to="/painel" className="text-sm font-medium">
              Ir para o painel
            </NavLink>
          )}
          <button onClick={signOut} className="flex items-center gap-1 text-sm text-muted hover:text-primary">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </div>
      <nav className="-mx-4 mt-6 overflow-x-auto px-4" aria-label="Seções da conta">
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn("shrink-0 border-b-2 px-4 py-3 text-[15px] no-underline", isActive ? "border-primary text-primary" : "border-transparent text-ink/70 hover:text-ink")
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="mt-8">
        <Outlet />
      </div>
    </Container>
  );
}
