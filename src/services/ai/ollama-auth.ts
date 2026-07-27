export type OllamaAuthParams = {
  username?: string;
  password?: string;
};

export function createOllamaHeaders(auth?: OllamaAuthParams) {
  const username = auth?.username ?? process.env.OLLAMA_BASIC_AUTH_USERNAME;
  const password = auth?.password ?? process.env.OLLAMA_BASIC_AUTH_PASSWORD;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (username && password) {
    headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  }

  return headers;
}
