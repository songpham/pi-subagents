import { type Context, fauxToolCall } from "@earendil-works/pi-ai";
import { afterEach, describe, expect, it } from "vitest";
import {
  agentCall,
  type PrintModeRun,
  runPrintMode,
} from "./helpers/print-mode-runner.js";

let run: PrintModeRun | undefined;

afterEach(async () => {
  await run?.parentSession.waitForIdle();
  await run?.dispose();
  run = undefined;
});

describe("background completion notification delivery", () => {
  it("notifies the parent before it finishes its current tool work", async () => {
    let firstFinalSawNotification: boolean | undefined;
    run = await runPrintMode({
      cwd: process.cwd(),
      prompt: "Start one background agent and keep working until it completes.",
      respond: async (context: Context) => {
        const isParent = context.tools?.some((tool) => tool.name === "Agent") ?? false;
        if (!isParent) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return "Hello.";
        }

        const hasAgentResult = context.messages.some(
          (message) => message.role === "toolResult" && (message as { toolName?: string }).toolName === "Agent",
        );
        if (!hasAgentResult) {
          return agentCall({ description: "say hello", prompt: "Say hello.", run_in_background: true });
        }

        const sawNotification = context.messages.some((message) =>
          JSON.stringify(message).includes("<task-notification>"),
        );
        const hasReadResult = context.messages.some(
          (message) => message.role === "toolResult" && (message as { toolName?: string }).toolName === "read",
        );
        if (!hasReadResult) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          return fauxToolCall("read", { path: "package.json" });
        }

        firstFinalSawNotification ??= sawNotification;
        return sawNotification ? "NOTIFICATION_BEFORE_FINAL" : "FINAL_BEFORE_NOTIFICATION";
      },
    });

    expect(firstFinalSawNotification).toBe(true);
  });
});
