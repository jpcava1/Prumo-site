import { useState } from "react";
import { Paperclip, X } from "lucide-react";
import type { AnswerValue, Question } from "@/lib/triage/schema";
import { toggleMulti } from "@/lib/triage/engine";
import { ChoiceOption, Input, Textarea } from "./ui";

/** Renderiza uma pergunta da triagem conforme o tipo definido no JSON versionado. */
export function QuestionInput({
  q,
  value,
  onChange,
  onUpload,
}: {
  q: Question;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  onUpload?: (file: File) => Promise<string>;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (q.type === "single" || q.type === "yesno") {
    return (
      <div className="grid gap-2" role="radiogroup" aria-label={q.label}>
        {q.options?.map((o) => (
          <ChoiceOption key={o.value} name={q.id} type="radio" checked={value === o.value} onChange={() => onChange(o.value)} label={o.label} />
        ))}
      </div>
    );
  }

  if (q.type === "multi") {
    const current = Array.isArray(value) ? value : [];
    return (
      <div className="grid gap-2" role="group" aria-label={q.label}>
        {q.options?.map((o) => (
          <ChoiceOption
            key={o.value}
            name={q.id}
            type="checkbox"
            checked={current.includes(o.value)}
            onChange={() => onChange(toggleMulti(q, current, o.value))}
            label={o.label}
          />
        ))}
      </div>
    );
  }

  if (q.type === "number") {
    return (
      <div className="flex items-center gap-3">
        <Input
          id={q.id}
          type="number"
          inputMode="decimal"
          min={q.min}
          max={q.max}
          className="max-w-[180px] text-lg"
          value={typeof value === "number" ? String(value) : ""}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          aria-label={q.label}
        />
        {q.unit && <span className="text-muted">{q.unit}</span>}
      </div>
    );
  }

  if (q.type === "text") {
    const text = typeof value === "string" ? value : "";
    return (
      <div>
        <Textarea id={q.id} value={text} maxLength={q.maxLength} onChange={(e) => onChange(e.target.value)} aria-label={q.label} />
        {q.maxLength && (
          <p className="mt-1 text-right text-xs text-muted">
            {text.length}/{q.maxLength}
          </p>
        )}
      </div>
    );
  }

  // photos | files
  const files = Array.isArray(value) ? value : [];
  const max = q.maxFiles ?? 3;
  const accept = q.type === "photos" ? "image/jpeg,image/png,image/webp,image/heic" : "application/pdf";
  return (
    <div className="space-y-3">
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2 text-sm">
              <span className="truncate">{f.split("/").pop()}</span>
              <button type="button" aria-label="Remover arquivo" onClick={() => onChange(files.filter((x) => x !== f))}>
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length < max && onUpload && (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-[15px] text-primary hover:border-primary">
          <Paperclip className="h-5 w-5" aria-hidden />
          {uploading ? "Enviando…" : q.type === "photos" ? "Adicionar foto" : "Adicionar PDF"}
          <input
            type="file"
            accept={accept}
            capture={q.type === "photos" ? "environment" : undefined}
            className="sr-only"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > 10 * 1024 * 1024) return setUploadError("Arquivo acima de 10 MB.");
              setUploadError(null);
              setUploading(true);
              try {
                const path = await onUpload(file);
                onChange([...files, path]);
              } catch (err) {
                setUploadError((err as Error).message);
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
      )}
      {uploadError && <p className="text-sm text-danger">{uploadError}</p>}
      <p className="text-xs text-muted">Até {max} arquivos de 10 MB. Só o médico da sua consulta vê.</p>
    </div>
  );
}
