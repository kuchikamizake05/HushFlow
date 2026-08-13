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

async function fetchJson(path: string, fetcher: ReadFetcher): Promise<unknown> {
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

  if (!response.ok) throw new ReadModelError("READ_UNAVAILABLE");
  try {
    return await response.json();
  } catch {
    throw new ReadModelError("READ_INVALID");
  }
}

export async function loadReadModel(
  path: string,
  fetcher: ReadFetcher = fetch,
): Promise<unknown> {
  if (!isReadPath(path)) {
    throw new ReadModelError("READ_INVALID");
  }

  if (path === "/metadata") {
    const body = await fetchJson(path, fetcher);
    const parsed = metadataSchema.safeParse(body);
    if (!parsed.success) {
      throw new ReadModelError("READ_INVALID");
    }
    return parsed.data;
  }

  const metadata = metadataSchema.safeParse(
    await fetchJson("/metadata", fetcher),
  );
  if (!metadata.success) throw new ReadModelError("READ_INVALID");

  const body = await fetchJson(path, fetcher);

  if (typeof body !== "object" || body === null) {
    throw new ReadModelError("READ_INVALID");
  }

  return body;
}
