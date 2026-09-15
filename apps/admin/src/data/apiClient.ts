import { LuaApiClient } from "@lua/data-server";
import { APP_CONFIG } from "@lua/config";

export const apiClient = new LuaApiClient({ baseUrl: APP_CONFIG.apiBaseUrl });
