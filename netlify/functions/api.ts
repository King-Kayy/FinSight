import serverless from "serverless-http";
import { createServer } from "../../server";

// Cache the handler across warm invocations
let cachedHandler: ReturnType<typeof serverless> | null = null;

export const handler = async (event: any, context: any) => {
  if (!cachedHandler) {
    const app = await createServer();
    // basePath ensures Express sees the full /api/... path
    cachedHandler = serverless(app, { basePath: "" });
  }
  return cachedHandler(event, context);
};
