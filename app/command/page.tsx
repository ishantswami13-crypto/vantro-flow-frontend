"use client";

// Command Center: the business at a glance, laid out like Harvey's. Every
// figure is a sum over the tenant's own invoices (GET /api/invoices); the
// daily history is rebuilt from invoice, due and payment dates, so nothing
// here is estimated or invented.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StarlaneMark from "@/components/brand/StarlaneMark";
import { EntityPicker, EntityNote } from "@/components/entities/EntityPicker";
import { useActiveEntity } from "@/lib/entities";
import { currencyOf, useCurrencyView } from "@/lib/currency";
import { CurrencyPicker, CurrencyLine } from "@/components/entities/CurrencyPicker";
import { api, getUser, type Invoice } from "@/lib/api";
import { decisionsApi } from "@/lib/decisions";
import {
  ALERT, BAR, BarcodeChart, INK, LINE, Legend, PairedBars, PillSelect, RankBars, SOFT, downloadCsv, type DayPoint,
} from "@/components/command/Charts";

const DAY = 86_400_000;
type Range = "90" | "180" | "365";
const RANGES: { value: Range; label: string }[] = [
  { value: "90", label: "3 months" }, { value: "180", label: "6 months" }, { value: "365", label: "12 months" },
];

function dayIndex(iso: string | null | undefined, origin: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso.slice(0, 10) + "T00:00:00");
  return Number.isFinite(t) ? Math.round((t - origin) / DAY) : null;
}
const isoOf = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

interface Series { dates: string[]; owed: number[]; overdue: number[]; openCount: number[]; overdueCount: number[] }

/** Daily owed / overdue amounts and counts for the last `days` days, from dates alone. */
function buildSeries(invoices: Invoice[], days: number): Series {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const origin = now.getTime() - (days - 1) * DAY;
  const len = days + 1;
  const dOwed = new Float64Array(len), dOver = new Float64Array(len), dOpen = new Float64Array(len), dOverN = new Float64Array(len);
  const clamp = (i: number) => Math.max(0, Math.min(len - 1, i));
  for (const inv of invoices) {
    const paid = inv.payment_status === "Paid";
    const start = dayIndex(inv.invoice_date, origin);
    if (start == null) continue;
    const endRaw = paid ? dayIndex(inv.payment_date, origin) : null;
    if (paid && endRaw == null) continue; // paid on an unknown day: leave it out of the history
    const end = endRaw == null ? len - 1 : endRaw; // exclusive
    const amount = Math.max(0, Number(inv.invoice_amount) - (paid ? 0 : Number(inv.payment_amount || 0)));
    if (end <= 0 || start >= len - 1 || end <= start) continue;
    const s = clamp(start), e = clamp(end);
    dOwed[s] += amount; dOwed[e] -= amount; dOpen[s] += 1; dOpen[e] -= 1;
    const due = dayIndex(inv.due_date, origin);
    if (due != null) {
      const os = clamp(Math.max(start, due + 1));
      if (os < e) { dOver[os] += amount; dOver[e] -= amount; dOverN[os] += 1; dOverN[e] -= 1; }
    }
  }
  const out: Series = { dates: [], owed: [], overdue: [], openCount: [], overdueCount: [] };
  let a = 0, b = 0, c = 0, d = 0;
  for (let i = 0; i < days; i++) {
    a += dOwed[i]; b += dOver[i]; c += dOpen[i]; d += dOverN[i];
    out.dates.push(isoOf(origin + i * DAY));
    out.owed.push(Math.max(0, a)); out.overdue.push(Math.max(0, b)); out.openCount.push(Math.max(0, Math.round(c))); out.overdueCount.push(Math.max(0, Math.round(d)));
  }
  return out;
}

function Delta({ now, before, upIsGood = false }: { now: number; before: number; upIsGood?: boolean }) {
  if (!(before > 0)) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span className="cc-delta" style={{ color: "#8F8A81" }}>no change</span>;
  const up = pct > 0;
  const good = up === upIsGood;
  return (
    <span className="cc-delta" style={{ color: good ? "#2F7A4C" : "#A3392E" }} title="Change against 30 days ago">
      {up ? "↑" : "↓"} {Math.abs(pct)}%
    </span>
  );
}

function IconFilter() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3" /></svg>;
}

const STEPS: { value: "day" | "week"; label: string }[] = [{ value: "day", label: "Daily" }, { value: "week", label: "Weekly" }];

function IconDownload() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10" /></svg>;
}

export default function CommandCenterPage() {
  // Read after mount so the server and first client render agree.
  const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
  useEffect(() => { setUser(getUser()); }, []);
  const [range, setRange] = useState<Range>("180");
  const [range2, setRange2] = useState<Range>("180");
  const [rankBy, setRankBy] = useState<"owed" | "overdue">("owed");
  const [step, setStep] = useState<"day" | "week">("day");
  const [step2, setStep2] = useState<"day" | "week">("day");
  // The comparison line on the trend cards: one switch in the header, or each card's filter button.
  const [line1, setLine1] = useState(true);
  const [line2, setLine2] = useState(true);
  const compare = line1 && line2;

  const invoicesQ = useQuery({
    queryKey: ["command-invoices", user?.id],
    queryFn: () => api.invoices.list(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
  const decisionsQ = useQuery({ queryKey: ["decisions", "active"], queryFn: () => decisionsApi.list("active"), staleTime: 30_000 });

  // Spaces: only the chosen company's customers, or everyone under All companies.
  const { entity, keepCustomer, customerEntity } = useActiveEntity();
  const scoped = useMemo(() => (invoicesQ.data?.invoices ?? []).filter((i) => keepCustomer(i.customer_name)), [invoicesQ.data, keepCustomer]);
  // Currencies: every figure below is in one currency, never converted or mixed.
  const curOf = useCallback((i: Invoice) => currencyOf(i, customerEntity(i.customer_name)), [customerEntity]);
  const owedOf = useCallback((i: Invoice) => (i.payment_status === "Paid" ? 0 : Number(i.invoice_amount) - Number(i.payment_amount || 0)), []);
  const curView = useCurrencyView(scoped, curOf, owedOf);
  const { inCur: invoices, fmt: money } = curView;
  // One year plus the 30-day comparison window, sliced per card.
  const full = useMemo(() => buildSeries(invoices, 395), [invoices]);
  const last = full.dates.length - 1;
  const ago = last - 30;

  const slice = (days: number, bar: number[], line: number[]): DayPoint[] =>
    full.dates.slice(-days).map((date, i) => ({ date, bar: bar[bar.length - days + i], line: line[line.length - days + i] }));

  const owedSeries = useMemo(() => slice(Number(range), full.owed, full.overdue), [full, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const countSeries = useMemo(() => slice(Number(range2), full.overdueCount, full.openCount), [full, range2]); // eslint-disable-line react-hooks/exhaustive-deps

  // Open invoices today, by how late they are.
  const open = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return invoices.filter((i) => i.payment_status !== "Paid").map((i) => {
      const due = i.due_date ? Date.parse(i.due_date.slice(0, 10) + "T00:00:00") : NaN;
      const late = Number.isFinite(due) ? Math.floor((today.getTime() - due) / DAY) : Number(i.days_overdue || 0);
      return { name: i.customer_name || "Unnamed customer", amount: Math.max(0, Number(i.invoice_amount) - Number(i.payment_amount || 0)), late };
    });
  }, [invoices]);

  const buckets = useMemo(() => {
    const defs = [
      { label: "Not due", test: (d: number) => d <= 0 },
      { label: "1–30", test: (d: number) => d >= 1 && d <= 30 },
      { label: "31–60", test: (d: number) => d >= 31 && d <= 60 },
      { label: "61–90", test: (d: number) => d >= 61 && d <= 90 },
      { label: "90+", test: (d: number) => d > 90, alert: true },
    ];
    const totA = open.reduce((s, o) => s + o.amount, 0) || 1;
    const totN = open.length || 1;
    return defs.map((b) => {
      const rows = open.filter((o) => b.test(o.late));
      const amt = rows.reduce((s, o) => s + o.amount, 0);
      return { label: b.label, a: (amt / totA) * 100, b: (rows.length / totN) * 100, alert: !!b.alert && rows.length > 0, amount: amt, count: rows.length,
        aTitle: `${money(amt)} (${Math.round((amt / totA) * 100)}% of what you're owed)`, bTitle: `${rows.length} invoice${rows.length === 1 ? "" : "s"} (${Math.round((rows.length / totN) * 100)}%)` };
    });
  }, [open]);

  const top = useMemo(() => {
    const by = new Map<string, { owed: number; overdue: number; worst: number }>();
    for (const o of open) {
      const r = by.get(o.name) || { owed: 0, overdue: 0, worst: 0 };
      r.owed += o.amount; if (o.late > 0) r.overdue += o.amount; r.worst = Math.max(r.worst, o.late);
      by.set(o.name, r);
    }
    return [...by.entries()].map(([label, r]) => ({ label, value: rankBy === "owed" ? r.owed : r.overdue, alert: r.worst > 90 }))
      .filter((r) => r.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [open, rankBy]);

  // Money in, as on the public site's Command Center: what was collected this
  // quarter (against the same stretch of last quarter), the share of invoices
  // paid by their due date over six months, and how long payment takes.
  const collected = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const pStart = new Date(qStart.getFullYear(), qStart.getMonth() - 3, 1);
    const pEnd = pStart.getTime() + (now.getTime() - qStart.getTime());
    const sixAgo = now.getTime() - 182 * DAY;
    let thisQ = 0, lastQ = 0, onTime = 0, judged = 0, daysSum = 0, daysN = 0, dueSoon = 0;
    for (const inv of invoices) {
      const due = inv.due_date ? Date.parse(inv.due_date.slice(0, 10) + "T00:00:00") : NaN;
      if (inv.payment_status !== "Paid") {
        const owed = Math.max(0, Number(inv.invoice_amount) - Number(inv.payment_amount || 0));
        if (Number.isFinite(due) && due >= now.getTime() && due < now.getTime() + 30 * DAY) dueSoon += owed;
        continue;
      }
      const paid = inv.payment_date ? Date.parse(inv.payment_date.slice(0, 10) + "T00:00:00") : NaN;
      if (!Number.isFinite(paid)) continue;
      const amt = Number(inv.payment_amount || inv.invoice_amount) || 0;
      if (paid >= qStart.getTime() && paid <= now.getTime()) thisQ += amt;
      else if (paid >= pStart.getTime() && paid <= pEnd) lastQ += amt;
      if (paid >= sixAgo && Number.isFinite(due)) { judged++; if (paid <= due) onTime++; }
      const issued = inv.invoice_date ? Date.parse(inv.invoice_date.slice(0, 10) + "T00:00:00") : NaN;
      if (paid >= sixAgo && Number.isFinite(issued) && paid >= issued) { daysSum += (paid - issued) / DAY; daysN++; }
    }
    return { thisQ, lastQ, onTimePct: judged ? (onTime / judged) * 100 : null, judged, avgDays: daysN ? Math.round(daysSum / daysN) : null, dueSoon };
  }, [invoices]);

  const pending = decisionsQ.data?.decisions?.length ?? 0;
  const bizName = (user?.business_name || "").trim();
  const short = bizName.replace(/\s+(Pvt\.?\s*Ltd\.?|Private Limited|Ltd\.?|LLP)$/i, "");
  const who = entity?.name || short;
  const owner = who ? `${who}${/s$/i.test(who) ? "’" : "’s"}` : "Your";
  const loading = invoicesQ.isLoading;
  const empty = !loading && scoped.length === 0;

  return (
    <DashboardLayout pageTitle="Command Center">
      <div className="cc">
        <header className="cc-head">
          <h1 className="cc-title">{owner} Command Center</h1>
          <div className="cc-actions">
            <EntityPicker />
            <CurrencyPicker totals={curView.totals} cur={curView.cur} setCur={curView.setCur} />
            <button type="button" role="switch" aria-checked={compare} className="cc-toggle"
              onClick={() => { setLine1(!compare); setLine2(!compare); }}>
              <span className="cc-switch" aria-hidden="true" /> Compare
            </button>
            <Link href="/space?tab=reports" className="cc-btn">View all reports</Link>
            <Link href="/decisions" className="cc-btn">View all decisions</Link>
            <Link href="/bridge" className="cc-btn cc-btn-ink"><StarlaneMark variant="glyph" size={12} /> Ask Starlane</Link>
          </div>
        </header>

        <Link href={pending > 0 ? "/decisions" : "/sources"} className="cc-banner">
          <span className="cc-banner-mark"><StarlaneMark variant="glyph" size={10} /></span>
          {pending > 0
            ? <>There {pending === 1 ? "is" : "are"} {pending} decision{pending === 1 ? "" : "s"} waiting on you to recover what you&rsquo;re owed</>
            : empty ? <>Bring your receivables in to fill this page</> : <>Nothing is waiting on a decision right now</>}
        </Link>

        <EntityNote />
        <CurrencyLine totals={curView.totals} cur={curView.cur} setCur={curView.setCur} />

        {invoicesQ.isError && <p role="alert" className="cc-note" style={{ color: "#A3392E" }}>Couldn&rsquo;t load your invoices. {(invoicesQ.error as Error).message}</p>}

        <div className="rv-stats cc-money" aria-label="Money in">
          <div className="sp-stat">
            <div className="sp-stat-n">{loading ? "—" : money(collected.thisQ)} <Delta now={collected.thisQ} before={collected.lastQ} upIsGood /></div>
            <div className="sp-stat-l">Collected this quarter</div>
          </div>
          <div className="sp-stat" title={collected.judged ? `${collected.judged} invoices paid in the last 6 months` : undefined}>
            <div className="sp-stat-n">{loading ? "—" : collected.onTimePct == null ? "—" : `${collected.onTimePct.toFixed(1)}%`}</div>
            <div className="sp-stat-l">Collected on time, last 6 months</div>
          </div>
          <div className="sp-stat">
            <div className="sp-stat-n">{loading ? "—" : collected.avgDays == null ? "—" : `${collected.avgDays} days`}</div>
            <div className="sp-stat-l">Average time to get paid</div>
          </div>
          <div className="sp-stat">
            <div className="sp-stat-n">{loading ? "—" : money(collected.dueSoon)}</div>
            <div className="sp-stat-l">Falls due in the next 30 days</div>
          </div>
        </div>

        <div className="cc-grid">
          {/* Owed to you */}
          <section className="cc-card">
            <div className="cc-card-top">
              <div>
                <div className="cc-fig">{loading ? "—" : money(full.owed[last] || 0)} <Delta now={full.owed[last] || 0} before={full.owed[ago] || 0} /></div>
                <div className="cc-sub">Owed to you</div>
              </div>
              <div className="cc-pills">
                <PillSelect label="Period" value={range} options={RANGES} onChange={setRange} />
                <PillSelect label="Bars" value={step} options={STEPS} onChange={setStep} />
              </div>
            </div>
            <div className="cc-chart"><BarcodeChart data={owedSeries} weekly={step === "week"} showLine={line1} format={(v) => money(v)} barLabel="Owed" lineLabel="Overdue" /></div>
            <footer className="cc-foot">
              <Legend items={[{ label: "Owed to you", color: BAR, glyph: "bars" }, { label: "Overdue", color: LINE, light: true, underline: true }]} />
              <span className="cc-foot-icons">
              <button type="button" className="cc-icon" aria-label="Show the overdue line" aria-pressed={line1} title="Show the overdue line" onClick={() => setLine1(!line1)}><IconFilter /></button>
              <button type="button" className="cc-icon" aria-label="Download as CSV" title="Download as CSV"
                onClick={() => downloadCsv("owed-by-day", ["date", "owed", "overdue"], owedSeries.map((d) => [d.date, Math.round(d.bar), Math.round(d.line)]))}><IconDownload /></button>
              </span>
            </footer>
          </section>

          {/* Where the money sits */}
          <section className="cc-card">
            <div className="cc-card-top">
              <div>
                <h2 className="cc-h2">Where the money sits</h2>
                <div className="cc-sub">Share of what you&rsquo;re owed, and of open invoices, by days past due</div>
              </div>
            </div>
            <div className="cc-chart"><PairedBars groups={buckets} /></div>
            <footer className="cc-foot">
              <Legend items={[{ label: "Share of amount", color: INK }, { label: "Share of invoices", color: SOFT, light: true, underline: true }, { label: "Needs attention", color: ALERT }]} />
              <button type="button" className="cc-icon" aria-label="Download as CSV" title="Download as CSV"
                onClick={() => downloadCsv("ageing", ["bucket", "amount", "invoices"], buckets.map((b) => [b.label, Math.round(b.amount), b.count]))}><IconDownload /></button>
            </footer>
          </section>

          {/* Overdue invoices */}
          <section className="cc-card">
            <div className="cc-card-top">
              <div>
                <div className="cc-fig">{loading ? "—" : (full.overdueCount[last] || 0)} <Delta now={full.overdueCount[last] || 0} before={full.overdueCount[ago] || 0} /></div>
                <div className="cc-sub">Overdue invoices</div>
              </div>
              <div className="cc-pills">
                <PillSelect label="Bars" value={step2} options={STEPS} onChange={setStep2} />
                <PillSelect label="Period" value={range2} options={RANGES} onChange={setRange2} />
              </div>
            </div>
            <div className="cc-chart"><BarcodeChart data={countSeries} weekly={step2 === "week"} showLine={line2} format={(v) => String(Math.round(v))} barLabel="Overdue invoices" lineLabel="Open invoices" /></div>
            <footer className="cc-foot">
              <Legend items={[{ label: "Overdue", color: BAR, glyph: "bars" }, { label: "Open", color: LINE, light: true, underline: true }]} />
              <span className="cc-foot-icons">
              <button type="button" className="cc-icon" aria-label="Show the open invoices line" aria-pressed={line2} title="Show the open invoices line" onClick={() => setLine2(!line2)}><IconFilter /></button>
              <button type="button" className="cc-icon" aria-label="Download as CSV" title="Download as CSV"
                onClick={() => downloadCsv("overdue-invoices-by-day", ["date", "overdue", "open"], countSeries.map((d) => [d.date, d.bar, d.line]))}><IconDownload /></button>
              </span>
            </footer>
          </section>

          {/* Who owes the most */}
          <section className="cc-card">
            <div className="cc-card-top">
              <div>
                <h2 className="cc-h2">Who owes the most</h2>
                <div className="cc-sub">Based on open invoices, largest first</div>
              </div>
              <PillSelect label="Rank by" value={rankBy} options={[{ value: "owed", label: "Owed" }, { value: "overdue", label: "Overdue" }]} onChange={setRankBy} />
            </div>
            <div className="cc-chart" style={{ paddingTop: 8 }}>
              {top.length > 0 ? <RankBars rows={top} format={(v) => money(v)} /> : <p className="cc-note">{loading ? "Loading…" : "Nothing open."}</p>}
            </div>
            <footer className="cc-foot">
              <Legend items={[{ label: rankBy === "owed" ? "Owed" : "Overdue", color: "#4A505B" }, { label: "Over 90 days late", color: ALERT }]} />
              <button type="button" className="cc-icon" aria-label="Download as CSV" title="Download as CSV"
                onClick={() => downloadCsv("top-customers", ["customer", rankBy], top.map((r) => [r.label, Math.round(r.value)]))}><IconDownload /></button>
            </footer>
          </section>
        </div>

        <p className="cc-note">From your own invoices: history is rebuilt from invoice, due and payment dates. Changes on the charts compare today with 30 days ago; the quarter compares with the same stretch of last quarter.</p>
      </div>
    </DashboardLayout>
  );
}
