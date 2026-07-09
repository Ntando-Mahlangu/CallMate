import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, GenerateObjectInput } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateObject<T>({
    system,
    messages,
    schema,
    jsonSchema,
    toolName,
  }: GenerateObjectInput<T>): Promise<T> {
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      tools: [
        {
          name: toolName,
          description: `Return the ${toolName} result as structured data.`,
          input_schema: jsonSchema as Anthropic.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: toolName },
    });

    const toolUse = response.content.find(
      (block) => block.type === "tool_use" && block.name === toolName,
    );

    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error(`AI provider did not return a ${toolName} result.`);
    }

    return schema.parse(toolUse.input);
  }
}
