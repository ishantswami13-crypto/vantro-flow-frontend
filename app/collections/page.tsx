"use client";

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge, ScoreBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { FiSearch, FiFilter, FiMessageSquare, FiCheckSquare, FiFileText, FiDownload } from "react-icons/fi";

interface Customer {
  id: number;
  name: string;
  contact: string;
  industry: string;
  outstanding: number;
  daysOverdue: number;
  score: number;
  lastContact: string;
  lastPayment: string;
  status: "overdue" | "due" | "promised";
}

const ALL_CUSTOMERS: Customer[] = [
  { id:  1, name: "Mehta Fabrics Pvt Ltd",       contact: "9876543210", industry: "Manufacturing", outstanding: 840000,  daysOverdue: 62, score: 82, lastContact: "10 May",  lastPayment: "12 Jan", status: "overdue"  },
  { id:  2, name: "Sharma Steel Works",            contact: "9765432109", industry: "Trading",       outstanding: 520000,  daysOverdue: 45, score: 67, lastContact: "12 May",  lastPayment: "28 Jan", status: "overdue"  },
  { id:  3, name: "Patel Agro Industries",         contact: "9654321098", industry: "Manufacturing", outstanding: 315000,  daysOverdue: 38, score: 54, lastContact: "8 May",   lastPayment: "5 Feb",  status: "overdue"  },
  { id:  4, name: "Gupta Construction Co",         contact: "9543210987", industry: "Construction",  outstanding: 280000,  daysOverdue: 29, score: 71, lastContact: "13 May",  lastPayment: "15 Feb", status: "promised" },
  { id:  5, name: "Verma Chemicals Ltd",           contact: "9432109876", industry: "Services",      outstanding: 195000,  daysOverdue: 18, score: 45, lastContact: "14 May",  lastPayment: "22 Feb", status: "due"      },
  { id:  6, name: "Singh Logistics Pvt Ltd",       contact: "9321098765", industry: "Services",      outstanding: 175000,  daysOverdue: 55, score: 61, lastContact: "5 May",   lastPayment: "3 Jan",  status: "overdue"  },
  { id:  7, name: "Joshi Electronics",             contact: "9210987654", industry: "Retail",        outstanding: 142000,  daysOverdue: 14, score: 88, lastContact: "15 May",  lastPayment: "1 Mar",  status: "due"      },
  { id:  8, name: "Agarwal Textiles",              contact: "9109876543", industry: "Manufacturing", outstanding: 128000,  daysOverdue: 70, score: 32, lastContact: "28 Apr",  lastPayment: "10 Jan", status: "overdue"  },
  { id:  9, name: "Kapoor Real Estate",            contact: "9098765432", industry: "Construction",  outstanding: 115000,  daysOverdue: 22, score: 74, lastContact: "11 May",  lastPayment: "25 Feb", status: "due"      },
  { id: 10, name: "Pandey Pharma Distributors",   contact: "8987654321", industry: "Trading",       outstanding: 98000,   daysOverdue: 33, score: 59, lastContact: "9 May",   lastPayment: "18 Feb", status: "overdue"  },
  { id: 11, name: "Mishra Auto Parts",             contact: "8876543210", industry: "Retail",        outstanding: 87000,   daysOverdue: 11, score: 90, lastContact: "15 May",  lastPayment: "5 Mar",  status: "due"      },
  { id: 12, name: "Yadav Hardware Suppliers",      contact: "8765432109", industry: "Trading",       outstanding: 74000,   daysOverdue: 48, score: 41, lastContact: "2 May",   lastPayment: "20 Jan", status: "overdue"  },
];

function formatAmount(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${(n / 1000).toFixed(0)}K`;
}

type SortKey = "outstanding" | "daysOverdue" | "score";

export default function CollectionsPage() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("daysOverdue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterIndustry, setFilterIndustry] = useState<string>("all");
  const [selected, setSelected] = useState<number[]>([]);

  const industries = useMemo(() => ["all", ...Array.from(new Set(ALL_CUSTOMERS.map((c) => c.industry)))], []);

  const filtered = useMemo(() => {
    let rows = ALL_CUSTOMERS;
    if (search) rows = rows.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.contact.includes(search));
    if (filterStatus !== "all") rows = rows.filter((c) => c.status === filterStatus);
    if (filterIndustry !== "all") rows = rows.filter((c) => c.industry === filterIndustry);
    rows = [...rows].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "desc" ? -diff : diff;
    });
    return rows;
  }, [search, sortKey, sortDir, filterStatus, filterIndustry]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const toggleSelect = (id: number) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? <span className="ml-1 text-accent">{sortDir === "desc" ? "↓" : "↑"}</span> : null;

  return (
    <DashboardLayout pageTitle="Collections">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-primary">Collections</h2>
            <p className="text-sm text-secondary mt-0.5">{filtered.length} customers &mdash; ₹45.2L outstanding</p>
          </div>
          <div className="flex gap-2">
            {selected.length > 0 && (
              <Button variant="secondary" size="sm" icon={<FiMessageSquare size={13} />}>
                Message ({selected.length})
              </Button>
            )}
            <Button variant="ghost" size="sm" icon={<FiDownload size={13} />}>Export CSV</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded-md text-sm text-primary placeholder-muted pl-9 pr-3 py-2.5 focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-surface border border-border rounded-md text-sm text-secondary px-3 py-2.5 focus:outline-none focus:border-accent"
            >
              <option value="all">All Status</option>
              <option value="overdue">Overdue</option>
              <option value="due">Due</option>
              <option value="promised">Promised</option>
            </select>
            <select
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
              className="bg-surface border border-border rounded-md text-sm text-secondary px-3 py-2.5 focus:outline-none focus:border-accent"
            >
              {industries.map((ind) => (
                <option key={ind} value={ind} className="bg-surface capitalize">{ind === "all" ? "All Industries" : ind}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="accent-accent"
                      checked={selected.length === filtered.length && filtered.length > 0}
                      onChange={() => setSelected(selected.length === filtered.length ? [] : filtered.map((c) => c.id))}
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider">Customer</th>
                  <th className="text-right px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider cursor-pointer hover:text-primary" onClick={() => toggleSort("outstanding")}>
                    Outstanding <SortIcon col="outstanding" />
                  </th>
                  <th className="text-right px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider cursor-pointer hover:text-primary hidden sm:table-cell" onClick={() => toggleSort("daysOverdue")}>
                    Days Overdue <SortIcon col="daysOverdue" />
                  </th>
                  <th className="text-center px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider cursor-pointer hover:text-primary hidden md:table-cell" onClick={() => toggleSort("score")}>
                    AI Score <SortIcon col="score" />
                  </th>
                  <th className="text-center px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider hidden lg:table-cell">Status</th>
                  <th className="text-right px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider hidden lg:table-cell">Last Contact</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="table-row-hover border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="accent-accent" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-surface-2 border border-border flex items-center justify-center text-xs font-semibold text-secondary shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-primary text-xs">{c.name}</p>
                          <p className="text-2xs text-muted">{c.industry} · {c.contact}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="metric-value text-xs text-primary">{formatAmount(c.outstanding)}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <Badge variant={c.daysOverdue > 45 ? "danger" : c.daysOverdue > 30 ? "warning" : "default"}>
                        {c.daysOverdue}d
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <ScoreBadge score={c.score} />
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <Badge variant={c.status === "overdue" ? "danger" : c.status === "promised" ? "warning" : "default"}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-secondary hidden lg:table-cell">{c.lastContact}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <a
                          href={`https://wa.me/91${c.contact}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium bg-success-dim text-success border border-success/30 rounded hover:bg-success hover:text-white transition-colors"
                        >
                          <FiMessageSquare size={11} />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                        <button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium bg-surface-2 text-secondary border border-border rounded hover:bg-border transition-colors">
                          <FiCheckSquare size={11} />
                          <span className="hidden sm:inline">Log</span>
                        </button>
                        <button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium bg-surface-2 text-secondary border border-border rounded hover:bg-border transition-colors">
                          <FiFileText size={11} />
                          <span className="hidden md:inline">Note</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-secondary">
              <FiSearch size={24} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No customers match your filters.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
