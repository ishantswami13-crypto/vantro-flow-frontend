"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import {
  FiSearch, FiMessageSquare, FiCheckSquare, FiFileText,
  FiDownload, FiFilter, FiArrowUp, FiArrowDown,
} from "react-icons/fi";

interface Customer {
  id: number; name: string; contact: string; industry: string;
  outstanding: number; daysOverdue: number; score: number;
  lastContact: string; lastPayment: string; status: "overdue" | "due" | "promised";
}

const DATA: Customer[] = [
  { id:  1, name: "Mehta Fabrics Pvt Ltd",      contact: "9876543210", industry: "Manufacturing", outstanding: 840000, daysOverdue: 62, score: 82, lastContact: "10 May", lastPayment: "12 Jan", status: "overdue"  },
  { id:  2, name: "Sharma Steel Works",          contact: "9765432109", industry: "Trading",       outstanding: 520000, daysOverdue: 45, score: 67, lastContact: "12 May", lastPayment: "28 Jan", status: "overdue"  },
  { id:  3, name: "Patel Agro Industries",       contact: "9654321098", industry: "Manufacturing", outstanding: 315000, daysOverdue: 38, score: 54, lastContact: "8 May",  lastPayment: "5 Feb",  status: "overdue"  },
  { id:  4, name: "Gupta Construction Co",       contact: "9543210987", industry: "Construction",  outstanding: 280000, daysOverdue: 29, score: 71, lastContact: "13 May", lastPayment: "15 Feb", status: "promised" },
  { id:  5, name: "Verma Chemicals Ltd",         contact: "9432109876", industry: "Services",      outstanding: 195000, daysOverdue: 18, score: 45, lastContact: "14 May", lastPayment: "22 Feb", status: "due"      },
  { id:  6, name: "Singh Logistics Pvt Ltd",     contact: "9321098765", industry: "Services",      outstanding: 175000, daysOverdue: 55, score: 61, lastContact: "5 May",  lastPayment: "3 Jan",  status: "overdue"  },
  { id:  7, name: "Joshi Electronics",           contact: "9210987654", industry: "Retail",        outstanding: 142000, daysOverdue: 14, score: 88, lastContact: "15 May", lastPayment: "1 Mar",  status: "due"      },
  { id:  8, name: "Agarwal Textiles",            contact: "9109876543", industry: "Manufacturing", outstanding: 128000, daysOverdue: 70, score: 32, lastContact: "28 Apr", lastPayment: "10 Jan", status: "overdue"  },
  { id:  9, name: "Kapoor Real Estate",          contact: "9098765432", industry: "Construction",  outstanding: 115000, daysOverdue: 22, score: 74, lastContact: "11 May", lastPayment: "25 Feb", status: "due"      },
  { id: 10, name: "Pandey Pharma Distributors",  contact: "8987654321", industry: "Trading",       outstanding: 98000,  daysOverdue: 33, score: 59, lastContact: "9 May",  lastPayment: "18 Feb", status: "overdue"  },
  { id: 11, name: "Mishra Auto Parts",           contact: "8876543210", industry: "Retail",        outstanding: 87000,  daysOverdue: 11, score: 90, lastContact: "15 May", lastPayment: "5 Mar",  status: "due"      },
  { id: 12, name: "Yadav Hardware Suppliers",    contact: "8765432109", industry: "Trading",       outstanding: 74000,  daysOverdue: 48, score: 41, lastContact: "2 May",  lastPayment: "20 Jan", status: "overdue"  },
];

function fmt(n: number) {
  return n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(0)}K`;
}

type SortKey = "outstanding" | "daysOverdue" | "score";

const SCORE_COLOR = (s: number) => s >= 70 ? "#10D98A" : s >= 40 ? "#F5A524" : "#F5424D";
const STATUS_VARIANT: Record<string, "danger" | "warning" | "default"> = {
  overdue: "danger", promised: "warning", due: "default",
};

export default function CollectionsPage() {
  const [search, setSearch]           = useState("");
  const [sortKey, setSortKey]         = useState<SortKey>("daysOverdue");
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilter]     = useState("all");
  const [filterIndustry, setIndustry] = useState("all");
  const [selected, setSelected]       = useState<number[]>([]);

  const industries = useMemo(() => ["all", ...Array.from(new Set(DATA.map((c) => c.industry)))], []);

  const rows = useMemo(() => {
    let r = DATA;
    if (search)          r = r.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.contact.includes(search));
    if (filterStatus !== "all")   r = r.filter((c) => c.status === filterStatus);
    if (filterIndustry !== "all") r = r.filter((c) => c.industry === filterIndustry);
    return [...r].sort((a, b) => {
      const d = a[sortKey] - b[sortKey];
      return sortDir === "desc" ? -d : d;
    });
  }, [search, sortKey, sortDir, filterStatus, filterIndustry]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button onClick={() => toggleSort(col)} className="flex items-center gap-1 hover:text-primary transition-colors">
      {label}
      {sortKey === col ? (
        sortDir === "desc" ? <FiArrowDown size={10} className="text-accent" /> : <FiArrowUp size={10} className="text-accent" />
      ) : null}
    </button>
  );

  const totalSelected = selected.length;
  const allSelected   = totalSelected === rows.length && rows.length > 0;

  return (
    <DashboardLayout pageTitle="Collections">
      <div className="space-y-4 page-enter">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-primary tracking-tight">Collections</h2>
            <p className="text-sm text-secondary mt-0.5">
              {rows.length} customers &mdash; <span className="metric-value text-accent text-xs">₹45.2L</span> outstanding
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {totalSelected > 0 && (
              <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-success-dim text-success border border-success/25 hover:bg-success hover:text-white transition-all">
                <FiMessageSquare size={13} />
                Message ({totalSelected})
              </button>
            )}
            <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-2 text-secondary border border-border hover:bg-surface-3 hover:text-primary transition-all">
              <FiDownload size={13} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search customer or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-1 border border-border rounded-lg text-sm text-primary placeholder-muted pl-9 pr-3 py-2.5 focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {[
              { val: filterStatus,   set: setFilter,   opts: ["all", "overdue", "due", "promised"], prefix: "Status: " },
              { val: filterIndustry, set: setIndustry, opts: industries,                             prefix: "Sector: " },
            ].map(({ val, set, opts, prefix }, i) => (
              <select
                key={i}
                value={val}
                onChange={(e) => set(e.target.value)}
                className="bg-surface-1 border border-border rounded-lg text-xs text-secondary px-3 py-2.5 focus:outline-none focus:border-accent transition-colors capitalize"
              >
                {opts.map((o) => (
                  <option key={o} value={o} className="bg-surface capitalize">
                    {o === "all" ? prefix + "All" : o}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-premium">
              <thead>
                <tr className="border-b border-border bg-surface-2/40">
                  <th className="w-10 px-5 py-3">
                    <input type="checkbox" className="accent-accent" checked={allSelected}
                      onChange={() => setSelected(allSelected ? [] : rows.map((r) => r.id))} />
                  </th>
                  <th className="text-left px-4 py-3 section-label">Customer</th>
                  <th className="text-right px-4 py-3 section-label cursor-pointer">
                    <SortBtn col="outstanding" label="Outstanding" />
                  </th>
                  <th className="text-right px-4 py-3 section-label hidden sm:table-cell cursor-pointer">
                    <SortBtn col="daysOverdue" label="Days Overdue" />
                  </th>
                  <th className="px-4 py-3 section-label hidden md:table-cell cursor-pointer">
                    <SortBtn col="score" label="AI Score" />
                  </th>
                  <th className="text-center px-4 py-3 section-label hidden lg:table-cell">Status</th>
                  <th className="text-right px-4 py-3 section-label hidden xl:table-cell">Last Contact</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={c.id} style={{ animationDelay: `${i * 30}ms` }} className="animate-row-in">
                    <td className="px-5 py-3.5">
                      <input type="checkbox" className="accent-accent"
                        checked={selected.includes(c.id)}
                        onChange={() => setSelected((s) => s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id])} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-xs font-bold text-secondary shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-primary text-xs">{c.name}</p>
                          <p className="text-2xs text-muted">{c.industry} · {c.contact}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="metric-value text-sm text-primary">{fmt(c.outstanding)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                      <Badge variant={c.daysOverdue > 45 ? "danger" : c.daysOverdue > 30 ? "warning" : "default"}>
                        {c.daysOverdue}d
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="score-bar-track">
                          <div className="score-bar-fill" style={{ width: `${c.score}%`, background: SCORE_COLOR(c.score) }} />
                        </div>
                        <span className="metric-value text-xs font-semibold" style={{ color: SCORE_COLOR(c.score) }}>
                          {c.score}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                      <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-muted hidden xl:table-cell">{c.lastContact}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        <a href={`https://wa.me/91${c.contact}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-semibold rounded-lg bg-success-dim text-success border border-success/25 hover:bg-success hover:text-white transition-all">
                          <FiMessageSquare size={11} />
                          <span className="hidden sm:inline">WA</span>
                        </a>
                        <button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium rounded-lg bg-surface-2 text-secondary border border-border hover:bg-surface-3 hover:text-primary transition-all">
                          <FiCheckSquare size={11} />
                        </button>
                        <button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium rounded-lg bg-surface-2 text-secondary border border-border hover:bg-surface-3 hover:text-primary transition-all">
                          <FiFileText size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <div className="py-16 text-center">
              <FiSearch size={28} className="mx-auto mb-3 text-muted opacity-50" />
              <p className="text-sm text-secondary">No customers match your filters.</p>
              <button onClick={() => { setSearch(""); setFilter("all"); setIndustry("all"); }}
                className="mt-3 text-xs text-accent hover:underline">Clear filters</button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
