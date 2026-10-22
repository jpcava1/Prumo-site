import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PharmacyChoice } from "@/components/PharmacyChoice";
import { FARMASHOP_URL } from "@/config/site";
import type { ClinicalDocument } from "@/lib/api";

/** Regra de livre escolha: as duas opções precisam ter o mesmo peso visual. */
const doc: ClinicalDocument = {
  id: "d1",
  appointment_id: "a1",
  patient_id: "u1",
  kind: "receita",
  title: "Receita digital",
  pdf_path: "demo",
  issued_at: new Date().toISOString(),
};

describe("tela da receita", () => {
  it("mostra as duas opções com exatamente o mesmo estilo", () => {
    render(<PharmacyChoice document={doc} />);
    const farmashop = screen.getByTestId("opcao-farmashop");
    const baixar = screen.getByTestId("opcao-baixar");
    expect(farmashop.className).toBe(baixar.className);
    expect(farmashop).toHaveTextContent(/Pedir na Farmashop/);
    expect(baixar).toHaveTextContent(/Salvar receita e levar a outra farmácia/);
  });

  it("o botão da Farmashop só abre o WhatsApp dela em nova aba, sem dado de saúde na mensagem", () => {
    render(<PharmacyChoice document={doc} />);
    const link = screen.getByTestId("opcao-farmashop");
    expect(link.getAttribute("href")).toBe(FARMASHOP_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("href")).not.toMatch(/[?&](doc|receita|cpf|token|id)=/i);
    expect(link.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/5543988251010\?text=/);
    const text = decodeURIComponent(link.getAttribute("href")!.split("text=")[1]);
    expect(text).toBe("Olá tudo bem?\nEu venho pela Prumo e gostaria de pedir o meu suplemento personalizado");
  });

  it("deixa claro que a receita vale em qualquer farmácia e que a Prumo não recebe nada", () => {
    render(<PharmacyChoice document={doc} />);
    expect(screen.getByText(/qualquer farmácia do Brasil/)).toBeInTheDocument();
    expect(screen.getByText(/não recebe nada pela sua escolha/)).toBeInTheDocument();
  });

  it("clicar na Farmashop não faz nenhuma requisição de rede com a receita", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    render(<PharmacyChoice document={doc} />);
    fireEvent.click(screen.getByTestId("opcao-farmashop"));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
