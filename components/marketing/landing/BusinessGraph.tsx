// "One picture of your business": the demo company's books drawn as a graph.
// Sources feed the picture from the left; customers it is owed by sit on the
// right, coloured by how overdue they are; the supplier and stock it depends
// on sit above and below. Data visibly flows in along the source edges.
// Same fictional demo company and figures as the product screenshot.

type Node = { id: string; x: number; y: number; label: string; sub?: string; kind: "core" | "source" | "customer" | "supplier" | "signal"; tone?: "ok" | "warn" | "bad" };

const NODES: Node[] = [
  { id: "core", x: 500, y: 290, label: "Your business", sub: "Arora Hardware Traders · demo", kind: "core" },
  { id: "tally", x: 120, y: 150, label: "TallyPrime", sub: "vouchers, stock", kind: "source" },
  { id: "bank", x: 95, y: 300, label: "Bank statement", sub: "movements", kind: "source" },
  { id: "csv", x: 140, y: 450, label: "CSV / Excel", sub: "invoice exports", kind: "source" },
  { id: "mehta", x: 820, y: 105, label: "Mehta Hardware", sub: "₹1,28,500 · 45 days", kind: "customer", tone: "bad" },
  { id: "sharma", x: 895, y: 225, label: "Sharma Builders", sub: "₹86,000 · 38 days", kind: "customer", tone: "bad" },
  { id: "rao", x: 900, y: 355, label: "Rao Steel", sub: "₹74,000 · 19 days", kind: "customer", tone: "warn" },
  { id: "joshi", x: 830, y: 470, label: "Joshi Tiles", sub: "₹23,500 · 96 days", kind: "customer", tone: "bad" },
  { id: "bansal", x: 690, y: 525, label: "Bansal Paints", sub: "₹52,000 · 6 days", kind: "customer", tone: "warn" },
  { id: "metro", x: 430, y: 70, label: "Metro Wholesale", sub: "supplier", kind: "supplier" },
  { id: "stock", x: 330, y: 520, label: "Products and stock", sub: "coverage by item", kind: "supplier" },
  { id: "ecb", x: 640, y: 40, label: "ECB rates", sub: "public feed", kind: "signal" },
];

const EDGES: Array<[string, string, "in" | "out" | "dep"]> = [
  ["tally", "core", "in"], ["bank", "core", "in"], ["csv", "core", "in"],
  ["core", "mehta", "out"], ["core", "sharma", "out"], ["core", "rao", "out"], ["core", "joshi", "out"], ["core", "bansal", "out"],
  ["core", "metro", "dep"], ["metro", "stock", "dep"], ["core", "stock", "dep"], ["ecb", "metro", "dep"],
];

const at = (id: string) => NODES.find((n) => n.id === id)!;

export function BusinessGraph() {
  return (
    <div className="slg" role="img" aria-label="Illustration: the demo company's books drawn as one picture. TallyPrime, bank statements and CSV exports feed it; five customers who owe it money are coloured by how overdue they are; a supplier, its stock and an exchange-rate feed it depends on are linked in.">
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
