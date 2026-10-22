import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import App from "@/App";

function renderHome() {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

/** Os três painéis da página inicial abrem o pop-up e o botão leva ao fluxo de agendamento. */
describe("landing", () => {
  it.each(["Marque sua consulta", "Seu suplemento feito sob medida para você", "Crie sua rotina de autocuidado com um profissional"])(
    "painel \"%s\" abre o pop-up e leva ao /comecar",
    async (title) => {
      renderHome();
      fireEvent.click(await screen.findByRole("button", { name: new RegExp(title) }));
      const dialog = await screen.findByRole("dialog", { name: title });
      const cta = dialog.querySelector(".lp-sheet-cta") as HTMLButtonElement;
      fireEvent.click(cta);
      expect(await screen.findByRole("heading", { level: 1, name: /motivo da consulta|Crie sua conta/ })).toBeInTheDocument();
    },
  );

  it("o pop-up fecha com Esc", async () => {
    renderHome();
    fireEvent.click(await screen.findByRole("button", { name: /Marque sua consulta/ }));
    await screen.findByRole("dialog", { name: "Marque sua consulta" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Marque sua consulta" })).toBeNull();
  });

  it("botão do hero leva ao fluxo", async () => {
    renderHome();
    fireEvent.click(await screen.findByRole("link", { name: /Marcar agora/ }));
    expect(await screen.findByRole("heading", { level: 1, name: /motivo da consulta/ })).toBeInTheDocument();
  });
});
