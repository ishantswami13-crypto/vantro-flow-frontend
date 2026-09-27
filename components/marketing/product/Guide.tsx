"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { FLAT_GUIDE, GUIDE, STATUS, type Status } from "./nav";

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`sl-status sl-status-${status}`} title={STATUS[status].note}>{STATUS[status].label}</span>;
}

/** Left sidebar: the same groups as the app's sidebar. Becomes a scrolling strip on phones. */
export function GuideSidebar() {
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);
  // On phones the guide is a horizontal strip: keep the current page in view.
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);
  return (
    <nav className="sl-guide-nav" aria-label="Product guide" ref={ref}>
      {GUIDE.map((g) => (
        <div key={g.group} className="sl-guide-group">
          <span className="sl-guide-label">{g.group}</span>
          {g.links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined} className="sl-guide-link">
              {l.label}
            </Link>
          ))}
        </div>
      ))}
      <div className="sl-guide-cta">
        <Link href="/access" className="sl-btn sl-btn-solid">Get Starlane</Link>
      </div>
    </nav>
  );
}

/** Page frame: eyebrow, title, one-paragraph lede, honest status, then sections; previous/next at the end. */
export function GuidePage({ eyebrow, title, lede, status, children }: { eyebrow: string; title: string; lede: ReactNode; status?: Status; children: ReactNode }) {
  const pathname = usePathname();
  const i = FLAT_GUIDE.findIndex((l) => l.href === pathname);
  const prev = i > 0 ? FLAT_GUIDE[i - 1] : null;
  const next = i >= 0 && i < FLAT_GUIDE.length - 1 ? FLAT_GUIDE[i + 1] : null;
  return (
    <article className="sl-guide-page">
      <header>
        <span className="sl-eyebrow">{eyebrow}</span>
        <h1 className="sl-h2 sl-guide-title">{title}</h1>
        <p className="sl-sub" style={{ marginTop: 18, maxWidth: 680 }}>{lede}</p>
        {status ? <p className="sl-guide-status"><StatusBadge status={status} /> <span className="sl-muted">{STATUS[status].note}</span></p> : null}
      </header>
      <div className="sl-guide-body">{children}</div>
      <footer className="sl-guide-pager">
        {prev ? <Link href={prev.href} className="sl-link-arrow">← {prev.label}</Link> : <span />}
        {next ? <Link href={next.href} className="sl-link-arrow">{next.label} →</Link> : <span />}
      </footer>
    </article>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="sl-guide-section">
      <h2 className="sl-h3">{title}</h2>
      <div className="sl-guide-section-body">{children}</div>
    </section>
  );
}

/** A two-column list of term → explanation. */
export function Facts({ items }: { items: Array<[ReactNode, ReactNode]> }) {
  return (
    <dl className="sl-facts">
      {items.map(([k, v], i) => (
        <div key={i} className="sl-fact"><dt>{k}</dt><dd>{v}</dd></div>
      ))}
    </dl>
  );
}

/** A grid of cards: title, status, one line. Used for agents, modules, sources. */
export function Cards({ items }: { items: Array<{ title: string; body: ReactNode; status?: Status; href?: string }> }) {
  return (
    <ul className="sl-cards">
      {items.map((c) => {
        const inner = (
          <>
            <div className="sl-card-top"><span className="sl-card-title">{c.title}</span>{c.status ? <StatusBadge status={c.status} /> : null}</div>
            <p className="sl-card-body">{c.body}</p>
          </>
        );
        return <li key={c.title} className="sl-card">{c.href ? <Link href={c.href} className="sl-card-link">{inner}</Link> : inner}</li>;
      })}
    </ul>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="sl-guide-note">{children}</p>;
}
