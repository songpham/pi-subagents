import type { Context } from "@earendil-works/pi-ai";
import * as PiAi from "@earendil-works/pi-ai";
import { describe, expect, it } from "vitest";
import { normalizeFauxContext } from "./helpers/print-mode-runner.js";

const transcriptApi = PiAi as unknown as {
  normalizeContext?: (context: Context) => { messages: Context["messages"] };
};

const agentTool = {
  name: "Agent",
  description: "Launch a subagent",
  parameters: { type: "object", properties: {} },
} as unknown as NonNullable<Context["tools"]>[number];

describe("faux provider context compatibility", () => {
  it("preserves the legacy Context shape", () => {
    const context: Context = {
      systemPrompt: "Parent instructions",
      messages: [],
      tools: [agentTool],
    };

    expect(normalizeFauxContext(context)).toBe(context);
  });

  it.skipIf(!transcriptApi.normalizeContext)("replays Pi 1.x transcript prompt and tools", () => {
    const transcript = transcriptApi.normalizeContext!({
      systemPrompt: "Parent instructions",
      messages: [],
      tools: [agentTool],
    });

    const context = normalizeFauxContext(transcript);

    expect(context.systemPrompt).toBe("Parent instructions");
    expect(context.tools?.map((tool) => tool.name)).toEqual(["Agent"]);
    expect(context.messages).toEqual([]);
  });
});
