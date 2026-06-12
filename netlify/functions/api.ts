import serverless from "serverless-http";

import { createServer } from "../../server";

// createServer() is async (initialises the DB); wrap in a lazy handler so
// serverless-http picks up the fully-initialised Express app.
export const handler = async (event: any, context: any) => {
  const app = await createServer();
  return serverless(app)(event, context);
};
