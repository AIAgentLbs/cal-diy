import { describe, expect, it } from "vitest";
import {
  getBearerSecret,
  getSetupSecretFromBody,
  getSetupSecretFromEnvironment,
  isSetupRequestAuthorized,
} from "./setup-auth";

describe("first-admin setup authorization", () => {
  it("requires an exact non-empty setup secret", () => {
    expect(isSetupRequestAuthorized(null, "server-secret")).toBe(false);
    expect(isSetupRequestAuthorized("", "server-secret")).toBe(false);
    expect(isSetupRequestAuthorized("wrong-secret", "server-secret")).toBe(false);
    expect(isSetupRequestAuthorized("server-secret", "server-secret")).toBe(true);
  });

  it("fails closed when the server secret is missing", () => {
    expect(isSetupRequestAuthorized("provided-secret", undefined)).toBe(false);
    expect(isSetupRequestAuthorized("provided-secret", "")).toBe(false);
  });

  it("accepts only the standard Bearer authorization format", () => {
    expect(getBearerSecret("Bearer server-secret")).toBe("server-secret");
    expect(getBearerSecret("server-secret")).toBeNull();
    expect(getBearerSecret(null)).toBeNull();
  });

  it("accepts a setup secret from a JSON body as a proxy-safe fallback", () => {
    expect(getSetupSecretFromBody({ setup_secret: "server-secret" })).toBe("server-secret");
    expect(getSetupSecretFromBody({ setup_secret: 123 })).toBeNull();
    expect(getSetupSecretFromBody({})).toBeNull();
    expect(getSetupSecretFromBody(null)).toBeNull();
  });

  it("reads the setup secret from the runtime environment object", () => {
    expect(getSetupSecretFromEnvironment({ SETUP_SECRET: "runtime-secret" })).toBe("runtime-secret");
    expect(getSetupSecretFromEnvironment({})).toBeUndefined();
  });
});
