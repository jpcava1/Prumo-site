import type { Api } from "./types";
import { createDemoApi } from "./demoApi";
import { createSupabaseApi } from "./supabaseApi";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Sem as chaves do Supabase, o site sobe em modo demonstração (dados fictícios em memória). */
export const api: Api = url && key ? createSupabaseApi(url, key) : createDemoApi();
export const isDemo = api.mode === "demo";

export * from "./types";
