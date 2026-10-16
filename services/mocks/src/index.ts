import { buildApp, isMockKind } from "./app.js";

const kind = process.env.MOCK_KIND;
if (!isMockKind(kind)) {
  throw new Error("MOCK_KIND must be openai, maps or acs");
}

const port = Number(process.env.PORT ?? 3000);
const app = await buildApp(kind);

try {
  await app.listen({ host: "0.0.0.0", port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
