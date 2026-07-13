/**
 * Client-side fetch helper for our JSON APIs.
 *
 * Never assume the response is JSON: when the dev server is restarting, a
 * route fails to compile, or a proxy times out a long request, the body is an
 * HTML error page — and a blind res.json() surfaces gibberish like
 * `Unexpected token '<', "<HTML>..." is not valid JSON` to the user. Parse
 * defensively and translate every failure mode into a human message.
 */
export async function postJson<T = Record<string, unknown>>(
  path: string,
  body: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Network layer failure — server down/unreachable, connection dropped.
    throw new Error(
      "Couldn't reach the server. Check your connection and try again.",
    );
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    // Non-JSON body (HTML error page). Log detail for debugging, show a
    // friendly, retryable message to the user.
    console.error(
      `[postJson] ${path} returned non-JSON (HTTP ${res.status}):`,
      text.slice(0, 300),
    );
    throw new Error(
      res.status >= 500 || res.status === 0
        ? "The server had a hiccup while processing your request. Please try again in a moment."
        : "Something unexpected came back from the server. Please try again.",
    );
  }

  if (!res.ok) {
    const msg = (data as { error?: string })?.error;
    throw new Error(msg ?? "Something went wrong. Please try again.");
  }
  return data as T;
}
