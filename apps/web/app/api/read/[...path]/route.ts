import { NextResponse } from "next/server";

import { ReadModelError, loadReadModel } from "../../../../src/adapters/m4a";

const upstreamBaseUrl = process.env.M4A_READ_API_URL;

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const readPath = `/${path.join("/")}`;

  if (!upstreamBaseUrl) {
    return NextResponse.json({ code: "READ_UNAVAILABLE" }, { status: 503 });
  }

  try {
    const data = await loadReadModel(readPath, (target, init) =>
      fetch(new URL(target, upstreamBaseUrl), init),
    );
    return NextResponse.json(data, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const code =
      error instanceof ReadModelError ? error.code : "READ_UNAVAILABLE";
    return NextResponse.json(
      { code },
      { status: code === "READ_INVALID" ? 400 : 503 },
    );
  }
}
