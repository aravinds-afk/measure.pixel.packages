import { NextResponse } from "next/server";
import { endSession } from "@/server/auth";
import { assertSameOrigin, handle } from "@/server/http";

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  await endSession();
  return NextResponse.json({ ok: true });
});
