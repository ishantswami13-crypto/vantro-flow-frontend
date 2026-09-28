// Parity: the shared TypeScript parser (src/tally.ts) must produce exactly what
// the CLI bridge (vantro-flow-backend/tally-connector/tally-sync.mjs --test)
// produces for the same day book. Run with Node 22+:
//   node --experimental-strip-types scripts/tally-parity.mjs <path-to-backend>
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { parseVouchers, toApiVouchers, parseCompanies } from '../src/tally.ts';

const backend = process.argv[2] || '../../../vantro-flow-backend';
let ok = true;
// The plain day book, and one with bill-wise details (credit periods, receipts and
// a credit note against named bills, an on-account receipt, element-order quirks).
for (const sample of ['sample-daybook.xml', 'sample-daybook-billwise.xml']) {
  const xml = readFileSync(join(backend, 'tally-connector', sample), 'utf8');
  const ts = toApiVouchers(parseVouchers(xml)).rows;
  const out = execFileSync(process.execPath, ['tally-connector/tally-sync.mjs', '--test', `--sample=${sample}`], { cwd: backend, encoding: 'utf8' });
  const cli = JSON.parse(out.slice(out.indexOf('\n[') + 1, out.lastIndexOf('\n]') + 2));
  const same = JSON.stringify(ts) === JSON.stringify(cli);
  ok = ok && same;
  console.log(same ? `PASS parity (${sample}): ${ts.length} vouchers identical` : `FAIL parity (${sample}): outputs differ`);
}
const companies = parseCompanies('<ENVELOPE><BODY><DATA><COLLECTION><COMPANY NAME="Rao Distributors"><NAME>Rao Distributors</NAME></COMPANY><COMPANY NAME="Rao &amp; Sons"/></COLLECTION></DATA></BODY></ENVELOPE>');
const cOk = companies.join('|') === 'Rao Distributors|Rao & Sons';
console.log(cOk ? 'PASS company list parsing' : `FAIL company list parsing: ${companies}`);
process.exit(ok && cOk ? 0 : 1);
