import serverless from "serverless-http";
import { createServer } from "../../server/index";

let cachedHandler: ReturnType<typeof serverless> | null = null;

export const handler = async (event: any, context: any) => {
  if (!cachedHandler) {
    const app = await createServer();
    cachedHandler = serverless(app, {
      binary: false,
      request(req: any, event: any) {
        // Netlify passes body as a base64 or plain string — decode it
        if (event.isBase64Encoded && event.body) {
          req.body = JSON.parse(Buffer.from(event.body, "base64").toString("utf8"));
        } else if (typeof event.body === "string" && event.body) {
          try { req.body = JSON.parse(event.body); } catch {}
        }
      },
    });
  }
  return cachedHandler(event, context);
};
