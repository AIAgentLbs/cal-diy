import { timingSafeEqual } from "node:crypto";

export function isSetupRequestAuthorized(providedSecret: string | null, serverSecret?: string): boolean {
  if (!providedSecret || !serverSecret) return false;

  const provided = Buffer.from(providedSecret);
  const expected = Buffer.from(serverSecret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
