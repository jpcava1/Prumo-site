import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/lib/api";
import { Container, Notice, Spinner } from "./ui";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!profile || !roles.includes(profile.role)) {
    return (
      <Container className="py-16">
        <Notice tone="warning" title="Acesso restrito">
          Esta área é só para a equipe autorizada.
        </Notice>
      </Container>
    );
  }
  return <>{children}</>;
}
