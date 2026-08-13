import { isReadPath, metadataSchema } from "./contracts";

export type ReadErrorCode = "READ_INVALID" | "READ_UNAVAILABLE";

export class ReadModelError extends Error {
  readonly code: ReadErrorCode;

  constructor(code: ReadErrorCode) {
    super(code);
    this.name = "ReadModelError";
    this.code = code;
  }
}

export type ReadFetcher = (
  path: string,
  init: RequestInit,
) => Promise<Response>;

export async function loadReadModel(
  path: string,
  fetcher: ReadFetcher = fetch,
): Promise<unknown> {
  if (!isReadPath(path)) {
    throw new ReadModelError("READ_INVALID");
  }

  let response: Response;
  try {
    response = await fetcher(path, {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new ReadModelError("READ_UNAVAILABLE");
  }

  if (!response.ok) {
    throw new ReadModelError("READ_UNAVAILABLE");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ReadModelError("READ_INVALID");
  }

  if (path === "/metadata") {
    const parsed = metadataSchema.safeParse(body);
    if (!parsed.success) {
      throw new ReadModelError("READ_INVALID");
    }
    return parsed.data;
  }

  if (typeof body !== "object" || body === null) {
    throw new ReadModelError("READ_INVALID");
  }

  return body;
}
