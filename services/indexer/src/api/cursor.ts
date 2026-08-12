import { z } from "zod";

const cursorSchema = z.strictObject({
  schemaVersion: z.literal(1),
  rfqId: z.string().regex(/^[1-9][0-9]*$/),
});

export class CursorError extends Error {
  readonly code = "CURSOR_INVALID" as const;

  constructor() {
    super("CURSOR_INVALID");
    this.name = "CursorError";
  }
}

export function encodeRfqCursor(input: { rfqId: string }): string {
  const value = cursorSchema.parse({ schemaVersion: 1, rfqId: input.rfqId });
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

export function decodeRfqCursor(value: string): z.output<typeof cursorSchema> {
  if (!value || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new CursorError();
  }
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    );
    const parsed = cursorSchema.parse(decoded);
    if (encodeRfqCursor({ rfqId: parsed.rfqId }) !== value) {
      throw new CursorError();
    }
    return parsed;
  } catch {
    throw new CursorError();
  }
}
