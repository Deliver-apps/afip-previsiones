/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_APIKEY: string;
  readonly VITE_GITHUB_CARLOS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
