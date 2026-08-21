import { WebhookVersion } from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendWebhook } from "./sendWebook";

vi.mock("@calcom/features/webhooks/lib/sendPayload", () => ({
  default: vi.fn(),
}));

const payload = JSON.stringify({
  secretKey: "signing-secret",
  triggerEvent: "BOOKING_CREATED",
  createdAt: "2026-08-21T08:00:00.000Z",
  webhook: {
    subscriberUrl: "https://crm.example.com/hook?token=capability-secret",
    appId: null,
    payloadTemplate: null,
    version: WebhookVersion.V_2021_10_20,
  },
  data: { email: "attendee@example.com" },
});

describe("sendWebhook task", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects non-success HTTP responses so the task queue retries delivery", async () => {
    vi.mocked(sendPayload).mockResolvedValue({ ok: false, status: 500 });

    await expect(sendWebhook(payload)).rejects.toThrow("HTTP 500");
  });
});
