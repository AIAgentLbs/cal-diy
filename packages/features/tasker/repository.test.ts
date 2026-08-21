import type { PrismaClient } from "@calcom/prisma";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskRepository } from "./repository";

describe("TaskRepository logging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not log task payloads containing webhook secrets or attendee data", async () => {
    const create = vi.fn().mockResolvedValue({ id: "task-1" });
    const prismaClient = {
      task: { create },
    } as unknown as PrismaClient;
    const repository = new TaskRepository({ prismaClient });
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const payload = JSON.stringify({ secretKey: "webhook-secret", email: "guest@example.com" });

    await repository.create("sendWebhook", payload);

    expect(JSON.stringify(consoleInfo.mock.calls)).not.toContain("webhook-secret");
    expect(JSON.stringify(consoleInfo.mock.calls)).not.toContain("guest@example.com");
  });
});
