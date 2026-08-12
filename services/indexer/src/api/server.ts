import { createServer, type Server, type ServerResponse } from "node:http";

export type ReadApiHandler = (request: Request) => Promise<Response>;

async function writeResponse(
  response: Response,
  output: ServerResponse,
): Promise<void> {
  output.statusCode = response.status;
  response.headers.forEach((value, key) => output.setHeader(key, value));
  output.end(Buffer.from(await response.arrayBuffer()));
}

export function createReadApiServer(handler: ReadApiHandler): Server {
  return createServer((request, response) => {
    void (async () => {
      try {
        const url = new URL(request.url ?? "/", "http://localhost");
        const result = await handler(
          new Request(url, { method: request.method ?? "GET" }),
        );
        await writeResponse(result, response);
      } catch {
        await writeResponse(
          Response.json(
            { error: "INTERNAL_ERROR" },
            { status: 500, headers: { "cache-control": "no-store" } },
          ),
          response,
        );
      }
    })();
  });
}
