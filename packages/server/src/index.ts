import { createApp } from "./app";
import { env } from "./env";

const app = createApp();

app.listen(env.port, env.host, () => {
  console.log(`[lua-server] listening on http://${env.host}:${env.port}`);
  console.log(
    `[lua-server] for LAN/phone testing use your Mac's IP — see docs/LOCAL-BACKEND.md`,
  );
});
