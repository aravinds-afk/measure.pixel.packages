import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, startSession } from "@/server/auth";
import { assertSameOrigin, handle, HttpError, parseJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

const schema = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) });

export const POST = handle(async (req: Request) => {
  assertSameOrigin(req);
  const { email, password } = await parseJson(req, schema);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  await rateLimit(`login:${ip}`, 20, 600);
  await rateLimit(`login:${email.toLowerCase()}`, 8, 600);
  const user = await authenticate(email, password);
  if (!user) throw new HttpError(401, "Email or password is incorrect");
  await startSession(user);
  return NextResponse.json({ ok: true });
});
