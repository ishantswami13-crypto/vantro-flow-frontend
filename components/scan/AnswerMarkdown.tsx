import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

// Markdown rendering for the direct-answer text (bug fix: the backend model
// sometimes returns **bold**, lists, etc. and this used to render the raw
// asterisks as literal text). react-markdown does not render raw HTML unless
// the rehype-raw plugin is added — it is deliberately NOT added here, so
// model-generated text can never execute as HTML/script. Component overrides
// below reuse V32's existing typography tokens (16.5px / #191917 / 1.5
// line-height for the answer body, 600 weight for emphasis) instead of
// introducing new arbitrary styling or spacing tokens.
const components = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ margin: "0 0 10px", fontSize: 16.5, lineHeight: 1.5, color: "#191917" }}>{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ fontWeight: 600 }}>{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em style={{ fontStyle: "italic" }}>{children}</em>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ margin: "0 0 10px", paddingLeft: 20 }}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol style={{ margin: "0 0 10px", paddingLeft: 20 }}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ fontSize: 16.5, lineHeight: 1.5, color: "#191917", marginBottom: 4 }}>{children}</li>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code style={{ fontFamily: "monospace", fontSize: 14, background: "#F3F2ED", borderRadius: 4, padding: "1px 5px" }}>{children}</code>
  ),
  // GFM tables (remark-gfm) — the model frequently answers list-style
  // questions ("show my pending invoices") with a markdown table; without
  // this, react-markdown emitted the raw "| a | b |" / "|:---|:---|" source
  // as literal paragraph text. Styled with the same typography tokens as
  // the rest of the direct-answer body, not a new visual language.
  table: ({ children }: { children?: React.ReactNode }) => (
    <table style={{ borderCollapse: "collapse", width: "100%", margin: "0 0 10px", fontSize: 14.5 }}>{children}</table>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => <thead>{children}</thead>,
  tbody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr style={{ borderBottom: "1px solid #E5E4DF" }}>{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th style={{ textAlign: "left", padding: "6px 10px 6px 0", fontWeight: 600, color: "#191917" }}>{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td style={{ textAlign: "left", padding: "6px 10px 6px 0", color: "#191917" }}>{children}</td>
  ),
};

export function AnswerMarkdown({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 16.5, lineHeight: 1.5, color: "#191917" }}>
      <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
