// One humane sentence for a failed request in Scan, Memory and Intelligence.
// Raw exception text ("Failed to fetch", "HTTP 502", stack fragments) is never
// shown to the person; the HTTP status only picks which sentence fits.
export const OFFLINE_LINE = "Couldn't reach Starlane. Check your connection and try again.";

export function humaneError(err: unknown, fallback = OFFLINE_LINE): string {
  const status = typeof err === "object" && err !== null && "status" in err ? Number((err as { status?: unknown }).status) : NaN;
  if (status === 429) return "Starlane is handling a lot of questions right now. Wait a moment and try again.";
  if (status === 403) return "Your account doesn't have access to this. Ask the workspace owner if you need it.";
  if (status === 404) return "This isn't available any more. It may have been removed.";
  if (status >= 500) return "Starlane couldn't finish that just now. Try again in a moment.";
  return fallback;
}
