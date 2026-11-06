export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export class AiInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiInputError";
  }
}

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

const timeoutMs = () => {
  const parsed = Number(process.env.AI_TIMEOUT_MS ?? 20000);
  if (!Number.isFinite(parsed) || parsed < 1000) return 20000;
  return parsed;
};

const readContent = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return "";
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";
  const message = (choices[0] as { message?: { content?: unknown } }).message;
  return typeof message?.content === "string" ? message.content : "";
};

const postChat = async (messages: ChatMessage[], jsonMode: boolean) => {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new AiUnavailableError(
      "The assistant is not configured yet. Add LLM_API_KEY on the server and keep writing.",
    );
  }

  const baseUrl = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const body: Record<string, unknown> = {
    model: process.env.LLM_MODEL || "gpt-4o-mini",
    temperature: 0.4,
    messages,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs()),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new AiUnavailableError("The assistant took too long. Keep writing and try again.");
    }
    throw new AiUnavailableError(
      "The assistant is unavailable right now. Keep writing and try again.",
    );
  }

  if (response.status === 400 && jsonMode) {
    return postChat(messages, false);
  }

  if (!response.ok) {
    throw new AiUnavailableError(
      "The assistant is unavailable right now. Keep writing and try again.",
    );
  }

  const content = readContent(await response.json());
  if (!content.trim()) {
    throw new AiUnavailableError("The assistant returned an empty suggestion. Try again.");
  }
  return content;
};

export const requestJson = async (system: string, user: string): Promise<unknown> => {
  const content = await postChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    true,
  );

  const fenced = content.trim().match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? content.trim();

  try {
    return JSON.parse(raw);
  } catch {
    throw new AiUnavailableError("The assistant returned something that was not JSON. Try again.");
  }
};

export const mockAiEnabled = () => process.env.MOCK_AI === "true";

export const assertConfigured = () => {
  if (mockAiEnabled() || process.env.LLM_API_KEY) return;
  throw new AiUnavailableError(
    "The assistant is not configured yet. Add LLM_API_KEY on the server and keep writing.",
  );
};
