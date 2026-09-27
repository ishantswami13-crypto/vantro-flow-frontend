// TallyPrime XML: request bodies and parsing, shared by the Starlane desktop
// connector host. A faithful TypeScript port of the zero-dependency parser in
// vantro-flow-backend/tally-connector/tally-sync.mjs (the CLI bridge) — the
// parity test (scripts/tally-parity.mjs) checks both produce identical
// vouchers for the bundled sample day book. Pure functions: no I/O here.

export interface TallyVoucher {
  type: string;
  date: string | null;
  party: string | null;
  voucherNo: string;
  amount: number | null;
  items: Array<{ name: string; qty: number; rate: number }>;
}
export interface ApiVoucher { type: string; date: string; party: string; voucherNo: string; amount: number; items: TallyVoucher['items'] }

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
    for (const e of entries) {
      const ln = tag(e, 'LEDGERNAME');
      const amt = num(tag(e, 'AMOUNT'));
      if (!isNaN(amt)) {
        if (isNaN(maxAbs) || Math.abs(amt) > Math.abs(maxAbs)) maxAbs = amt;
        if (party && ln && ln.toLowerCase() === party.toLowerCase()) amount = amt;
      }
    }
    if (isNaN(amount)) amount = maxAbs;
    if (isNaN(amount)) amount = num(tag(b, 'AMOUNT'));

    const items: TallyVoucher['items'] = [];
    const invEntries = b.match(/<ALLINVENTORYENTRIES\.LIST>[\s\S]*?<\/ALLINVENTORYENTRIES\.LIST>/gi)
      || b.match(/<INVENTORYENTRIES\.LIST>[\s\S]*?<\/INVENTORYENTRIES\.LIST>/gi) || [];
    for (const e of invEntries) {
      const name = tag(e, 'STOCKITEMNAME');
      const qty = qtyNum(tag(e, 'ACTUALQTY') || tag(e, 'BILLEDQTY'));
      const rate = num(tag(e, 'RATE'));
      if (name && !isNaN(qty) && qty > 0) items.push({ name, qty, rate: isNaN(rate) ? 0 : Math.abs(rate) });
    }

    out.push({ type: decode(vchType), date, party, voucherNo: vchNo, amount: isNaN(amount) ? null : Math.abs(amount), items });
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
    rows.push({ type: v.type, date: iso, party: v.party, voucherNo: v.voucherNo, amount: v.amount, items: v.items });
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
