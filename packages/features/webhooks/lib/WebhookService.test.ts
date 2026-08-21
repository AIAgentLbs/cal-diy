import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebhookSubscriber } from "./dto/types";
import getWebhooks from "./getWebhooks";
import { WebhookVersion as WebhookVersionEnum } from "./interface/IWebhookRepository";
import sendOrSchedulePayload from "./sendOrSchedulePayload";
import { WebhookService } from "./WebhookService";

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("./getWebhooks", () => ({
  default: vi.fn(),
}));
vi.mock("./sendOrSchedulePayload", () => ({
  default: vi.fn(),
}));

vi.mock("@calcom/lib/logger", () => {
  return {
    default: {
      getSubLogger: vi.fn(() => ({ error: loggerMocks.error })),
    },
  };
});

vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: JSON.stringify,
}));

describe("WebhookService", () => {
  const mockOptions = {
    id: "mockOptionsId",
    subscriberUrl: "subUrl",
    payloadTemplate: "PayloadTemplate",
    appId: "AppId",
    secret: "WhSecret",
    triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
  };
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should initialize with options and webhooks", async () => {
    const mockWebhooks: WebhookSubscriber[] = [
      {
        id: "webhookId",
        subscriberUrl: "url",
        secret: "secret",
        appId: "appId",
        payloadTemplate: "payloadTemplate",
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        timeUnit: "MINUTE",
        time: 5,
        version: WebhookVersionEnum.V_2021_10_20,
      },
    ];
    vi.mocked(getWebhooks).mockResolvedValue(mockWebhooks);

    // Has to be called with await due to the iffi being async
    const service = await WebhookService.init(mockOptions);

    expect(service).toBeInstanceOf(WebhookService);
    expect(await service.getWebhooks()).toEqual(mockWebhooks);
    expect(getWebhooks).toHaveBeenCalledWith(mockOptions);
  });

  it("does not log capability URLs when webhook delivery fails", async () => {
    const capabilityUrl = "https://crm.example.com/hook?token=capability-secret";
    const mockWebhooks: WebhookSubscriber[] = [
      {
        id: "webhookId",
        subscriberUrl: capabilityUrl,
        secret: "secret",
        appId: "appId",
        payloadTemplate: null,
        eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
        timeUnit: null,
        time: null,
        version: WebhookVersionEnum.V_2021_10_20,
      },
    ];
    vi.mocked(getWebhooks).mockResolvedValue(mockWebhooks);
    vi.mocked(sendOrSchedulePayload).mockRejectedValue(new Error(`request to ${capabilityUrl} failed`));
    const service = await WebhookService.init(mockOptions);

    await service.sendPayload({ title: "Test booking" } as never);

    expect(loggerMocks.error).toHaveBeenCalled();
    expect(JSON.stringify(loggerMocks.error.mock.calls)).not.toContain("capability-secret");
    expect(JSON.stringify(loggerMocks.error.mock.calls)).not.toContain(capabilityUrl);
  });

  // it("should send payload to all webhooks", async () => {
  //   const mockWebhooks = [
  //     {
  //       id: "webhookId",
  //       subscriberUrl: "url",
  //       secret: "secret",
  //       appId: "appId",
  //       payloadTemplate: "payloadTemplate",
  //     },
  //     {
  //       id: "webhookId2",
  //       subscriberUrl: "url",
  //       secret: "secret2",
  //       appId: "appId2",
  //       payloadTemplate: "payloadTemplate",
  //     },
  //   ];
  //   vi.mocked(getWebhooks).mockResolvedValue(mockWebhooks);
  //   const service = await new WebhookService(mockOptions);
  //
  //   const payload = {
  //     secretKey: "secret",
  //     triggerEvent: "triggerEvent",
  //     createdAt: "now",
  //     webhook: {
  //       subscriberUrl: "url",
  //       appId: "appId",
  //       payloadTemplate: "payloadTemplate",
  //     },
  //     data: "test",
  //   };
  //
  //   await service.sendPayload(payload as any);
  //
  //   expect(sendOrSchedulePayload).toHaveBeenCalledTimes(mockWebhooks.length);
  //
  //   mockWebhooks.forEach((webhook) => {
  //     expect(sendOrSchedulePayload).toHaveBeenCalledWith(
  //       webhook.secret,
  //       mockOptions.triggerEvent,
  //       expect.any(String),
  //       webhook,
  //       payload
  //     );
  //   });
  // });
  //
  // it("should log error when sending payload fails", async () => {
  //   const mockWebhooks = [
  //     {
  //       id: "webhookId",
  //       subscriberUrl: "url",
  //       secret: "secret",
  //       appId: "appId",
  //       payloadTemplate: "payloadTemplate",
  //     },
  //   ];
  //   vi.mocked(getWebhooks).mockResolvedValue(mockWebhooks);
  //
  //   const logError = vi.fn();
  //
  //   (sendOrSchedulePayload as any).mockImplementation(() => {
  //     throw new Error("Failure");
  //   });
  //
  //   const service = new WebhookService(mockOptions);
  //
  //   const payload = {
  //     secretKey: "secret", triggerEvent: "triggerEvent", createdAt: "now", webhook: {
  //       subscriberUrl: "url",
  //       appId: "appId",
  //       payloadTemplate: "payloadTemplate"
  //     },
  //     data: "test"
  //   };
  //
  //   await service.sendPayload(payload as any);
  //
  //   expect(logError).toHaveBeenCalledWith(
  //     `Error executing webhook for event: ${mockOptions.triggerEvent}, URL: ${mockWebhooks[0].subscriberUrl}`,
  //     JSON.stringify(new Error("Failure"))
  //   );
  // });
});
