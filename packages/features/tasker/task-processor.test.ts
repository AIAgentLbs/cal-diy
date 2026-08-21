import { afterEach, describe, expect, it, vi } from "vitest";

const taskMocks = vi.hoisted(() => ({
  getNextBatch: vi.fn(),
  retry: vi.fn(),
  succeed: vi.fn(),
}));

vi.mock("./repository", () => ({
  Task: taskMocks,
}));

vi.mock("./tasks", () => ({
  default: {
    sendWebhook: async () => async () => undefined,
  },
  tasksConfig: {},
}));

import { TaskProcessor } from "./task-processor";

describe("TaskProcessor logging", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("does not log queued payloads containing webhook secrets or attendee data", async () => {
    taskMocks.getNextBatch.mockResolvedValue([
      {
        id: "task-1",
        type: "sendWebhook",
        payload: JSON.stringify({ secretKey: "webhook-secret", email: "guest@example.com" }),
        attempts: 0,
        maxAttempts: 3,
        lastFailedAttemptAt: null,
      },
    ]);
    taskMocks.succeed.mockResolvedValue(undefined);
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await new TaskProcessor().processQueue();

    expect(JSON.stringify(consoleInfo.mock.calls)).not.toContain("webhook-secret");
    expect(JSON.stringify(consoleInfo.mock.calls)).not.toContain("guest@example.com");
  });
});
