export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/** Valida CPF pelos dígitos verificadores. */
export function isValidCPF(input: string): boolean {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

export function formatCPF(input: string): string {
  const d = onlyDigits(input).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

/** Mostra só os 3 últimos dígitos (para telas da equipe). */
export function maskCPF(input: string): string {
  const d = onlyDigits(input);
  return d.length === 11 ? `***.***.**${d.slice(8, 9)}-${d.slice(9)}` : "***";
}

export function formatPhone(input: string): string {
  const d = onlyDigits(input).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3").replace(/-$/, "");
  return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
}

export function isValidPhone(input: string): boolean {
  const d = onlyDigits(input);
  return d.length === 10 || d.length === 11;
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.trim());
}
