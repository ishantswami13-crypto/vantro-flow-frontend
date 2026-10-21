// "One continuously updated model of the business", drawn as a graph.
// Sources feed the picture from the left; customers it is owed by sit on the
// right, coloured by how overdue they are; the supplier and stock it depends
// on sit above and below. Data visibly flows in along the source edges.
// Fictional company (Halden Supply Co.), same figures as the hero console.

type Node = { id: string; x: number; y: number; label: string; sub?: string; kind: "core" | "source" | "customer" | "supplier" | "signal"; tone?: "ok" | "warn" | "bad" };

const NODES: Node[] = [
  { id: "core", x: 500, y: 290, label: "Your business", sub: "Halden Supply Co. · fictional", kind: "core" },
  { id: "acct", x: 120, y: 150, label: "Accounting / ERP", sub: "invoices, payments, stock", kind: "source" },
  { id: "bank", x: 95, y: 300, label: "Bank statements", sub: "movements", kind: "source" },
  { id: "csv", x: 140, y: 450, label: "Spreadsheets", sub: "exports from any system", kind: "source" },
  { id: "bw", x: 820, y: 105, label: "Brightwater Retail", sub: "$184,200 · 47 days", kind: "customer", tone: "bad" },
  { id: "ks", x: 895, y: 225, label: "Kessler Industrial", sub: "$92,000 · 34 days", kind: "customer", tone: "bad" },
  { id: "hp", x: 900, y: 355, label: "Harbor & Pine", sub: "$60,000 · 38 days", kind: "customer", tone: "warn" },
  { id: "ok", x: 830, y: 470, label: "Okafor Distribution", sub: "$25,000 · 96 days", kind: "customer", tone: "bad" },
  { id: "lh", x: 690, y: 525, label: "Lumen Health Group", sub: "$41,500 · 6 days", kind: "customer", tone: "warn" },
  { id: "mer", x: 430, y: 70, label: "Meridian Components", sub: "supplier · invoices in EUR", kind: "supplier" },
  { id: "stock", x: 330, y: 520, label: "Products and stock", sub: "cover by item", kind: "supplier" },
  { id: "ecb", x: 640, y: 40, label: "ECB rates", sub: "public feed", kind: "signal" },
];

const EDGES: Array<[string, string, "in" | "out" | "dep"]> = [
  ["acct", "core", "in"], ["bank", "core", "in"], ["csv", "core", "in"],
  ["core", "bw", "out"], ["core", "ks", "out"], ["core", "hp", "out"], ["core", "ok", "out"], ["core", "lh", "out"],
  ["core", "mer", "dep"], ["mer", "stock", "dep"], ["core", "stock", "dep"], ["ecb", "mer", "dep"],
];

const at = (id: string) => NODES.find((n) => n.id === id)!;

export function BusinessGraph() {
  return (
    <div className="slg" role="img" aria-label="Illustration: a fictional company drawn as one model. Accounting, bank statements and spreadsheets feed it; five customers who owe it money are coloured by how overdue they are; a supplier invoicing in euros, its stock and the exchange-rate feed it depends on are linked in.">
      <svg viewBox="-70 0 1150 580" className="slg-svg" aria-hidden>
        <defs>
          <radialGradient id="slg-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f4dcb5" stopOpacity=".55" />
            <stop offset="100%" stopColor="#f4dcb5" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="500" cy="290" r="150" fill="url(#slg-core)" />
        <circle cx="500" cy="290" r="210" className="slg-orbit" />
        <circle cx="500" cy="290" r="300" className="slg-orbit" />
        {EDGES.map(([a, b, k], i) => {
          const A = at(a), B = at(b);
          const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2 - (k === "dep" ? 0 : 24);
          const d = `M${A.x} ${A.y} Q${mx} ${my} ${B.x} ${B.y}`;
          return (
            <g key={i}>
              <path d={d} className={`slg-edge slg-edge-${k}`} />
              {k !== "dep" && <path d={d} className={`slg-flow slg-flow-${k}`} style={{ animationDelay: `${(i % 5) * -0.7}s` }} />}
            </g>
          );
        })}
        {NODES.map((n) => (
          <g key={n.id} transform={`translate(${n.x} ${n.y})`} className={`slg-node slg-${n.kind}${n.tone ? ` slg-${n.tone}` : ""}`}>
            {n.kind === "core" ? (
              <>
                <circle r="60" className="slg-core-ring" />
                <circle r="48" className="slg-core-dot" />
                <text y="-2" textAnchor="middle" className="slg-core-t">{n.label}</text>
                <text y="16" textAnchor="middle" className="slg-core-s">live picture</text>
                <text y="84" textAnchor="middle" className="slg-sub">{n.sub}</text>
              </>
            ) : (
              <>
                {n.tone === "bad" && <circle r="13" className="slg-pulse" />}
                <circle r="7" className="slg-dot" />
                <text x={n.x > 500 ? 16 : -16} y="-2" textAnchor={n.x > 500 ? "start" : "end"} className="slg-t">{n.label}</text>
                {n.sub && <text x={n.x > 500 ? 16 : -16} y="15" textAnchor={n.x > 500 ? "start" : "end"} className="slg-sub">{n.sub}</text>}
              </>
            )}
          </g>
        ))}
      </svg>
      <p className="slg-swipe" aria-hidden>Swipe to see the whole picture</p>
      <ul className="slg-legend" aria-hidden>
        <li><i className="src" />Sources</li>
        <li><i className="warn" />Overdue under 30 days</li>
        <li><i className="bad" />Overdue 30 days or more</li>
        <li><i className="dep" />Depends on</li>
      </ul>
    </div>
  );
}
