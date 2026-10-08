"use client";

// Cash forecast: three scenarios from real collections and purchases
// (GET /api/cash-forecast), and the V2 view that sets observed bank movement
// beside the deterministic prediction (GET /api/intelligence/forecast/v2).

import { Fragment, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea,
} from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Alert } from "@/components/ui/Alert";
import { api, getUser } from "@/lib/api";
import type { ForecastV2Response } from "@/lib/api";
import { inrWhole, inrShort, formatDate, formatDateTime, formatCount } from "@/lib/format";
import { PageHeader, Subnav } from "@/components/v32/ui";
import { IconChart, IconInfo } from "@/components/v32/icons";
import Button from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { MorePage, FigureRow, GridTable, Segmented, Panel, Field, OFFLINE_TEXT, moreStyles as s, type Column } from "@/components/more/ui";

type Point = { date: string; optimistic: number; expected: number; pessimistic: number };
type Impact = { name: string; amount: number; days_overdue: number; priority_score?: number };
type TipEntry = { dataKey: string; name: string; value: number; color: string };

const AXIS = { fill: "var(--ink-3)", fontSize: 11 };
// Runway is reported as 999 when cash never runs out inside the model.
const NEVER = 999;

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={s.tooltip}>
      <div style={{ color: "var(--ink)", marginBottom: 2 }}>{label}</div>
      {payload.filter(p => p.value != null).map(p => (
        <div key={p.dataKey} className={s.tooltipRow}>
          <span className="flex items-center" style={{ gap: 6 }}>
            <span aria-hidden="true" style={{ width: 8, height: 2, background: p.color, display: "inline-block" }} />{p.name}
          </span>
          <b>{inrWhole(p.value)}</b>
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className={s.panel} aria-busy="true" aria-label="Loading forecast">
      <div className="skeleton" style={{ height: 10, width: 160, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 10, width: 280, maxWidth: "80%", marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 260, borderRadius: 6 }} />
    </div>
  );
}

/** A figure that is a sentence, not a number ("Not set"): quiet sans, never mono. */
const wordFigure = (text: string) => <span style={{ fontFamily: "var(--font-sans)", fontSize: 15, lineHeight: "24px", letterSpacing: 0, color: "var(--ink-2)" }}>{text}</span>;

// Neutral lines: the case you pick reads in ink, the other two recede.
// Colour is kept for the one thing that matters, cash running out.
const SERIES = [
  { key: "optimistic", label: "Optimistic", dash: "" },
  { key: "expected", label: "Expected", dash: "" },
  { key: "pessimistic", label: "Pessimistic", dash: "4 3" },
] as const;
type SeriesKey = (typeof SERIES)[number]["key"];

export default function ForecastPage() {
  const [mode, setMode]         = useState<"classic" | "v2">("classic");
  const [v2Horizon, setV2Horizon] = useState<7 | 14 | 30>(30);
  const [v2, setV2]             = useState<ForecastV2Response | null>(null);
  const [v2Loading, setV2Loading] = useState(false);
  const [v2Error, setV2Error]   = useState(false);
  const [range, setRange]       = useState<30 | 60 | 90>(30);
  const [focus, setFocus]       = useState<SeriesKey>("expected");
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [chartData, setChartData] = useState<Point[]>([]);
  const [kpis, setKpis]         = useState({ cashStart: 0, burnRate: 0, avgCollections: 0, runwayDays: 0 });
  const [topImpact, setTopImpact] = useState<Impact[]>([]);
  const [noData, setNoData]     = useState(false);
  // Read after mount: reading storage during render made the server and
  // client disagree about the header button once cash had been saved.
  const [openingCash, setOpeningCash] = useState("");
  const [cashReady, setCashReady] = useState(false);
  useEffect(() => {
    try { setOpeningCash(localStorage.getItem("vantro_opening_cash") || ""); } catch { /* storage blocked */ }
    setCashReady(true);
  }, []);
  const [cashInput, setCashInput] = useState("");
  const [showCashInput, setShowCashInput] = useState(false);

  const loadForecast = useCallback(async (days: 30 | 60 | 90, cash?: string) => {
    const user = getUser();
    if (!user?.id) { setNoData(true); setLoading(false); return; }
    const currentCash = cash !== undefined ? cash : openingCash;
    setLoading(true);
    setLoadError(false);
    try {
      let usedForecastTopImpact = false;
      const [forecastRes, invoicesRes] = await Promise.allSettled([
        api.forecast(user.id, { days, current_cash: Number(currentCash) || 0 }),
        api.invoices.list(user.id),
      ]);

      if (forecastRes.status === "fulfilled") {
        const f = forecastRes.value as typeof forecastRes.value & { topOutstanding?: { name?: string; customer_name?: string; amount?: number; outstanding_amount?: number; days_overdue?: number; priority_score?: number }[] };
        const sc = f.scenarios;
        if (Array.isArray(f.topOutstanding)) {
          usedForecastTopImpact = true;
          setTopImpact(f.topOutstanding.slice(0, 5).map(inv => ({
            name: inv.name || inv.customer_name || "",
            amount: inv.amount || inv.outstanding_amount || 0,
            days_overdue: inv.days_overdue || 0,
            priority_score: inv.priority_score,
          })));
        }
        const optCurve = sc?.optimistic?.curve || [];
        const expCurve = sc?.expected?.curve || [];
        const pesCurve = sc?.pessimistic?.curve || [];
        const maxLen = Math.max(optCurve.length, expCurve.length, pesCurve.length);
        if (maxLen === 0) {
          setNoData(true);
        } else {
          setNoData(false);
          const now = new Date();
          setChartData(Array.from({ length: maxLen }, (_, i) => {
            const d = new Date(now);
            d.setDate(now.getDate() + (optCurve[i]?.day ?? i));
            return {
              date: formatDate(d),
              optimistic:  Math.max(0, Math.round(optCurve[i]?.cash ?? 0)),
              expected:    Math.max(0, Math.round(expCurve[i]?.cash ?? 0)),
              pessimistic: Math.max(0, Math.round(pesCurve[i]?.cash ?? 0)),
            };
          }));
          setKpis({
            cashStart:      f.cashStart || 0,
            burnRate:       f.burnRate || 0,
            avgCollections: f.avgDailyCollections || 0,
            runwayDays:     sc?.pessimistic?.runwayDays ?? sc?.expected?.runwayDays ?? 0,
          });
        }
      } else {
        setLoadError(true);
      }

      if (invoicesRes.status === "fulfilled" && !usedForecastTopImpact) {
        setTopImpact((invoicesRes.value.invoices || [])
          .filter(inv => inv.payment_status === "Pending" && inv.days_overdue > 0)
          .sort((a, b) => b.invoice_amount - a.invoice_amount)
          .slice(0, 5)
          .map(inv => ({ name: inv.customer_name, amount: inv.invoice_amount, days_overdue: inv.days_overdue, priority_score: inv.priority_score })));
      }
    } catch {
      setLoadError(true);
      setChartData([]);
      setTopImpact([]);
    } finally {
      setLoading(false);
    }
  }, [openingCash]);

  useEffect(() => { if (mode === "classic" && cashReady) loadForecast(range); }, [range, loadForecast, mode, cashReady]);

  const loadForecastV2 = useCallback(async (horizon: 7 | 14 | 30) => {
    const user = getUser();
    if (!user?.id) { setV2Error(true); setV2Loading(false); return; }
    setV2Loading(true);
    setV2Error(false);
    try {
      setV2(await api.forecastV2(user.id, horizon));
    } catch {
      setV2Error(true);
      setV2(null);
    } finally {
      setV2Loading(false);
    }
  }, []);

  useEffect(() => { if (mode === "v2") loadForecastV2(v2Horizon); }, [mode, v2Horizon, loadForecastV2]);

  // Safety watchdog: the skeleton must never persist, even if a request hangs
  // below the API client's own timeout.
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      setLoading(false);
      setChartData(prev => { if (prev.length === 0) setLoadError(true); return prev; });
    }, 15000);
    return () => clearTimeout(t);
  }, [loading]);

  // Without cash in hand the model starts from zero, so its runway means nothing.
  const runwayKnown = !!openingCash && kpis.runwayDays > 0;
  const runwayNever = kpis.runwayDays >= NEVER;
  const isRunwayDanger = runwayKnown && !runwayNever && kpis.runwayDays < 15;

  const saveCash = () => {
    const val = cashInput.trim();
    try { localStorage.setItem("vantro_opening_cash", val); } catch { /* storage blocked: still used for this visit */ }
    setOpeningCash(val);
    setShowCashInput(false);
    setCashInput("");
    loadForecast(range, val);
  };

  const impactCols: Column<Impact>[] = [
    { key: "name", header: "Customer", width: "minmax(0, 1.6fr)", render: c => <div className={s.name} title={c.name}>{c.name}</div> },
    { key: "late", header: "Days late", width: "96px", align: "right", hide: "sm", render: c => c.days_overdue > 0 ? <span>{formatCount(c.days_overdue)}</span> : <span style={{ fontFamily: "var(--font-sans)", color: "var(--ink-3)" }}>Not yet due</span> },
    { key: "amount", header: "Amount", width: "130px", widthSm: "auto", align: "right", render: c => <span className={s.amount}>{inrWhole(c.amount)}</span> },
    { key: "go", header: <span className="sr-only">Action</span>, width: "120px", widthSm: "auto", align: "right", render: () => <span className={s.hoverAction}><Link href="/collections" className="ui-btn ui-btn-ghost ui-btn-sm">Collect</Link></span> },
  ];

  // The first day the highlighted case reaches zero (the curve is clamped
  // at zero), only when cash in hand is known; otherwise zero means nothing.
  const focusLabel = SERIES.find(x => x.key === focus)!.label;
  const zeroAt = openingCash ? chartData.findIndex((p, i) => i > 0 && p[focus] <= 0) : -1;
  const runsOut = zeroAt > 0 ? { date: chartData[zeroAt].date } : null;

  const runwayValue = !runwayKnown ? wordFigure("Not known yet") : runwayNever ? wordFigure("Holds") : `${formatCount(kpis.runwayDays)} days`;

  return (
    <DashboardLayout pageTitle="Cash forecast">
      <MorePage>
        <PageHeader
          title="Cash forecast"
          subtitle="Where your cash is heading, from your real collections and purchases."
          right={mode === "classic" ? <Button variant="primary" onClick={() => { setCashInput(openingCash); setShowCashInput(true); }}>{openingCash ? "Update cash in hand" : "Set cash in hand"}</Button> : undefined}
        >
          <div style={{ marginTop: 18 }}>
            <Subnav label="Forecast view" active={mode} onChange={k => setMode(k as "classic" | "v2")} items={[
              { key: "classic", label: "Scenarios" },
              { key: "v2", label: "Observed and predicted" },
            ]} />
          </div>
        </PageHeader>

        {mode === "classic" && <>
          {!loading && isRunwayDanger && (
            <Alert variant="danger" title={`Cash could run out in ${kpis.runwayDays} days`}>
              In the pessimistic case, cash runs out in {kpis.runwayDays} days at {inrWhole(kpis.burnRate)} a day of spending. Collecting from the customers below moves that date out fastest.
            </Alert>
          )}

          {!loading && !openingCash && !noData && !loadError && (
            <div className={s.notice}>
              <IconInfo size={15} />
              <span style={{ flex: 1, minWidth: 220 }}>Add the cash you have today. Without it the forecast starts from zero and the runway can&apos;t be worked out.</span>
            </div>
          )}

          {loading && <ChartSkeleton />}

          {!loading && loadError && (
            <div className={s.panel}><ErrorState title="Couldn't load the forecast" message={OFFLINE_TEXT} onRetry={() => loadForecast(range)} /></div>
          )}

          {!loading && !loadError && noData && (
            <div className={s.panel}>
              <EmptyState
                icon={<IconChart size={17} />}
                title="Not enough data for a forecast yet"
                message="Upload your invoices and mark a few payments as received. The forecast needs some real collections to project from."
                action={<Link href="/collections?import=1" className="ui-btn ui-btn-primary">Import invoices</Link>}
              />
            </div>
          )}

          {!loading && !loadError && !noData && chartData.length > 0 && (
            <>
              <FigureRow items={[
                { label: "Cash in hand", value: openingCash ? inrWhole(kpis.cashStart) : wordFigure("Not set"), note: openingCash ? "As you entered it" : "Set it to see your runway" },
                { label: "Spending a day", value: inrWhole(kpis.burnRate), note: "From your purchases" },
                { label: "Collections a day", value: inrWhole(kpis.avgCollections), note: "Average from history" },
                { label: "Runway", value: runwayValue, note: !openingCash ? "Needs cash in hand" : runwayNever ? "Cash doesn't run out in any case" : "Pessimistic case", tone: isRunwayDanger ? "var(--critical)" : undefined },
              ]} />

              <Panel
                title={`Cash balance, next ${range} days`}
                sub="Three cases from your actual collection rate. Pick the one to read in full."
                right={<Segmented label="Forecast range" value={range} onChange={setRange} options={[{ key: 30, label: "30 days" }, { key: 60, label: "60 days" }, { key: 90, label: "90 days" }]} />}
                flush
              >
                <div className={s.legend} style={{ padding: "2px 0 6px" }}>
                  <div className={s.segmented} role="group" aria-label="Case to highlight">
                    {SERIES.map(x => (
                      <button key={x.key} type="button" aria-pressed={focus === x.key} onClick={() => setFocus(x.key)} className="flex items-center">
                        <span className={s.legendSwatch} style={{ color: focus === x.key ? "var(--ink)" : "var(--ink-3)", borderTopStyle: x.dash ? "dashed" : "solid" }} />
                        {x.label}
                      </button>
                    ))}
                  </div>
                  {runsOut && (
                    <span className="flex items-center" style={{ gap: 6, color: "var(--ink)" }}>
                      <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: "rgb(var(--tk-critical) / 0.14)", boxShadow: "inset 0 0 0 1px rgb(var(--tk-critical) / 0.35)", display: "inline-block" }} />
                      Cash runs out {runsOut.date} in the {focusLabel.toLowerCase()} case
                    </span>
                  )}
                </div>
                <div className={s.chartWrap}>
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
                      <CartesianGrid stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
                      <YAxis tickFormatter={inrShort} tick={AXIS} axisLine={false} tickLine={false} width={60} />
                      <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }} />
                      {runsOut && <ReferenceArea x1={runsOut.date} x2={chartData[chartData.length - 1].date} fill="var(--critical)" fillOpacity={0.07} stroke="none" ifOverflow="extendDomain" />}
                      {runsOut && <ReferenceLine x={runsOut.date} stroke="var(--critical)" strokeDasharray="3 3" strokeWidth={1} />}
                      <ReferenceLine y={0} stroke="var(--ink-2)" strokeWidth={1} label={{ value: "Zero cash", position: "insideBottomRight", fill: "var(--ink-3)", fontSize: 11, dy: -4 }} />
                      {SERIES.filter(x => x.key !== focus).map(x => (
                        <Line key={x.key} type="monotone" dataKey={x.key} name={x.label} stroke="var(--ink-3)" strokeOpacity={0.75} strokeWidth={1.25} strokeDasharray={x.dash || undefined} dot={false} activeDot={{ r: 2.5, fill: "var(--ink-3)" }} isAnimationActive={false} />
                      ))}
                      <Area key={focus} type="monotone" dataKey={focus} name={focusLabel} stroke="var(--ink)" strokeWidth={2} strokeDasharray={SERIES.find(x => x.key === focus)?.dash || undefined} fill="var(--ink)" fillOpacity={0.05} dot={false} activeDot={{ r: 3.5, fill: "var(--ink)" }} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </>
          )}

          {!loading && !loadError && topImpact.length > 0 && (
            <Panel title="Collect these first" sub="The largest overdue amounts. Each one collected extends your runway the most." flush>
              <GridTable label="Largest overdue amounts" columns={impactCols} rows={topImpact} rowKey={(c, i) => `${c.name}-${i}`} />
            </Panel>
          )}
        </>}

        {mode === "v2" && (
          <>
            {v2Loading && <ChartSkeleton />}

            {!v2Loading && (v2Error || !v2) && (
              <div className={s.panel}><ErrorState title="Couldn't load this view" message={`${OFFLINE_TEXT} The Scenarios view may still work.`} onRetry={() => loadForecastV2(v2Horizon)} /></div>
            )}

            {!v2Loading && v2 && v2.insufficientData && (
              <div className={s.panel}>
                <EmptyState icon={<IconChart size={17} />} title="Not enough bank data yet" message={v2.insufficientDataReason || "This view needs some real bank transactions to compare against."} />
              </div>
            )}

            {!v2Loading && v2 && !v2.insufficientData && (
              <>
                <Panel
                  title={`Observed last 30 days, predicted next ${v2.horizon_days}`}
                  sub="Observed is daily net change from real bank transactions. Predicted is the same model as Scenarios, at a finer step."
                  right={<Segmented label="Prediction horizon" value={v2Horizon} onChange={setV2Horizon} options={[{ key: 7, label: "7 days" }, { key: 14, label: "14 days" }, { key: 30, label: "30 days" }]} />}
                  flush
                >
                  <div className={s.legend} style={{ padding: "2px 0 4px" }}>
                    {[
                      { label: "Observed", color: "var(--ink-3)", dash: false },
                      { label: "Predicted", color: "var(--ink)", dash: false },
                      { label: "Low and high range", color: "var(--ink-2)", dash: true },
                    ].map(x => (
                      <span key={x.label} style={{ color: x.color }} className="flex items-center">
                        <span className={s.legendSwatch} style={{ borderTopStyle: x.dash ? "dashed" : "solid" }} />
                        <span style={{ color: "var(--ink-2)" }}>{x.label}</span>
                      </span>
                    ))}
                  </div>
                  <div className={s.chartWrap}>
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart
                        data={[
                          ...v2.observed.map(o => ({ label: formatDate(o.date), observed: o.net_change })),
                          ...v2.predicted.map((p, i) => ({
                            label: `Day +${p.day}`,
                            predicted: p.cash,
                            low: v2.uncertainty_interval.low_curve[i]?.cash,
                            high: v2.uncertainty_interval.high_curve[i]?.cash,
                          })),
                        ]}
                        margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
                      >
                        <CartesianGrid stroke="var(--line)" vertical={false} />
                        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
                        <YAxis tickFormatter={inrShort} tick={AXIS} axisLine={false} tickLine={false} width={60} />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }} />
                        <ReferenceLine y={0} stroke="var(--line-strong)" />
                        <Line type="monotone" dataKey="observed" name="Observed" stroke="var(--ink-3)" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
                        <Line type="monotone" dataKey="predicted" name="Predicted" stroke="var(--ink)" strokeWidth={1.75} dot={false} connectNulls isAnimationActive={false} />
                        <Line type="monotone" dataKey="low" name="Low" stroke="var(--ink-2)" strokeDasharray="4 3" strokeWidth={1} dot={false} connectNulls isAnimationActive={false} />
                        <Line type="monotone" dataKey="high" name="High" stroke="var(--ink-2)" strokeDasharray="4 3" strokeWidth={1} dot={false} connectNulls isAnimationActive={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <p style={{ margin: 0, padding: "8px 0 0", fontSize: 12, color: "var(--ink-3)" }}>{v2.uncertainty_interval.note}</p>
                </Panel>

                <Panel title="About this forecast">
                  <dl className={s.kv}>
                    <dt>Model</dt><dd>{v2.model_metadata.name} v{v2.model_metadata.version}</dd>
                    <dt>Bank data up to</dt><dd>{v2.data_freshness ? formatDateTime(v2.data_freshness) : "No bank transactions yet"}</dd>
                    <dt>Generated</dt><dd>{formatDateTime(v2.generated_at)}</dd>
                    {v2.models.map(m => (
                      <Fragment key={m.name}>
                        <dt>Baseline: {m.name} v{m.version}</dt>
                        <dd>{inrWhole(m.daily_net_change_prediction)} a day{m.interval ? ` (${inrWhole(m.interval.low)} to ${inrWhole(m.interval.high)})` : ""}</dd>
                      </Fragment>
                    ))}
                  </dl>
                </Panel>
              </>
            )}
          </>
        )}
      </MorePage>

      <Modal
        open={showCashInput}
        onClose={() => setShowCashInput(false)}
        title="Cash in hand today"
        description="Bank balance plus cash. Saved on this device and used as the starting point for every case."
        width={400}
        footer={<>
          <Button variant="ghost" onClick={() => setShowCashInput(false)}>Cancel</Button>
          <Button variant="primary" onClick={saveCash} disabled={!cashInput.trim()}>Save</Button>
        </>}
      >
        <Field label="Amount (₹)" htmlFor="cash-in-hand">
          <input id="cash-in-hand" className="ui-input tabular" type="number" inputMode="decimal" value={cashInput} onChange={e => setCashInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && cashInput.trim() && saveCash()} placeholder="500000" />
        </Field>
      </Modal>
    </DashboardLayout>
  );
}
