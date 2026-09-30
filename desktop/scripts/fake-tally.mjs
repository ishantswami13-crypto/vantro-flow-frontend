// A stand-in for TallyPrime's local HTTP server (port 9000), for testing the
// connector host without Tally. Answers the company-list request, the Bills
// Receivable report and the customer-ledger contacts with the backend
// repository's samples, and returns its sample Day Book for any other export.
// Test-only.
//   node scripts/fake-tally.mjs [path/to/vantro-flow-backend]
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const backend = resolve(process.argv[2] || process.env.BACKEND_DIR || '../../vantro-flow-backend');
const daybook = readFileSync(join(backend, 'tally-connector/sample-daybook.xml'), 'utf8');
const billsReceivable = readFileSync(join(backend, 'tally-connector/sample-bills-receivable.xml'), 'utf8');
const contacts = readFileSync(join(backend, 'tally-connector/sample-ledger-contacts.xml'), 'utf8');
const COMPANIES = '<ENVELOPE><BODY><DATA><COLLECTION><COMPANY NAME="Sample Company (test)"><NAME>Sample Company (test)</NAME></COMPANY></COLLECTION></DATA></BODY></ENVELOPE>';

http.createServer((req, res) => {
  // CORS only so the browser preview can call it; real Tally is reached through the app's native HTTP client.
  const cors = { 'Access-Control-Allow-Origin': 'http://localhost:1420', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    res.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8', ...cors });
    res.end(body.includes('StarlaneCompanies') ? COMPANIES : body.includes('<ID>Bills Receivable</ID>') ? billsReceivable
      : body.includes('StarlaneDebtorContacts') ? contacts : daybook);
  });
}).listen(9000, '127.0.0.1', () => console.log('fake Tally listening on 127.0.0.1:9000'));
