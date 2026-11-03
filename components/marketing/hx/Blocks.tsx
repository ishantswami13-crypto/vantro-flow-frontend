import Link from "next/link";
import type { TextureTone } from "@/components/marketing/home2/Texture";
import { Paint } from "./Shell";

// Section blocks shared by every public page. Each takes Starlane's own copy;
// the layout, spacing and motion follow the reference.

const st = (d: number) => ({ "--d": d }) as React.CSSProperties;

export function Hero({ kicker, crumb, title, lead, cta = ["/access", "Request a Demo"], second, variant = "split", children }: {
  kicker?: string; crumb?: [string, string]; title: React.ReactNode; lead?: React.ReactNode;
  cta?: [string, string] | null; second?: [string, string]; variant?: "split" | "stack" | "center"; children?: React.ReactNode;
}) {
  return (
    <section className={`hx-s hx-hero ${variant === "split" ? "" : variant}`}>
      <div className="hx-w">
        {(kicker || crumb) && (
          <p className="hx-cap hx-r">
            {crumb ? <><Link href={crumb[0]}>{crumb[1]}</Link> / {kicker}</> : kicker}
          </p>
        )}
        <div className="hx-hero-g">
          <h1 className="hx-d1 hx-r" style={st(1)}>{title}</h1>
          {(lead || cta || second) && <div className="hx-hero-side hx-r" style={st(2)}>
            {lead && <p className="hx-lead">{lead}</p>}
            {(cta || second) && (
              <div className="hx-acts">
                {cta && <Link href={cta[0]} className="hx-btn">{cta[1]}</Link>}
                {second && <Link href={second[0]} className="hx-btn line">{second[1]}</Link>}
              </div>
            )}
          </div>}
        </div>
        {children && <div className="hx-hero-media hx-r" style={st(3)}>{children}</div>}
      </div>
    </section>
  );
}

export function Panel({ id, tone = "moss", seed, kind = "card", children, className = "" }: { id: string; tone?: TextureTone; seed?: number; kind?: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`hx-panel ${kind} ${className}`}>
      <Paint id={id} tone={tone} seed={seed} />
      {children}
    </div>
  );
}

export function CenterHead({ title, body, pill, children, as: H = "h2", size = "hx-d2" }: { title: React.ReactNode; body?: string; pill?: string; children?: React.ReactNode; as?: "h2" | "h1"; size?: string }) {
  return (
    <div className="hx-ch">
      {pill && <p className="hx-pill hx-r">{pill}</p>}
      <H className={`${size} hx-r`} style={st(1)}>{title}</H>
      {body && <p className="hx-b1 hx-r" style={st(2)}>{body}</p>}
      {children && <div className="hx-acts hx-r" style={st(3)}>{children}</div>}
    </div>
  );
}

export function SplitHead({ strong, soft, className = "" }: { strong: string; soft?: string; className?: string }) {
  return <h2 className={`hx-split-h hx-r ${className}`} style={{ maxWidth: "calc(680px * var(--s))" }}>{strong}{soft && <span> {soft}</span>}</h2>;
}

export type Duo = { title: string; body: string; href: string; cta: string; tone: TextureTone; view: React.ReactNode };
export function DuoCards({ items }: { items: Duo[] }) {
  return (
    <div className="hx-duo">
      {items.map((c, i) => (
        <article key={c.title} className="hx-duo-c hx-r" style={st(i)}>
          <Paint id={`duo-${i}`} tone={c.tone} seed={i * 5 + 2} />
          <div className="hx-duo-t">
            <h3 className="hx-d3">{c.title}</h3>
            <p>{c.body}</p>
            <Link href={c.href} className="hx-btn sm line">{c.cta}</Link>
          </div>
          {c.view}
        </article>
      ))}
    </div>
  );
}

export type Stat = [label: string, value: string, note?: string];
export function StatRows({ title, items }: { title: string; items: Stat[] }) {
  return (
    <>
      <h3 className="hx-h2 hx-r" style={{ maxWidth: "calc(680px * var(--s))" }}>{title}</h3>
      <ul className="hx-stats">
        {items.map(([l, v, n], i) => (
          <li key={l} className="hx-r" style={st(i)}>
            <span>{l}{n && <small>{n}</small>}</span>
            <p className="hx-num">{v}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

export function StackStats({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div className="hx-stack-stats">
      <h2 className="hx-h3 hx-r">{title}</h2>
      <ul>
        {items.map(([v, l], i) => (
          <li key={l} className="hx-r" style={st(i)}><p className="hx-num">{v}</p><p>{l}</p></li>
        ))}
      </ul>
    </div>
  );
}

const SHIELD = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m8.8 12 2.2 2.2 4.4-4.4" /></svg>;
export const ICONS: Record<string, React.ReactNode> = {
  shield: SHIELD,
  eye: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><path d="m8 12 3 3 5-6" /></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="4.5" y="10.5" width="15" height="10" rx="1.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>,
  log: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 3.5h9l3 3v14H6z" /><path d="M9 10h6M9 13.5h6M9 17h4" /></svg>,
  once: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="12" cy="12" r="8.5" /><path d="M11 8.5 12.5 7.5V16.5" /></svg>,
  stop: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8.2 3.5h7.6l5.4 5.4v7.6l-5.4 5.4H8.2l-5.4-5.4V8.9z" /><path d="M8.5 12h7" /></svg>,
  key: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="15" r="4" /><path d="m11 12 8.5-8.5M16 7l2.5 2.5" /></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.4 3.6 5.2 3.6 8.5S14.5 18.1 12 20.5C9.5 18.1 8.4 15.3 8.4 12S9.5 5.9 12 3.5Z" /></svg>,
  spark: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" /></svg>,
  people: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.5c.6-3.3 3-5 6-5s5.4 1.7 6 5" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.5c2.6.1 4.4 1.6 5 4.5" /></svg>,
  bolt: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M13 3 5 13.5h6L10.5 21 19 10.5h-6z" /></svg>,
};

export type Control = [icon: string, name: string, href: string];
export function Controls({ title, body, href = "/security", cta = "More About Security", items }: { title: string; body: string; href?: string; cta?: string; items: Control[] }) {
  return (
    <div className="hx-ctl">
      <div className="hx-ctl-l hx-r">
        <h2 className="hx-h2">{title}</h2>
        <p className="hx-b1">{body}</p>
        <Link href={href} className="hx-btn sm line">{cta}</Link>
      </div>
      <ul>
        {items.map(([ic, n, h], i) => (
          <li key={n} className="hx-r" style={st(i)}>
            <Link href={h}><span className="hx-badge">{ICONS[ic]}</span><b>{n}</b><em>Details <i>→</i></em></Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type Tile = { title: string; body: string; tone: TextureTone; view?: React.ReactNode };
export function Tiles({ items }: { items: Tile[] }) {
  return (
    <div className="hx-tiles">
      {items.map((t, i) => (
        <article key={t.title} className="hx-tile hx-r" style={st(i)}>
          <Panel id={`tile-${i}-${t.title.length}`} tone={t.tone} seed={i * 7 + 1} kind="">{t.view}</Panel>
          <h3 className="hx-h4">{t.title}</h3>
          <p>{t.body}</p>
        </article>
      ))}
    </div>
  );
}

export type AltRow = { title: string; body: string; href: string; tone: TextureTone; view: React.ReactNode };
export function AltRows({ items }: { items: AltRow[] }) {
  return (
    <div className="hx-alt">
      {items.map((r, i) => (
        <div key={r.title} className={`hx-alt-r${i % 2 ? " flip" : ""}`}>
          <div className="hx-r scale" style={{ order: i % 2 ? 1 : 0 }}>
            <Panel id={`alt-${i}`} tone={r.tone} seed={i * 3 + 4} kind="">{r.view}</Panel>
          </div>
          <div className="hx-alt-t hx-r" style={st(1)}>
            <h3>{r.title}</h3>
            <p>{r.body}</p>
            <Link href={r.href} className="hx-btn sm line">Learn More</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export type Feat = { title: string; lead: string; tone: TextureTone; view: React.ReactNode; points: Array<[string, string]> };
export function Features({ items }: { items: Feat[] }) {
  return (
    <>
      {items.map((f, i) => (
        <div key={f.title} className="hx-feat">
          <div className="hx-feat-h">
            <h2 className="hx-h2 hx-r">{f.title}</h2>
            <p className="hx-r" style={st(1)}>{f.lead}</p>
          </div>
          <div className="hx-feat-b">
            <div className="hx-r scale"><Panel id={`feat-${i}`} tone={f.tone} seed={i * 4 + 6} kind="">{f.view}</Panel></div>
            <ul>
              {f.points.map(([h, b], j) => (
                <li key={h} className="hx-r" style={st(j)}><b>{h}</b><p>{b}</p></li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </>
  );
}

export function Spotlight({ kicker, title, body, tone, view }: { kicker: string; title: string; body: string; tone: TextureTone; view: React.ReactNode }) {
  return (
    <div className="hx-spot hx-r">
      <Panel id="spot" tone={tone} seed={11} kind="">{view}</Panel>
      <div className="hx-spot-t">
        <small>{kicker}</small>
        <h2 className="hx-d2">{title}</h2>
        <p>{body}</p>
      </div>
    </div>
  );
}

export function IconCards({ items }: { items: Array<[icon: string, title: string, body: string]> }) {
  return (
    <ul className="hx-ic">
      {items.map(([ic, t, b], i) => (
        <li key={t} className="hx-r" style={st(i % 3)}>
          <span className="hx-badge">{ICONS[ic]}</span>
          <h3>{t}</h3>
          <p>{b}</p>
        </li>
      ))}
    </ul>
  );
}

const CHEV = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="m3.5 6 4.5 4.5L12.5 6" /></svg>;
export function Faq({ title, body, href, cta, items }: { title: string; body?: string; href?: string; cta?: string; items: Array<[string, string]> }) {
  return (
    <div className="hx-faq">
      <div className="hx-faq-l hx-r">
        <h2 className="hx-h2">{title}</h2>
        {body && <p className="hx-b1">{body}</p>}
        {href && <Link href={href} className="hx-btn sm line">{cta}</Link>}
      </div>
      <div className="hx-r" style={st(1)}>
        {items.map(([q, a]) => (
          <details key={q}><summary>{q}{CHEV}</summary><p>{a}</p></details>
        ))}
      </div>
    </div>
  );
}

export type CardItem = { href: string; title: string; meta: string; tone: TextureTone; art: string; tag?: string; body?: string; type?: string; topic?: string; aud?: string };
export function Card({ c, i, className = "" }: { c: CardItem; i: number; className?: string }) {
  return (
    <Link href={c.href} className={`hx-card hx-r ${className}`} style={st(i % 3)} data-res={c.type ? "" : undefined} data-type={c.type} data-topic={c.topic} data-aud={c.aud}>
      <div className="hx-card-m">
        <Paint id={`card-${c.href.replace(/\W/g, "")}-${i}`} tone={c.tone} seed={i * 9 + 2} />
        <span>{c.tag ?? "Starlane"}</span>
        <b>{c.art}</b>
      </div>
      {c.type && <small>{c.type}</small>}
      <h3>{c.title}</h3>
      {c.body && <p>{c.body}</p>}
      <small>{c.meta}</small>
    </Link>
  );
}

export function Cards({ items }: { items: CardItem[] }) {
  return <div className="hx-cards">{items.map((c, i) => <Card key={c.href + i} c={c} i={i} />)}</div>;
}

export function ToolLists({ title, lists }: { title: string; lists: Array<{ h: string; items: Array<[string, string?]> }> }) {
  return (
    <div className="hx-tools">
      <h2 className="hx-h2 hx-r" style={{ maxWidth: "calc(460px * var(--s))" }}>{title}</h2>
      <div className="hx-tools-r">
        {lists.map((l) => (
          <div key={l.h} className="hx-r">
            <h3>{l.h}</h3>
            <ul>{l.items.map(([n, s]) => <li key={n}>{n}{s && <span>{s}</span>}</li>)}</ul>
          </div>
        ))}
      </div>
    </div>
  );
}
