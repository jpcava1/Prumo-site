/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_FARMASHOP_URL?: string;
  readonly VITE_POSTHOG_KEY?: string;
  readonly VITE_META_PIXEL_ID?: string;
  readonly VITE_GA_ID?: string;
  readonly VITE_ROUTER?: "memory";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
