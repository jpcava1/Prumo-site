import { useLocation, useNavigate } from "react-router-dom";
import { Card, Section } from "@/components/ui";
import { EmailCodeLogin } from "@/components/EmailCodeLogin";
import { useAuth } from "@/context/AuthContext";

export default function Entrar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile } = useAuth();
  const from = (location.state as { from?: string } | null)?.from ?? "/minha-conta";

  return (
    <Section>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-semibold">Entrar</h1>
        <p className="mt-2 text-muted">Use o e-mail da sua conta. Enviamos um código, sem senha.</p>
        <Card className="mt-8">
          <EmailCodeLogin
            onDone={async () => {
              await refreshProfile();
              navigate(from, { replace: true });
            }}
          />
        </Card>
      </div>
    </Section>
  );
}
