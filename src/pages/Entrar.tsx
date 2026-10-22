import { useLocation } from "react-router-dom";
import { Card, Section } from "@/components/ui";
import { LoginChooser } from "@/components/LoginChooser";

export default function Entrar() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/minha-conta";

  return (
    <Section>
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-semibold">Login</h1>
        <p className="mt-2 text-muted">Como você quer entrar?</p>
        <Card className="mt-8">
          <LoginChooser patientRedirect={from} />
        </Card>
      </div>
    </Section>
  );
}
