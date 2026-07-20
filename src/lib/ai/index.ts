import type { AIProvider } from "./types";
import { AnthropicProvider } from "./anthropic-provider";

export type { AIProvider, AIMessage, GenerateObjectInput } from "./types";

let provider: AIProvider | null = null;

/**
 * Resolves the configured AI provider. Add another provider by writing a
 * new class that implements AIProvider and branching on an env var here —
 * no other file in the app should need to change (Article X).
 */
export function getAIProvider(): AIProvider {
  if (provider) return provider;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env to enable AI features.",
    );
  }

  provider = new AnthropicProvider(apiKey);
  return provider;
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
