// Parity: the shared TypeScript parser (src/tally.ts) must produce exactly what
// the CLI bridge (vantro-flow-backend/tally-connector/tally-sync.mjs --test)
// produces for the same day book. Run with Node 22+:
//   node --experimental-strip-types scripts/tally-parity.mjs <path-to-backend>
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { parseVouchers, toApiVouchers, parseCompanies, parseOpeningBills, openingBillVouchers, dayBefore, financialYearStart, parseLedgerContacts, voucherIdentities } from '../src/tally.ts';

const backend = process.argv[2] || '../../../vantro-flow-backend';
let ok = true;
// The plain day book, and one with bill-wise details (credit periods, receipts and
// a credit note against named bills, an on-account receipt, element-order quirks).
for (const sample of ['sample-daybook.xml', 'sample-daybook-billwise.xml', 'sample-daybook-corrections.xml']) {
  const xml = readFileSync(join(backend, 'tally-connector', sample), 'utf8');
  const ts = toApiVouchers(parseVouchers(xml)).rows;
  const out = execFileSync(process.execPath, ['tally-connector/tally-sync.mjs', '--test', `--sample=${sample}`], { cwd: backend, encoding: 'utf8' });
  const cli = JSON.parse(out.slice(out.indexOf('\n[') + 1, out.lastIndexOf('\n]') + 2));
  const same = JSON.stringify(ts) === JSON.stringify(cli);
  ok = ok && same;
  console.log(same ? `PASS parity (${sample}): ${ts.length} vouchers identical` : `FAIL parity (${sample}): outputs differ`);
}
// Bills still unpaid when the range starts (Bills Receivable), sent ahead of the day book.
{
  const sample = 'sample-daybook-billwise.xml', opening = 'sample-bills-receivable.xml';
  const asOf = dayBefore(financialYearStart());
  const ts = [
    ...openingBillVouchers(parseOpeningBills(readFileSync(join(backend, 'tally-connector', opening), 'utf8'), asOf).bills),
    ...toApiVouchers(parseVouchers(readFileSync(join(backend, 'tally-connector', sample), 'utf8'))).rows,
  ];
  const out = execFileSync(process.execPath, ['tally-connector/tally-sync.mjs', '--test', `--sample=${sample}`, `--opening=${opening}`], { cwd: backend, encoding: 'utf8' });
  const cli = JSON.parse(out.slice(out.indexOf('\n[') + 1, out.lastIndexOf('\n]') + 2));
  const same = JSON.stringify(ts) === JSON.stringify(cli) && ts.filter((v) => v.type === 'Opening Bill').length === 3;
  ok = ok && same;
  console.log(same ? `PASS parity (${opening} + ${sample}): ${ts.length} vouchers identical` : `FAIL parity (${opening}): outputs differ`);
}
// Customers' phone numbers from the debtor ledgers.
{
  const file = 'sample-ledger-contacts.xml';
  const ts = parseLedgerContacts(readFileSync(join(backend, 'tally-connector', file), 'utf8'));
  const out = execFileSync(process.execPath, ['tally-connector/tally-sync.mjs', '--test', `--contacts=${file}`], { cwd: backend, encoding: 'utf8' });
  const line = out.split('\n').find((l) => l.includes('customer phone numbers that WOULD be sent')) || '';
  const cli = JSON.parse(line.slice(line.indexOf('[')) || '[]');
  const same = JSON.stringify(ts) === JSON.stringify(cli) && ts.length === 4 && ts.some((c) => c.party === 'Gupta & Sons');
  ok = ok && same;
  console.log(same ? `PASS parity (${file}): ${ts.length} contacts identical` : `FAIL parity (${file}): ${JSON.stringify(ts)} vs ${JSON.stringify(cli)}`);
}
// Voucher identities sent after a sync to detect deletions (optional vouchers left out).
{
  const sample = 'sample-daybook-corrections.xml';
  const ts = voucherIdentities(parseVouchers(readFileSync(join(backend, 'tally-connector', sample), 'utf8')));
  const out = execFileSync(process.execPath, ['tally-connector/tally-sync.mjs', '--test', `--sample=${sample}`], { cwd: backend, encoding: 'utf8' });
  const line = out.split('\n').find((l) => l.includes('WOULD be checked for deletions')) || '';
  const cli = JSON.parse(line.slice(line.indexOf('[')) || '[]');
  const same = JSON.stringify(ts) === JSON.stringify(cli) && ts.length === 7 && !ts.some((v) => v.voucherNo === 'S/204');
  ok = ok && same;
  console.log(same ? `PASS parity (${sample} identities): ${ts.length} identical, optional voucher left out` : `FAIL parity (${sample} identities)`);
}
const companies = parseCompanies('<ENVELOPE><BODY><DATA><COLLECTION><COMPANY NAME="Rao Distributors"><NAME>Rao Distributors</NAME></COMPANY><COMPANY NAME="Rao &amp; Sons"/></COLLECTION></DATA></BODY></ENVELOPE>');
const cOk = companies.join('|') === 'Rao Distributors|Rao & Sons';
console.log(cOk ? 'PASS company list parsing' : `FAIL company list parsing: ${companies}`);
process.exit(ok && cOk ? 0 : 1);
