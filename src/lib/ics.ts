/** Gera um arquivo .ics para o paciente adicionar a consulta à agenda. Sem conteúdo clínico. */
export function buildIcs(opts: { id: string; startsAt: string; endsAt: string; url: string }): string {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Prumo//Consulta//PT-BR",
    "BEGIN:VEVENT",
    `UID:${opts.id}@prumo`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(opts.startsAt)}`,
    `DTEND:${fmt(opts.endsAt)}`,
    "SUMMARY:Consulta Prumo",
    `DESCRIPTION:Entre pelo link 10 minutos antes: ${opts.url}`,
    `URL:${opts.url}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Consulta Prumo em 15 minutos",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(content: string, filename = "consulta-prumo.ics") {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
