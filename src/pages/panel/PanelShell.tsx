import { NavLink, Outlet } from "react-router-dom";
import { Container, Notice } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { api, isDemo, type Role } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Itens do painel por papel (briefing, seção 8). */
export const PANEL_ITEMS: { to: string; label: string; roles: Role[]; professional?: boolean }[] = [
  { to: "/painel", label: "Agenda", roles: ["staff", "admin", "medical_director"] },
  { to: "/painel/horarios", label: "Meus horários", roles: ["doctor", "medical_director"], professional: true },
  { to: "/painel/medico", label: "Agenda e atendimento", roles: ["doctor", "medical_director"], professional: true },
  { to: "/painel/ativos", label: "Minha biblioteca", roles: ["doctor", "medical_director"], professional: true },
  { to: "/painel/profissionais", label: "Profissionais e horários", roles: ["admin", "staff"] },
  { to: "/painel/precos", label: "Linhas e preços", roles: ["admin"] },
  { to: "/painel/triagem", label: "Triagem (versões)", roles: ["medical_director"] },
  { to: "/painel/relatorios", label: "Relatórios", roles: ["staff", "admin", "medical_director"] },
  { to: "/painel/acessos", label: "Acessos", roles: ["admin"] },
];

function DemoRoleSwitcher() {
  const { profile, refreshProfile } = useAuth();
  if (!isDemo || !api.demoSetRole) return null;
  const roles: Role[] = ["patient", "staff", "doctor", "medical_director", "admin"];
  return (
    <div className="mb-6">
      <Notice tone="info" title="Demonstração: trocar papel">
        <div className="mt-2 flex flex-wrap gap-2">
          {roles.map((r) => (
            <button
              key={r}
              onClick={async () => {
                await api.demoSetRole!(r);
                await refreshProfile();
              }}
              className={cn("rounded-full border px-3 py-1 text-sm", profile?.role === r ? "border-primary bg-primary text-primary-ink" : "border-border bg-surface")}
            >
              {r}
            </button>
          ))}
        </div>
      </Notice>
    </div>
  );
}

export default function PanelShell() {
  const { profile, professional } = useAuth();
  const items = PANEL_ITEMS.filter((i) => (profile && i.roles.includes(profile.role)) || (i.professional && professional));
  return (
    <Container className="py-10">
      <DemoRoleSwitcher />
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Painel" className="flex gap-1 overflow-x-auto lg:flex-col">
          <p className="hidden px-3 pb-2 text-sm text-muted lg:block">
            {professional ? `${professional.full_name.split(" ")[0]} · ${professional.council} ${professional.council_number}/${professional.council_uf}` : `Painel · ${profile?.role}`}
          </p>
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end
              className={({ isActive }) => cn("shrink-0 rounded-lg px-3 py-2 text-[15px] no-underline", isActive ? "bg-primary-soft text-primary" : "text-ink/80 hover:bg-border/40")}
            >
              {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </Container>
  );
}
