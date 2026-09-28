// TallyPrime XML: request bodies and parsing, shared by the Starlane desktop
// connector host. A faithful TypeScript port of the zero-dependency parser in
// vantro-flow-backend/tally-connector/tally-sync.mjs (the CLI bridge) — the
// parity test (scripts/tally-parity.mjs) checks both produce identical
// vouchers for the bundled sample day book. Pure functions: no I/O here.

/** A bill-wise allocation on the party's ledger entry ("New Ref" raises a bill; "Agst Ref" settles one). */
export interface TallyBill { name: string; type: 'new' | 'against' | 'advance' | 'on_account' | 'other'; amount: number; creditPeriod: string | null }
export interface TallyVoucher {
  type: string;
  date: string | null;
  party: string | null;
  voucherNo: string;
  amount: number | null;
  items: Array<{ name: string; qty: number; rate: number }>;
  /** ISO due date from the bill's credit period (or the voucher's), when Tally has one. */
  dueDate: string | null;
  bills: TallyBill[];
}
export interface ApiVoucher {
  type: string; date: string; party: string; voucherNo: string; amount: number; items: TallyVoucher['items'];
  dueDate: string | null; bills: Array<{ name: string; type: TallyBill['type']; amount: number }>;
}

export const DEFAULT_VOUCHER_TYPES = ['Sales', 'Purchase', 'Receipt', 'Payment', 'Credit Note', 'Debit Note'];
export const DEFAULT_TALLY_PORT = 9000;

const pad = (n: number) => String(n).padStart(2, '0');
export const tallyDate = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
/** Indian financial year starts 1 April. */
export function financialYearStart(now = new Date()): string {
  const y = now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}0401`;
}
export function tallyDateToISO(yyyymmdd: string | null): string | null {
  const s = String(yyyymmdd || '').trim();
  if (!/^\d{8}$/.test(s)) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function escapeXml(s: string) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function dayBookRequestXML(fromDate: string, toDate: string, company?: string | null): string {
  const companyTag = company ? `<SVCURRENTCOMPANY>${escapeXml(company)}</SVCURRENTCOMPANY>` : '';
  return `<ENVELOPE>
 <HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export</TALLYREQUEST>
  <TYPE>Data</TYPE>
  <ID>Day Book</ID>
 </HEADER>
 <BODY>
  <DESC>
   <STATICVARIABLES>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    <SVFROMDATE TYPE="Date">${fromDate}</SVFROMDATE>
    <SVTODATE TYPE="Date">${toDate}</SVTODATE>
    ${companyTag}
   </STATICVARIABLES>
  </DESC>
 </BODY>
</ENVELOPE>`;
}

/** The day before a Tally date (YYYYMMDD): the "as of" date for bills still open when a sync range starts. */
export function dayBefore(yyyymmdd: string): string {
  const iso = tallyDateToISO(yyyymmdd);
  if (!iso) return yyyymmdd;
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

/** Tally's Bills Receivable report as of a date: every sales bill still unpaid then. */
export function billsReceivableRequestXML(asOf: string, company?: string | null): string {
  const companyTag = company ? `<SVCURRENTCOMPANY>${escapeXml(company)}</SVCURRENTCOMPANY>` : '';
  return `<ENVELOPE>
 <HEADER>
  <VERSION>1</VERSION>
  <TALLYREQUEST>Export</TALLYREQUEST>
  <TYPE>Data</TYPE>
  <ID>Bills Receivable</ID>
 </HEADER>
 <BODY>
  <DESC>
   <STATICVARIABLES>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    <SVTODATE TYPE="Date">${asOf}</SVTODATE>
    ${companyTag}
   </STATICVARIABLES>
  </DESC>
 </BODY>
</ENVELOPE>`;
}

/**
 * Asks Tally for its customers' ledgers (everything under Sundry Debtors), with
 * only the name and phone fields — no addresses, tax numbers or balances.
 */
export function debtorContactsRequestXML(company?: string | null): string {
  const companyTag = company ? `<SVCURRENTCOMPANY>${escapeXml(company)}</SVCURRENTCOMPANY>` : '';
  return `<ENVELOPE>
 <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>StarlaneDebtorContacts</ID></HEADER>
 <BODY><DESC>
  <STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>${companyTag}</STATICVARIABLES>
  <TDL><TDLMESSAGE>
   <COLLECTION NAME="StarlaneDebtorContacts" ISMODIFY="No"><TYPE>Ledger</TYPE><CHILDOF>$$GroupSundryDebtors</CHILDOF><BELONGSTO>Yes</BELONGSTO><FETCH>NAME, LEDGERMOBILE, LEDGERPHONE</FETCH></COLLECTION>
  </TDLMESSAGE></TDL>
 </DESC></BODY>
</ENVELOPE>`;
}

/** Asks Tally which companies are loaded — used to discover and confirm the connection. */
export function companyListRequestXML(): string {
  return `<ENVELOPE>
 <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>StarlaneCompanies</ID></HEADER>
 <BODY><DESC>
  <STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
  <TDL><TDLMESSAGE>
   <COLLECTION NAME="StarlaneCompanies" ISMODIFY="No"><TYPE>Company</TYPE><FETCH>NAME</FETCH></COLLECTION>
  </TDLMESSAGE></TDL>
 </DESC></BODY>
</ENVELOPE>`;
}

function decode(s: string) {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#4;/g, '').trim();
}
function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : null;
}
function num(v: string | null): number {
  if (v == null) return NaN;
  return parseFloat(String(v).replace(/[₹,\s]/g, ''));
}
function qtyNum(v: string | null): number {
  if (v == null) return NaN;
  const m = String(v).match(/-?[\d.]+/);
  return m ? Math.abs(parseFloat(m[0])) : NaN;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
/** A date as Tally writes it in reports: "20260920", "20-Sep-2026" or "20-Sep-26". */
export function tallyAnyDateToISO(s: string | null): string | null {
  const p = String(s || '').trim();
  if (/^\d{8}$/.test(p)) return tallyDateToISO(p);
  const m = p.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/);
  const mon = m ? MONTHS[m[2].toLowerCase()] : undefined;
  if (m && mon) return `${m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])}-${pad(mon)}-${pad(Number(m[1]))}`;
  return null;
}
/** Tally writes a credit period as "30 Days" or as the due date itself ("20-Sep-2026", "20260920"). */
export function dueDateFrom(voucherDate: string | null, period: string | null): string | null {
  if (!period) return null;
  const p = period.trim();
  const days = p.match(/^(\d+)\s*days?$/i);
  const start = tallyDateToISO(voucherDate);
  if (days) {
    if (!start) return null;
    const d = new Date(`${start}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + Number(days[1]));
    return d.toISOString().slice(0, 10);
  }
  return tallyAnyDateToISO(p);
}
function billType(s: string | null): TallyBill['type'] {
  const t = String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (t === 'new ref') return 'new';
  if (t === 'agst ref') return 'against';
  if (t === 'advance') return 'advance';
  if (t === 'on account') return 'on_account';
  return 'other';
}
const BILLS_RE = /<BILLALLOCATIONS\.LIST>[\s\S]*?<\/BILLALLOCATIONS\.LIST>/gi;

export function parseCompanies(xml: string): string[] {
  const names = new Set<string>();
  for (const m of xml.matchAll(/<COMPANY\b[^>]*\bNAME="([^"]+)"/gi)) names.add(decode(m[1]));
  for (const block of xml.match(/<COMPANY\b[\s\S]*?<\/COMPANY>/gi) || []) {
    const n = tag(block, 'NAME');
    if (n) names.add(n);
  }
  return [...names].filter(Boolean);
}

export function parseVouchers(xml: string): TallyVoucher[] {
  const out: TallyVoucher[] = [];
  const blocks = xml.match(/<VOUCHER\b[\s\S]*?<\/VOUCHER>/gi) || [];
  for (const b of blocks) {
    const vchType = tag(b, 'VOUCHERTYPENAME') || (b.match(/<VOUCHER[^>]*VCHTYPE="([^"]*)"/i)?.[1] ?? '');
    const date = tag(b, 'DATE');
    const party = tag(b, 'PARTYLEDGERNAME') || tag(b, 'PARTYNAME');
    const vchNo = tag(b, 'VOUCHERNUMBER') || tag(b, 'MASTERID') || '';

    let amount = NaN;
    const entries = b.match(/<ALLLEDGERENTRIES\.LIST>[\s\S]*?<\/ALLLEDGERENTRIES\.LIST>/gi)
      || b.match(/<LEDGERENTRIES\.LIST>[\s\S]*?<\/LEDGERENTRIES\.LIST>/gi) || [];
    let maxAbs = NaN;
    let partyEntry: string | null = null;
    for (const e of entries) {
      // Read the entry's own tags with its bill allocations removed: Tally does not
      // guarantee the ledger AMOUNT comes before BILLALLOCATIONS.LIST.
      const own = e.replace(BILLS_RE, '');
      const ln = tag(own, 'LEDGERNAME');
      const amt = num(tag(own, 'AMOUNT'));
      if (party && ln && ln.toLowerCase() === party.toLowerCase()) partyEntry = e;
      if (!isNaN(amt)) {
        if (isNaN(maxAbs) || Math.abs(amt) > Math.abs(maxAbs)) maxAbs = amt;
        if (party && ln && ln.toLowerCase() === party.toLowerCase()) amount = amt;
      }
    }
    if (isNaN(amount)) amount = maxAbs;
    if (isNaN(amount)) amount = num(tag(b, 'AMOUNT'));

    const bills: TallyBill[] = [];
    for (const bl of (partyEntry || '').match(BILLS_RE) || []) {
      const name = tag(bl, 'NAME') || '';
      const amt = Math.abs(num(tag(bl, 'AMOUNT')));
      if (name && amt > 0) bills.push({ name, type: billType(tag(bl, 'BILLTYPE')), amount: amt, creditPeriod: tag(bl, 'BILLCREDITPERIOD') });
    }
    const raised = bills.find((x) => x.type === 'new' && x.creditPeriod);
    const dueDate = dueDateFrom(date, raised?.creditPeriod ?? null) ?? dueDateFrom(date, tag(b, 'BASICDUEDATEOFPYMT'));

    const items: TallyVoucher['items'] = [];
    const invEntries = b.match(/<ALLINVENTORYENTRIES\.LIST>[\s\S]*?<\/ALLINVENTORYENTRIES\.LIST>/gi)
      || b.match(/<INVENTORYENTRIES\.LIST>[\s\S]*?<\/INVENTORYENTRIES\.LIST>/gi) || [];
    for (const e of invEntries) {
      const name = tag(e, 'STOCKITEMNAME');
      const qty = qtyNum(tag(e, 'ACTUALQTY') || tag(e, 'BILLEDQTY'));
      const rate = num(tag(e, 'RATE'));
      if (name && !isNaN(qty) && qty > 0) items.push({ name, qty, rate: isNaN(rate) ? 0 : Math.abs(rate) });
    }

    out.push({ type: decode(vchType), date, party, voucherNo: vchNo, amount: isNaN(amount) ? null : Math.abs(amount), items, dueDate, bills });
  }
  return out;
}

export interface OpeningBill { party: string; billName: string; billDate: string; dueDate: string | null; pending: number }
/**
 * Parses the Bills Receivable report. Tally writes each bill as a BILLFIXED
 * block (date, reference, party) followed by its pending amount (BILLCL) and
 * due date (BILLDUE). Debit amounts are negative in Tally XML, so a bill owed
 * to the business is negative; anything else (an advance or credit balance)
 * is counted in `credits`, never turned into a receivable.
 */
export function parseOpeningBills(xml: string, asOf: string): { bills: OpeningBill[]; credits: number; unreadable: number } {
  const bills: OpeningBill[] = [];
  let credits = 0, unreadable = 0;
  const limit = tallyDateToISO(asOf);
  const parts = xml.split(/<BILLFIXED>/i).slice(1);
  for (const part of parts) {
    const end = part.search(/<\/BILLFIXED>/i);
    if (end < 0) { unreadable++; continue; }
    const fixed = part.slice(0, end);
    const rest = part.slice(end);
    const party = tag(fixed, 'BILLPARTY');
    const billName = tag(fixed, 'BILLREF');
    const billDate = tallyAnyDateToISO(tag(fixed, 'BILLDATE'));
    const amount = num(tag(rest, 'BILLCL'));
    if (!party || !billName || !billDate || isNaN(amount) || (limit && billDate > limit)) { unreadable++; continue; }
    if (amount >= 0) { credits++; continue; }
    bills.push({ party, billName, billDate, dueDate: tallyAnyDateToISO(tag(rest, 'BILLDUE')), pending: Math.round(-amount * 100) / 100 });
  }
  return { bills, credits, unreadable };
}
/** Opening bills as import rows: sent before the day book so later receipts find them. */
export function openingBillVouchers(bills: OpeningBill[]): ApiVoucher[] {
  return bills.map((b) => ({ type: 'Opening Bill', date: b.billDate, party: b.party, voucherNo: b.billName, amount: b.pending, items: [], dueDate: b.dueDate, bills: [] }));
}

export interface LedgerContact { party: string; phone: string }
/** Customers' phone numbers from the debtor ledgers (mobile first). Starlane keeps only valid mobiles. */
export function parseLedgerContacts(xml: string): LedgerContact[] {
  const out: LedgerContact[] = [];
  for (const block of xml.match(/<LEDGER\b[^>]*>[\s\S]*?<\/LEDGER>/gi) || []) {
    const party = decode(block.match(/^<LEDGER\b[^>]*\bNAME="([^"]*)"/i)?.[1] || '') || tag(block, 'NAME');
    const phone = tag(block, 'LEDGERMOBILE') || tag(block, 'LEDGERPHONE');
    if (party && phone) out.push({ party, phone });
  }
  return out;
}

export function toApiVouchers(vouchers: TallyVoucher[], wantedTypes: string[] = DEFAULT_VOUCHER_TYPES) {
  const wanted = wantedTypes.map((t) => t.toLowerCase());
  const rows: ApiVoucher[] = [];
  const skipped: TallyVoucher[] = [];
  for (const v of vouchers) {
    const typeMatch = wanted.some((w) => (v.type || '').toLowerCase().includes(w));
    const iso = tallyDateToISO(v.date);
    if (!typeMatch || !v.party || !v.amount || !iso || v.amount <= 0) { skipped.push(v); continue; }
    rows.push({ type: v.type, date: iso, party: v.party, voucherNo: v.voucherNo, amount: v.amount, items: v.items,
      dueDate: v.dueDate, bills: v.bills.map((x) => ({ name: x.name, type: x.type, amount: x.amount })) });
  }
  return { rows, skipped };
}

/** Tally answers errors inside a 200 response; surface them as messages a person can act on. */
export function tallyErrorOf(xml: string): string | null {
  const line = tag(xml, 'LINEERROR');
  if (line) return line;
  if (/<ENVELOPE>\s*<\/ENVELOPE>/i.test(xml)) return null;
  return null;
}
