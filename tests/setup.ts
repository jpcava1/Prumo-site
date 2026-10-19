import "@testing-library/jest-dom/vitest";

// jsdom não implementa rolagem de janela.
if (typeof window !== "undefined") {
  window.scrollTo = (() => undefined) as typeof window.scrollTo;
}
