import OpenAI from "openai";

import type { LlmGateway, LlmGatewayInput, LlmGatewayResult } from "@ethoxford/domain";

const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_COST_PER_TOKEN_USD = 0.000001;

function normalizeText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return "";
  }

  return JSON.stringify(value, null, 2);
}

function extractOutputText(response: OpenAI.Responses.Response): string {
  if (response.output_text) {
    return response.output_text.trim();
  }

  const output = response.output ?? [];
  for (const item of output) {
    if ("content" in item && Array.isArray(item.content)) {
      for (const block of item.content) {
        if (block.type === "output_text") {
          return block.text.trim();
        }
      }
    }
  }

  return "";
}

export class OpenAiResponsesGateway implements LlmGateway {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly costPerTokenUsd: number;

  constructor(options: { apiKey: string; model?: string; costPerTokenUsd?: number }) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.model = options.model ?? DEFAULT_MODEL;
    this.costPerTokenUsd =
      options.costPerTokenUsd ?? DEFAULT_COST_PER_TOKEN_USD;
  }

  async generateToolSummary(input: LlmGatewayInput): Promise<LlmGatewayResult> {
    const systemPrompt =
      "You are an AI runtime summarizer. Provide a concise, factual summary of the tool execution result. Keep it under 80 words and avoid speculation.";

    const userPrompt = [
      "Tool execution details:",
      `Tool: ${input.toolName}`,
      `Workspace: ${input.context.workspaceId ?? "unknown"}`,
      `Actor: ${input.context.actorId ?? "unknown"}`,
      `Correlation: ${input.context.correlationId}`,
      "Tool input:",
      normalizeText(input.toolInput),
      "Tool output:",
      normalizeText(input.toolOutput),
    ].join("\n");

    const response = await this.client.responses.create({
      model: this.model,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_output_tokens: 200,
    });

    const outputText = extractOutputText(response) || "Tool executed successfully.";
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const estimatedCostUsd =
      Math.round((inputTokens + outputTokens) * this.costPerTokenUsd * 1_000_000) / 1_000_000;

    return {
      responseText: outputText,
      inputTokens,
      outputTokens,
      estimatedCostUsd,
      modelName: response.model ?? this.model,
      modelVersion: "responses-v1",
      responseId: response.id,
    };
  }
}
