interface ImportMetaEnv {
  readonly VITE_LUA_DATA_MODE?: string;
  readonly VITE_LUA_API_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_QR_TOKEN_TTL_SECONDS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
