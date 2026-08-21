import { describe, expect, it } from "vitest";
import { isSetupRequestAuthorized } from "./setup-auth";

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
});
