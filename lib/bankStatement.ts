// Bank statement CSV parsing, shared by the bank matching page. Handles the
// layouts Indian banks export (HDFC, SBI, ICICI, Axis, Kotak and most others):
// a preamble before the header row, dd/mm/yyyy dates, and either separate
// debit and credit columns or one signed amount column.

export type StatementRow = { date: string; description: string; amount: number; type: "credit" | "debit" };

function parseAmount(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[₹,\s]/g, "").replace(/[()]/g, "").replace(/(cr|dr)$/i, "");
  return Math.abs(parseFloat(cleaned)) || 0;
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = ""; let inQuote = false;
  for (const ch of line) {
    if (ch === '"') inQuote = !inQuote;
    else if (ch === "," && !inQuote) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const MONTHS: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };

/** A statement date as YYYY-MM-DD, or null when it cannot be read. */
export function parseStatementDate(s: string): string | null {
  const v = (s || "").trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const dmy = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? "20" + y : y;
    // Indian statements are day first; only swap when the day cannot be a month.
    const [dd, mm] = parseInt(m) > 12 && parseInt(d) <= 12 ? [m, d] : [d, m];
    return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  const named = v.match(/^(\d{1,2})[\s\-/]([A-Za-z]{3})[A-Za-z]*[\s\-/,]+(\d{2,4})$/);
  if (named && MONTHS[named[2].toLowerCase()]) {
    const year = named[3].length === 2 ? "20" + named[3] : named[3];
    return `${year}-${MONTHS[named[2].toLowerCase()]}-${named[1].padStart(2, "0")}`;
  }
  return null;
}

/** Parse a bank statement exported as CSV. Rows that cannot be read are skipped and counted. */
export function parseBankStatement(csv: string): { rows: StatementRow[]; skipped: number; headerFound: boolean } {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let headerIdx = -1;
  for (let i = 0; i < Math.min(25, lines.length); i++) {
    const lower = lines[i].toLowerCase();
    if ((lower.includes("date") || lower.includes("txn")) &&
        /debit|credit|amount|withdrawal|deposit/.test(lower)) { headerIdx = i; break; }
  }
  if (headerIdx === -1) return { rows: [], skipped: 0, headerFound: false };

  const headers = parseCSVLine(lines[headerIdx]).map((h) => h.toLowerCase().replace(/['"]/g, "").trim());
  const find = (...keys: string[]) => headers.findIndex((h) => keys.some((k) => h.includes(k)));
  const dateCol = find("date");
  const descCol = find("narration", "description", "particular", "details", "remark", "transaction");
  const debitCol = find("debit", "withdrawal", "withdrawl", "dr amount");
  const creditCol = find("credit", "deposit", "cr amount");
  const amtCol = find("amount");

  const rows: StatementRow[] = [];
  let skipped = 0;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 2 || /^(opening|closing|statement|total)/i.test(cols[0])) continue;
    const date = parseStatementDate((cols[dateCol] || "").replace(/['"]/g, ""));
    if (!date) { skipped++; continue; }
    const description = (cols[descCol] ?? cols[1] ?? "").replace(/['"]/g, "").trim() || "Transaction";
    let amount = 0; let type: "credit" | "debit" = "credit";
    if (debitCol >= 0 && creditCol >= 0) {
      const credit = parseAmount(cols[creditCol] || ""); const debit = parseAmount(cols[debitCol] || "");
      if (credit > 0) { amount = credit; type = "credit"; } else if (debit > 0) { amount = debit; type = "debit"; }
    } else if (amtCol >= 0) {
      const raw = cols[amtCol] || "";
      amount = parseAmount(raw);
      type = /\(|^-|dr$/i.test(raw.trim()) ? "debit" : "credit";
    }
    if (!(amount > 0)) { skipped++; continue; }
    rows.push({ date, description, amount, type });
  }
  return { rows, skipped, headerFound: true };
}
