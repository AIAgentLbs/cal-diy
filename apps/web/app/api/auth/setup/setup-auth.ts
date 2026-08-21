import { timingSafeEqual } from "node:crypto";

export function getBearerSecret(authorization: string | null): string | null {
  const prefix = "Bearer ";
  return authorization?.startsWith(prefix) ? authorization.slice(prefix.length) : null;
}

export function getSetupSecretFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("setup_secret" in body)) return null;

  const setupSecret = (body as Record<string, unknown>).setup_secret;
  return typeof setupSecret === "string" ? setupSecret : null;
}

export function getSetupSecretFromEnvironment(
  environment: Record<string, string | undefined>
): string | undefined {
  return environment.SETUP_SECRET;
}

export function isSetupRequestAuthorized(providedSecret: string | null, serverSecret?: string): boolean {
  if (!providedSecret || !serverSecret) return false;

  const provided = Buffer.from(providedSecret);
  const expected = Buffer.from(serverSecret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
