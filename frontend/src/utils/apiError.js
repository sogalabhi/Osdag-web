/**
 * Read an API error body.
 *
 * The backend returns
 *   { error: { code, message, fields?: { <key>: <message> } } }
 * (see documentation: backend architecture, "API error format").
 *
 * A body in any other shape gives `message: null`, and the caller falls back to the HTTP
 * status. Celery task results (`{ success: false, error: "text" }`) are a separate channel
 * and are not read here.
 *
 * @param {unknown} body - parsed JSON body of an error response
 * @returns {{ message: string|null, code: string|null, fields: Record<string, string>|null }}
 */
export function parseApiError(body) {
  const result = { message: null, code: null, fields: null };
  if (!body || typeof body !== "object") return result;

  const { error } = body;
  if (error && typeof error === "object") {
    result.message = typeof error.message === "string" ? error.message : null;
    result.code = typeof error.code === "string" ? error.code : null;
    if (error.fields && typeof error.fields === "object") {
      result.fields = error.fields;
    }
  }

  return result;
}

/**
 * Convenience: the human-readable message of an error body, or `fallback`.
 */
export function getErrorMessage(body, fallback = "Request failed") {
  return parseApiError(body).message || fallback;
}
