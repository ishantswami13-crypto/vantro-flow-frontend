import type React from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

// Markdown rendering for Scan's answer text. The model often answers with
// **bold**, lists and GFM tables; without this they showed as literal
// asterisks and pipes. react-markdown does not render raw HTML unless the
// rehype-raw plugin is added, and it is deliberately NOT added, so
// model-generated text can never execute as HTML or script.
// Typography follows the tokens: 15px Geist body, ink for emphasis,
// tabular figures, and tables that scroll inside their own box on a phone
// instead of pushing the page sideways.
type P = { children?: React.ReactNode; style?: React.CSSProperties };

const body: React.CSSProperties = { fontSize: 15, lineHeight: 1.65, color: "var(--body)" };

const components = {
  p: ({ children }: P) => <p style={{ ...body, margin: "0 0 12px" }}>{children}</p>,
  strong: ({ children }: P) => <strong style={{ fontWeight: 600, color: "var(--ink)" }}>{children}</strong>,
  em: ({ children }: P) => <em style={{ fontStyle: "italic" }}>{children}</em>,
  h1: ({ children }: P) => <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: "18px 0 8px" }}>{children}</h3>,
  h2: ({ children }: P) => <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: "18px 0 8px" }}>{children}</h3>,
  h3: ({ children }: P) => <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: "16px 0 6px" }}>{children}</h4>,
  ul: ({ children }: P) => <ul style={{ margin: "0 0 12px", paddingLeft: 20, listStyle: "disc" }}>{children}</ul>,
  ol: ({ children }: P) => <ol style={{ margin: "0 0 12px", paddingLeft: 20, listStyle: "decimal" }}>{children}</ol>,
  li: ({ children }: P) => <li style={{ ...body, marginBottom: 4, paddingLeft: 2 }}>{children}</li>,
  a: ({ children, href }: P & { href?: string }) => (
    <a href={href} target="_blank" rel="noreferrer" style={{ color: "var(--ink)", textDecoration: "underline", textDecorationColor: "var(--line-emphasis)", textUnderlineOffset: 3 }}>{children}</a>
  ),
  code: ({ children }: P) => (
    <code style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, background: "var(--surface-2)", borderRadius: 4, padding: "1px 5px", color: "var(--ink)" }}>{children}</code>
  ),
  hr: () => <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />,
  blockquote: ({ children }: P) => <blockquote style={{ margin: "0 0 12px", paddingLeft: 12, borderLeft: "2px solid var(--line-strong)", color: "var(--ink-2)" }}>{children}</blockquote>,
  table: ({ children }: P) => (
    <div style={{ overflowX: "auto", margin: "4px 0 14px", border: "1px solid var(--line-card)", borderRadius: "var(--radius-md)", background: "var(--surface)" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13.5, fontVariantNumeric: "tabular-nums" }}>{children}</table>
    </div>
  ),
  thead: ({ children }: P) => <thead style={{ background: "var(--surface-2)" }}>{children}</thead>,
  tbody: ({ children }: P) => <tbody>{children}</tbody>,
  tr: ({ children }: P) => <tr style={{ borderTop: "1px solid var(--line)" }}>{children}</tr>,
  th: ({ children, style }: P) => (
    <th style={{ textAlign: "left", padding: "9px 14px", fontSize: 12, fontWeight: 400, color: "var(--ink-3)", whiteSpace: "nowrap", ...style }}>{children}</th>
  ),
  td: ({ children, style }: P) => (
    <td style={{ textAlign: "left", padding: "10px 14px", color: "var(--ink)", whiteSpace: "nowrap", ...style }}>{children}</td>
  ),
};

export function AnswerMarkdown({ children }: { children: string }) {
  return (
    <div className="scan-md" style={body}>
      <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
