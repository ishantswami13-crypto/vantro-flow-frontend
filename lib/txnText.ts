// Older bank rows were written by the paid-invoice backfill as
// "Auto-backfill: Payment from X for inv <uuid>". Show them the way the
// backend writes them now: "Payment from X", with a bill or invoice number
// only when there is one a person would recognise.
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

export function txnText(text: string | null | undefined): string {
  if (!text) return "";
  let t = text.replace(/^Auto-backfill:\s*/i, "");
  t = t.replace(/\s+for\s+(inv|sale|purchase)\s+(\S+)$/i, (_m, kind: string, ref: string) => {
    if (UUID.test(ref)) return "";
    return ` for ${kind.toLowerCase() === "inv" ? "invoice" : kind.toLowerCase() === "purchase" ? "bill" : "sale"} ${ref}`;
  });
  return t;
}
