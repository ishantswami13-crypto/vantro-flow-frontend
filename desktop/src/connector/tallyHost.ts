// Local Tally connector host — the desktop evolution of the CLI bridge
// (vantro-flow-backend/tally-connector/tally-sync.mjs). Same wire protocol,
// same parser (packages/contracts/src/tally.ts, parity-tested against the CLI),
// same device credential model; what changes is where it lives: inside the
// Starlane app, running while the window is hidden in the tray.
//
// Credentials
//   Pairing: the signed-in owner asks Starlane for a one-time code, the host
//   claims it immediately, and the long-lived device secret goes straight to the
//   OS credential store ('device:tally'). It is only ever exchanged for a
//   15-minute device token; imports never carry the owner's session.
//
// Sync
//   Pull the Day Book (financial-year start → today) from TallyPrime's local
//   HTTP server, parse, and send in chunks. The server import is idempotent, so
//   a run after an outage re-sends the whole window and nothing is lost or
//   duplicated — that is the offline recovery, and it is deliberate: no local
//   queue of financial records sits on disk.
//
// Honesty
//   Every attempt becomes a sync run on the server (succeeded or failed with a
//   reason), so Sources/Now show the real state, never a hopeful one.
import {
  ApiError, OfflineError, billsReceivableRequestXML, companyListRequestXML, dayBefore, dayBookRequestXML, debtorContactsRequestXML,
  financialYearStart, openingBillVouchers, parseCompanies, parseLedgerContacts, parseOpeningBills, tallyDateToISO, voucherIdentities,
  parseVouchers, tallyDate, tallyErrorOf, toApiVouchers, type DeviceClaim,
} from '@starlane/contracts';
import { api, getPrefs, savePrefs, track } from '../api';
import { platformFetch, secrets } from '../platform';

export type HostPhase =
  | 'unpaired'          // no device credential on this computer
  | 'idle'              // paired, waiting for the next run
  | 'syncing'
  | 'tally_unreachable' // TallyPrime closed or "Act as Server" off
  | 'starlane_offline'  // no route to Starlane; will retry
  | 'error'             // Starlane refused the data or something unexpected
  | 'revoked';          // device revoked from another place; must re-pair

export interface HostState {
  phase: HostPhase;
  message: string | null;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  last: { received: number; imported: number; rejected: number; skipped: number } | null;
  nextRunAt: string | null;
  deviceId: string | null;
  env: string | null;
}

interface StoredDevice extends DeviceClaim { pairedAt: string }

const CHUNK = 2000;
// TallyPrime's "Act as Server" port: 9000 by default; offices that run two
// Tally instances usually pick the next few. The app's HTTP permission allows
// exactly these (src-tauri/capabilities/default.json).
export const TALLY_PORTS = [9000, 9001, 9002, 9003, 9004, 9005];
const TALLY_TIMEOUT_MS = 60_000;

class TallyHost {
  state: HostState = { phase: 'unpaired', message: null, lastAttemptAt: null, lastSuccessAt: null, last: null, nextRunAt: null, deviceId: null, env: null };
  private listeners = new Set<(s: HostState) => void>();
  private device: StoredDevice | null = null;
  private token: { value: string; expiresAt: number } | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private failures = 0;
  private running: Promise<void> | null = null;

  subscribe(cb: (s: HostState) => void) { this.listeners.add(cb); cb(this.state); return () => { this.listeners.delete(cb); }; }
  private set(patch: Partial<HostState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach((cb) => cb(this.state)); }

  /** Called once at start-up (and after sign-in). */
  async start() {
    this.device = await secrets.getJSON<StoredDevice>('device:tally');
    if (!this.device) { this.set({ phase: 'unpaired', deviceId: null, env: null }); return; }
    this.set({ phase: 'idle', deviceId: this.device.deviceId, env: this.device.env, message: null });
    this.schedule(5_000);
  }

  stop() { if (this.timer) clearTimeout(this.timer); this.timer = null; }

  private tallyUrl(port = getPrefs().tally.port) { return `http://127.0.0.1:${port}`; }

  private async tallyPost(xml: string, port?: number, timeoutMs = TALLY_TIMEOUT_MS): Promise<string> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await platformFetch(this.tallyUrl(port), { method: 'POST', headers: { 'Content-Type': 'text/xml' }, body: xml, signal: ctrl.signal });
      const buf = new Uint8Array(await res.arrayBuffer());
      // TallyPrime answers UTF-8 by default and UTF-16LE when configured to.
      const utf16 = (buf[0] === 0xff && buf[1] === 0xfe) || (buf.length > 1 && buf[1] === 0 && buf[0] === 0x3c);
      return new TextDecoder(utf16 ? 'utf-16le' : 'utf-8').decode(buf);
    } catch (e) {
      throw new TallyUnreachable((e as Error)?.name === 'AbortError' ? 'Tally took too long to respond.' : undefined);
    } finally { clearTimeout(t); }
  }

  /**
   * Is TallyPrime answering on this computer, and which companies are open?
   * Tries the remembered port first, then the other usual ones, and remembers
   * whichever answers — so a changed Tally port needs no settings.
   */
  async discover(): Promise<{ reachable: boolean; companies: string[]; message: string | null; port: number | null }> {
    const saved = getPrefs().tally.port;
    const order = [saved, ...TALLY_PORTS.filter((p) => p !== saved)];
    let lastError: string | null = null;
    for (const port of order) {
      try {
        const xml = await this.tallyPost(companyListRequestXML(), port, port === saved ? 8000 : 2500);
        if (port !== saved) await savePrefs({ tally: { ...getPrefs().tally, port } });
        const err = tallyErrorOf(xml);
        if (err) return { reachable: true, companies: [], message: err, port };
        return { reachable: true, companies: parseCompanies(xml), message: null, port };
      } catch (e) {
        lastError = (e as Error).message;
      }
    }
    return { reachable: false, companies: [], message: lastError, port: null };
  }

  /** Pair this computer as the owner's Tally device (owner must be signed in). */
  async pair(deviceName: string) {
    track('client.connector_setup_started', { connector: 'tally' });
    try {
      const pairing = await api().pairing('tally');
      const claim = await api().device.claim(pairing.code, deviceName);
      this.device = { ...claim, pairedAt: new Date().toISOString() };
      await secrets.set('device:tally', JSON.stringify(this.device));
      this.token = null;
      this.failures = 0;
      this.set({ phase: 'idle', deviceId: claim.deviceId, env: claim.env, message: null });
      track('client.connector_setup_completed', { connector: 'tally' });
    } catch (e) {
      track('client.connector_setup_failed', { connector: 'tally', error_code: e instanceof ApiError ? String(e.status) : (e as Error).name });
      throw e;
    }
  }

  /** Sign this computer out of Tally sync: tell Starlane, then forget the secret. */
  async disconnect() {
    this.stop();
    try { await api().device.disconnect(await this.deviceToken()); } catch { /* revoke locally regardless */ }
    await this.forget('unpaired', null);
  }

  private async forget(phase: HostPhase, message: string | null) {
    this.device = null; this.token = null;
    await secrets.delete('device:tally').catch(() => {});
    this.set({ phase, message, deviceId: null, nextRunAt: null });
  }

  private async deviceToken(): Promise<string> {
    if (this.token && this.token.expiresAt - Date.now() > 60_000) return this.token.value;
    if (!this.device) throw new Error('not paired');
    try {
      const t = await api().device.token(this.device.deviceId, this.device.deviceSecret);
      this.token = { value: t.accessToken, expiresAt: Date.parse(t.expiresAt) };
      return t.accessToken;
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        await this.forget('revoked', 'This computer was disconnected from Tally sync. Pair it again to resume.');
        throw new Revoked();
      }
      throw e;
    }
  }

  syncNow() {
    if (!this.running) this.running = this.run().finally(() => { this.running = null; });
    return this.running;
  }

  private schedule(ms: number) {
    this.stop();
    if (!this.device) return;
    this.set({ nextRunAt: new Date(Date.now() + ms).toISOString() });
    this.timer = setTimeout(() => { void this.syncNow(); }, ms);
  }

  private async run() {
    if (!this.device) return;
    const started = Date.now();
    this.set({ phase: 'syncing', message: null, lastAttemptAt: new Date().toISOString(), nextRunAt: null });
    let runId: string | null = null;
    let token: string | null = null;
    try {
      token = await this.deviceToken();
      runId = await api().device.startRun(token);

      const { company } = getPrefs().tally;
      const rangeFrom = financialYearStart(), rangeTo = tallyDate(new Date());
      const request = dayBookRequestXML(rangeFrom, rangeTo, company);
      let xml: string;
      try {
        xml = await this.tallyPost(request);
      } catch (e) {
        // Tally may have moved to another port: find it once, then retry.
        if (!(e instanceof TallyUnreachable)) throw e;
        const found = await this.discover();
        if (!found.reachable) throw e;
        xml = await this.tallyPost(request);
      }
      const tallyErr = tallyErrorOf(xml);
      if (tallyErr) throw new TallyRefused(tallyErr);
      const allVouchers = parseVouchers(xml);
      const parsed = toApiVouchers(allVouchers);
      const skipped = parsed.skipped;
      // Bills from earlier years still unpaid when the day book starts, sent first
      // so receipts in the range can settle them. The day book is the sync; if
      // Tally will not export this report, the sync goes on without it.
      let opening: ReturnType<typeof openingBillVouchers> = [];
      try {
        const asOf = dayBefore(financialYearStart());
        const billsXml = await this.tallyPost(billsReceivableRequestXML(asOf, company));
        if (!tallyErrorOf(billsXml)) opening = openingBillVouchers(parseOpeningBills(billsXml, asOf).bills);
        else track('client.opening_bills_failed', { connector: 'tally', error_code: 'tally_error' });
      } catch {
        track('client.opening_bills_failed', { connector: 'tally', error_code: 'unreachable' });
      }
      const rows = [...opening, ...parsed.rows];
      // Customers' mobile numbers from their Tally ledgers, so reminders can reach
      // them; Starlane uses them only where it has no number. Optional, like the above.
      let contacts: ReturnType<typeof parseLedgerContacts> = [];
      try {
        const contactsXml = await this.tallyPost(debtorContactsRequestXML(company));
        if (!tallyErrorOf(contactsXml)) contacts = parseLedgerContacts(contactsXml);
      } catch { /* the sync goes on without them */ }

      let imported = 0, rejected = 0;
      if (rows.length === 0) {
        // An empty day book is a real answer; record it rather than inventing activity.
        const r = await api().device.importTally(token, runId, [], contacts);
        imported = sum(r.imported);
      }
      for (let i = 0; i < rows.length; i += CHUNK) {
        // Each chunk is its own run; track the open one so a failure below
        // closes it instead of leaving it 'running' on the server.
        if (i > 0) runId = await api().device.startRun(token);
        const r = await api().device.importTally(token, runId as string, rows.slice(i, i + CHUNK), i === 0 ? contacts : undefined);
        imported += sum(r.imported);
        rejected += r.rejected?.length || 0;
      }
      // Everything imported, so what Tally no longer has in the range was deleted there.
      // Starlane holds back (and says so) when an export looks partial.
      const recon = await api().device.reconcileTally(token, {
        from: tallyDateToISO(rangeFrom) || rangeFrom, to: tallyDateToISO(rangeTo) || rangeTo, present: voucherIdentities(allVouchers),
      }).catch(() => null);
      this.failures = 0;
      const now = new Date().toISOString();
      this.set({ phase: 'idle', lastSuccessAt: now, last: { received: rows.length + skipped.length, imported, rejected, skipped: skipped.length },
        message: recon?.held ? recon.message : null });
      track('client.local_sync_succeeded', { connector: 'tally', duration_ms: Date.now() - started });
    } catch (e) {
      this.failures++;
      const { phase, message, code } = describe(e);
      if (phase === 'revoked') return; // forget() already set state; no reschedule
      // Closed as failed with the error code. If Starlane is unreachable the
      // server closes the run itself as timed out.
      if (runId && token && phase !== 'starlane_offline') await api().device.failRun(token, runId, message, code).catch(() => {});
      else if (!runId && token && phase === 'tally_unreachable') {
        // Make sure Starlane knows why nothing arrived.
        try { const id = await api().device.startRun(token); await api().device.failRun(token, id, message, code); } catch { /* offline */ }
      }
      this.set({ phase, message });
      track('client.local_sync_failed', { connector: 'tally', error_code: code, duration_ms: Date.now() - started });
    } finally {
      if (this.device) {
        const interval = getPrefs().tally.intervalMin * 60_000;
        const backoff = this.failures ? Math.min(interval, 60_000 * 2 ** (this.failures - 1)) : interval;
        this.schedule(backoff);
      }
    }
  }

  async setCompany(company: string | null) { await savePrefs({ tally: { ...getPrefs().tally, company } }); }
}

class TallyUnreachable extends Error { constructor(msg?: string) { super(msg || 'TallyPrime is not answering on this computer. Open TallyPrime and turn on “Act as Server” (F1 › Settings › Connectivity).'); } }
class TallyRefused extends Error {}
class Revoked extends Error {}

function describe(e: unknown): { phase: HostPhase; message: string; code: string } {
  if (e instanceof Revoked) return { phase: 'revoked', message: 'revoked', code: 'revoked' };
  if (e instanceof TallyUnreachable) return { phase: 'tally_unreachable', message: e.message, code: 'tally_unreachable' };
  if (e instanceof TallyRefused) return { phase: 'error', message: `Tally refused the export: ${e.message}`, code: 'tally_error' };
  if (e instanceof OfflineError) return { phase: 'starlane_offline', message: 'Starlane cannot be reached from this computer. Sync will retry automatically.', code: 'offline' };
  if (e instanceof ApiError) return { phase: 'error', message: e.message, code: String(e.status) };
  return { phase: 'error', message: (e as Error)?.message || 'Unexpected error', code: 'unknown' };
}

const sum = (o: Record<string, number> | undefined) => Object.values(o || {}).reduce((a, b) => a + (Number(b) || 0), 0);

export const tallyHost = new TallyHost();
