import { UserRound } from "lucide-react";
import { Card, Notice, PageTitle, Section, Spinner } from "@/components/ui";
import { useProfessionals } from "@/hooks/useData";
import type { Professional } from "@/lib/api";

export function DoctorCard({ p, compact = false }: { p: Professional; compact?: boolean }) {
  return (
    <Card className={compact ? "p-4" : undefined}>
      <div className="flex items-center gap-4">
        {p.photo_url ? (
          <img src={p.photo_url} alt={`Foto de ${p.full_name}`} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary" aria-hidden>
            <UserRound className="h-7 w-7" />
          </div>
        )}
        <div>
          <p className="font-semibold">{p.full_name}</p>
          <p className="text-sm text-muted">
            {p.council} {p.council_number}/{p.council_uf}
            {p.rqe ? ` · RQE ${p.rqe}` : ""}
          </p>
          {/* Especialidade só aparece com RQE (Res. CFM 2.336/2023). */}
          {p.specialty && p.rqe && <p className="text-sm text-muted">{p.specialty}</p>}
        </div>
      </div>
      {!compact && p.bio && <p className="mt-4 text-sm text-ink/80">{p.bio}</p>}
    </Card>
  );
}

export default function Doctors() {
  const { data, loading, error } = useProfessionals();
  return (
    <Section>
      <PageTitle eyebrow="Quem atende" title="Nossos médicos">
        Todos têm registro ativo no Conselho Regional de Medicina. O número aparece aqui e na tela da agenda, antes de você escolher o horário.
      </PageTitle>
      <div className="mt-10">
        {loading && <Spinner />}
        {error && <Notice tone="danger">{error}</Notice>}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.map((p) => <DoctorCard key={p.id} p={p} />)}
        </div>
        <p className="mt-8 text-sm text-muted">
          Confira qualquer registro no portal do Conselho Federal de Medicina (busca de médicos). Especialidade só é anunciada com RQE, como exige o CFM.
        </p>
      </div>
    </Section>
  );
}
