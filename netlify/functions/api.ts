import serverless from "serverless-http";
import { createServer } from "../../server/index";

// Cache the handler across warm invocations
let cachedHandler: ReturnType<typeof serverless> | null = null;

export const handler = async (event: any, context: any) => {
  if (!cachedHandler) {
    const app = await createServer();
    cachedHandler = serverless(app, {
      binary: false,
      request(req: any, event: any) {
        // Log path for debugging
        console.log("[api] path:", event.path, "body:", typeof event.body);
      },
    });
  }
  return cachedHandler(event, context);
};
