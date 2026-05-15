"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge, ScoreBadge } from "@/components/ui/Badge";
import Link from "next/link";
import {
  FiDollarSign, FiClock, FiPercent, FiAlertTriangle, FiTrendingDown,
  FiTarget, FiMessageSquare, FiCheckSquare, FiArrowRight,
  FiList, FiTrendingUp, FiSettings,
} from "react-icons/fi";

const CUSTOMERS = [
  { id: 1, name: "Mehta Fabrics Pvt Ltd", outstanding: "₹8,40,000", days: 62, score: 82, lastPayment: "12 Jan 2024", contact: "9876543210" },
  { id: 2, name: "Sharma Steel Works",     outstanding: "₹5,20,000", days: 45, score: 67, lastPayment: "28 Jan 2024", contact: "9765432109" },
  { id: 3, name: "Patel Agro Industries",  outstanding: "₹3,15,000", days: 38, score: 54, lastPayment: "5 Feb 2024",  contact: "9654321098" },
  { id: 4, name: "Gupta Construction Co",  outstanding: "₹2,80,000", days: 29, score: 71, lastPayment: "15 Feb 2024", contact: "9543210987" },
  { id: 5, name: "Verma Chemicals Ltd",    outstanding: "₹1,95,000", days: 18, score: 45, lastPayment: "22 Feb 2024", contact: "9432109876" },
];

export default function DashboardPage() {
  const cashRunway = 12;
  const lowCash = cashRunway < 15;

  return (
    <DashboardLayout pageTitle="Dashboard">
      <div className="space-y-6">
        {lowCash && (
          <Alert variant="danger" title="Low Cash Runway Warning">
            Cash runway is {cashRunway} days. Prioritize collections immediately.{" "}
            <Link href="/collections" className="font-semibold underline underline-offset-2 hover:no-underline">
              View priority list
            </Link>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-primary">Collections Needed Today</h2>
            <p className="text-sm text-secondary mt-0.5">Thursday, 15 May 2024</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="metric-value text-2xl text-accent">₹14,20,000</span>
            <Badge variant="danger">Overdue</Badge>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard label="Total Outstanding"     value="₹45.2L"       sub="across 42 customers"  icon={<FiDollarSign size={16} />} accent="default" />
          <MetricCard label="Days Sales Outstanding" value="42 days"      trend="down" trendValue="3d" sub="vs last month" icon={<FiClock size={16} />} accent="warning" />
          <MetricCard label="Collection Rate"        value="68%"          trend="up" trendValue="4%" sub="this month" icon={<FiPercent size={16} />} accent="success" />
          <MetricCard label="Cash Runway"            value={`${cashRunway} days`} sub="at current burn" icon={<FiTrendingDown size={16} />} accent="danger" />
          <MetricCard label="Amount Overdue"         value="₹20.1L"       sub=">30 days overdue"    icon={<FiAlertTriangle size={16} />} accent="danger" />
          <MetricCard label="Best Collection Prob."  value="82%"          sub="Mehta Fabrics"       icon={<FiTarget size={16} />} accent="success" />
        </div>

        {/* Priority call table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-primary">Top Customers to Call Today</h3>
            <Link href="/collections" className="flex items-center gap-1 text-xs text-accent hover:underline">
              View all <FiArrowRight size={12} />
            </Link>
          </div>
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider">Customer</th>
                    <th className="text-right px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider">Outstanding</th>
                    <th className="text-right px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider hidden sm:table-cell">Days Overdue</th>
                    <th className="text-center px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider hidden md:table-cell">Collection %</th>
                    <th className="text-right px-4 py-3 text-2xs font-semibold text-secondary uppercase tracking-wider hidden lg:table-cell">Last Payment</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {CUSTOMERS.map((c, i) => (
                    <tr key={c.id} className={["table-row-hover border-b border-border last:border-0", i === 0 ? "bg-accent-dim/30" : ""].join(" ")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded bg-surface-2 border border-border flex items-center justify-center text-2xs font-semibold text-secondary shrink-0">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-primary text-xs">{c.name}</p>
                            <p className="text-2xs text-muted">{c.contact}</p>
                          </div>
                          {i === 0 && <Badge variant="accent" className="hidden sm:inline-flex">Priority</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="metric-value text-xs text-primary">{c.outstanding}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <Badge variant={c.days > 45 ? "danger" : c.days > 30 ? "warning" : "default"}>
                          {c.days}d
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        <ScoreBadge score={c.score} />
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-secondary hidden lg:table-cell">{c.lastPayment}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <a
                            href={`https://wa.me/91${c.contact}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium bg-success-dim text-success border border-success/30 rounded hover:bg-success hover:text-white transition-colors"
                          >
                            <FiMessageSquare size={11} />
                            WhatsApp
                          </a>
                          <button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium bg-surface-2 text-secondary border border-border rounded hover:bg-border hover:text-primary transition-colors">
                            <FiCheckSquare size={11} />
                            Log
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick nav cards */}
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { href: "/collections", Icon: FiList,      label: "Full Collections List", sub: "42 active customers" },
            { href: "/forecast",    Icon: FiTrendingUp, label: "Cash Flow Forecast",   sub: "30/60/90 day projections" },
            { href: "/settings",   Icon: FiSettings,  label: "Settings",              sub: "Manage preferences" },
          ].map(({ href, Icon, label, sub }) => (
            <Link href={href} key={href}>
              <div className="bg-surface border border-border rounded-lg p-4 hover:border-accent/40 transition-colors group">
                <Icon size={18} className="text-secondary group-hover:text-accent mb-2 transition-colors" />
                <p className="text-sm font-medium text-primary">{label}</p>
                <p className="text-xs text-secondary mt-0.5">{sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
