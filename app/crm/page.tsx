"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FiUsers, FiPlus, FiSearch, FiPhone, FiMessageSquare, FiCalendar, FiEdit2 } from "react-icons/fi";

type Status = "lead" | "contacted" | "trial" | "customer" | "lost";

const PROSPECTS: { id: number; name: string; phone: string; business: string; location: string; amount: number; status: Status; lastContact: string; note: string }[] = [
  { id: 1, name: "Vikram Joshi",      phone: "9876541234", business: "Joshi Textiles",     location: "Surat",     amount: 18,  status: "customer",  lastContact: "Today",    note: "Converted on Model A plan" },
  { id: 2, name: "Anita Sharma",      phone: "9765432109", business: "Sharma Pharma",      location: "Ahmedabad", amount: 32,  status: "trial",      lastContact: "Yesterday",note: "Trial ends 25 May" },
  { id: 3, name: "Ramesh Gupta",      phone: "9654321098", business: "Gupta Hardware",     location: "Jaipur",    amount: 8,   status: "contacted",  lastContact: "12 May",   note: "Needs Tally demo" },
  { id: 4, name: "Priya Patel",       phone: "9543210987", business: "Patel Agro Exports", location: "Rajkot",    amount: 45,  status: "lead",       lastContact: "10 May",   note: "High potential, follow up" },
  { id: 5, name: "Suresh Mehta",      phone: "9432109876", business: "Mehta Cold Storage", location: "Pune",      amount: 12,  status: "lost",       lastContact: "5 May",    note: "Went with competitor" },
  { id: 6, name: "Kavita Verma",      phone: "9321098765", business: "Verma Distributors", location: "Nagpur",    amount: 28,  status: "trial",      lastContact: "14 May",   note: "Very happy with AI features" },
  { id: 7, name: "Deepak Singh",      phone: "9210987654", business: "Singh Constructions",location: "Indore",    amount: 55,  status: "lead",       lastContact: "8 May",    note: "Big opportunity" },
];

const STATUS_CONFIG: Record<Status, { label: string; variant: "success"|"warning"|"accent"|"muted"|"danger"|"gold" }> = {
  lead:      { label: "Lead",      variant: "muted" },
  contacted: { label: "Contacted", variant: "warning" },
  trial:     { label: "On Trial",  variant: "accent" },
  customer:  { label: "Customer",  variant: "success" },
  lost:      { label: "Lost",      variant: "danger" },
};

const ALL_STATUS: (Status | "all")[] = ["all", "lead", "contacted", "trial", "customer", "lost"];

export default function CRMPage() {
  const [filter, setFilter] = useState<Status | "all">("all");
  const [search, setSearch]   = useState("");

  const filtered = PROSPECTS.filter(p => {
    const matchStatus = filter === "all" || p.status === filter;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.business.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    total:    PROSPECTS.length,
    trial:    PROSPECTS.filter(p => p.status === "trial").length,
    customer: PROSPECTS.filter(p => p.status === "customer").length,
    pipeline: PROSPECTS.filter(p => ["lead","contacted","trial"].includes(p.status))
                       .reduce((s, p) => s + p.amount, 0),
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">CRM — Prospects</h1>
            <p className="text-sm text-muted mt-0.5">Track leads, trials, and customer conversions</p>
          </div>
          <Button icon={<FiPlus size={14}/>} size="sm">Add Prospect</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Prospects", value: counts.total.toString(),     color: "#0066FF" },
            { label: "On Trial",        value: counts.trial.toString(),      color: "#F5A524" },
            { label: "Customers",       value: counts.customer.toString(),   color: "#10D98A" },
            { label: "Pipeline Value",  value: `₹${counts.pipeline}L`,       color: "#9B6DFF" },
          ].map(k => (
            <div key={k.label} className="card-metric p-5">
              <p className="section-label mb-3">{k.label}</p>
              <p className="metric-lg" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-border flex-wrap">
            {ALL_STATUS.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={["px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all",
                  filter === s ? "bg-accent text-white" : "text-muted hover:text-primary",
                ].join(" ")}>{s}</button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or business..."
              className="w-full pl-8 pr-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-primary placeholder-muted focus:outline-none focus:border-accent" />
          </div>
        </div>

        {/* Prospect Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(p => {
            const cfg = STATUS_CONFIG[p.status];
            return (
              <div key={p.id} className="card-premium p-4 hover:border-border-2 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-success/20 flex items-center justify-center text-sm font-bold text-accent shrink-0">
                      {p.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">{p.name}</p>
                      <p className="text-xs text-muted">{p.business} · {p.location}</p>
                    </div>
                  </div>
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1">
                    <p className="section-label mb-0.5">Amount Stuck</p>
                    <p className="text-sm font-bold text-warning">₹{p.amount}L</p>
                  </div>
                  <div className="flex-1">
                    <p className="section-label mb-0.5">Last Contact</p>
                    <p className="text-sm text-secondary">{p.lastContact}</p>
                  </div>
                </div>

                {p.note && (
                  <p className="text-xs text-muted bg-surface-2 rounded-lg px-3 py-2 mb-3">{p.note}</p>
                )}

                <div className="flex gap-2">
                  <Button variant="whatsapp" size="xs" icon={<FiMessageSquare size={11}/>}
                    onClick={() => window.open(`https://wa.me/91${p.phone}`)}>
                    WhatsApp
                  </Button>
                  <Button variant="secondary" size="xs" icon={<FiPhone size={11}/>}>Call</Button>
                  <Button variant="ghost" size="xs" icon={<FiEdit2 size={11}/>}>Update</Button>
                  <div className="flex-1" />
                  <span className="text-2xs text-muted flex items-center gap-1">
                    <FiCalendar size={10}/> {p.lastContact}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="card-premium p-12 flex flex-col items-center text-center">
            <FiUsers size={32} className="text-muted mb-3" />
            <p className="text-sm font-semibold text-primary">No prospects found</p>
            <p className="text-xs text-muted mt-1">Try a different filter or add a new prospect</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
