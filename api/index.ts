import "dotenv/config";
import serverless from "serverless-http";
import { createServer } from "../server/index";

let handler: ReturnType<typeof serverless> | null = null;

export default async function (req: any, res: any) {
  if (!handler) {
    const app = await createServer();
    handler = serverless(app);
  }
  return handler(req, res);
}
