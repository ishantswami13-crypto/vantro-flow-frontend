"use client";
import { useEffect, useState } from "react";
import { FiUsers, FiCalendar, FiDollarSign, FiChevronLeft, FiChevronRight, FiCheck, FiX, FiMinus } from "react-icons/fi";
import { getToken } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "https://vantro-flow-backend-production.up.railway.app";

type Worker = { id: number; name: string; role?: string; monthly_salary: number; is_active: boolean; };
type AttendanceRecord = { worker_id: number; date: string; status: "present" | "absent" | "half"; };
type SalaryRecord = { worker_id: number; worker_name: string; monthly_salary: number; present_days: number; half_days: number; absent_days: number; total_days: number; effective_days: number; gross_salary: number; advance_balance: number; net_salary: number; };

const fmtINR = (n: number) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0 });
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const statusConfig = {
  present: { label: "P", bg: "bg-success text-white", icon: FiCheck },
  absent:  { label: "A", bg: "bg-danger text-white",  icon: FiX },
  half:    { label: "H", bg: "bg-yellow-400 text-black", icon: FiMinus },
};

export default function AttendancePage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [salary, setSalary] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"attendance" | "salary">("attendance");
  const [saving, setSaving] = useState<string | null>(null); // "workerId-date"

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [wR, aR] = await Promise.all([
        fetch(`${API}/api/workers`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch(`${API}/api/attendance?month=${month}&year=${year}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      const wD = await wR.json();
      const aD = await aR.json();
      if (wD.success) setWorkers(wD.workers.filter((w: Worker) => w.is_active));
      if (aD.success) setAttendance(aD.attendance);
    } finally { setLoading(false); }
  };

  const loadSalary = async () => {
    const r = await fetch(`${API}/api/attendance/salary?month=${month}&year=${year}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    const d = await r.json();
    if (d.success) setSalary(d.salary);
  };

  useEffect(() => { loadAll(); }, [month, year]);
  useEffect(() => { if (tab === "salary") loadSalary(); }, [tab, month, year]);

  const getStatus = (workerId: number, day: number): AttendanceRecord["status"] | null => {
    const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return attendance.find(a => a.worker_id === workerId && a.date.startsWith(dateStr))?.status || null;
  };

  const markAttendance = async (workerId: number, day: number, currentStatus: string | null) => {
    const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const cycle: (AttendanceRecord["status"] | null)[] = [null, "present", "absent", "half"];
    const nextIdx = (cycle.indexOf(currentStatus as any) + 1) % cycle.length;
    const nextStatus = cycle[nextIdx];
    const key = `${workerId}-${dateStr}`;
    setSaving(key);
    try {
      await fetch(`${API}/api/attendance`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ worker_id: workerId, date: dateStr, status: nextStatus }),
      });
      setAttendance(prev => {
        const filtered = prev.filter(a => !(a.worker_id === workerId && a.date.startsWith(dateStr)));
        if (nextStatus) return [...filtered, { worker_id: workerId, date: dateStr, status: nextStatus }];
        return filtered;
      });
    } finally { setSaving(null); }
  };

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const isToday = (day: number) => {
    const d = new Date();
    return d.getFullYear() === year && d.getMonth() + 1 === month && d.getDate() === day;
  };

  const todayStr = `${year}-${String(month).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const totalPresent = attendance.filter(a => a.status === "present" && a.date.substring(0,7) === `${year}-${String(month).padStart(2,"0")}`).length;

  return (
    <div className="p-4 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-primary">Staff Attendance</h1>
          <p className="text-xs text-muted">Haazri aur salary calculator</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 bg-surface-2 rounded-xl text-muted hover:text-primary transition-colors"><FiChevronLeft size={16} /></button>
          <span className="text-sm font-bold text-primary w-20 text-center">{MONTHS[month-1]} {year}</span>
          <button onClick={nextMonth} className="p-2 bg-surface-2 rounded-xl text-muted hover:text-primary transition-colors"><FiChevronRight size={16} /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-4">
          <p className="text-xs text-muted mb-1">Active Staff</p>
          <p className="text-xl font-bold text-primary">{workers.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted mb-1">Total Present</p>
          <p className="text-xl font-bold text-success">{totalPresent}</p>
          <p className="text-2xs text-muted">this month</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted mb-1">Working Days</p>
          <p className="text-xl font-bold text-accent">{daysInMonth}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[{ k: "attendance", l: "📅 Attendance", i: FiCalendar }, { k: "salary", l: "💰 Salary", i: FiDollarSign }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === t.k ? "bg-accent text-white" : "bg-surface-2 text-muted hover:text-primary"}`}>
            {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted">Loading...</div>
      ) : workers.length === 0 ? (
        <div className="text-center py-12 card">
          <FiUsers size={36} className="mx-auto mb-3 text-muted opacity-30" />
          <p className="text-muted text-sm">Koi worker nahi mila</p>
          <p className="text-xs text-muted mt-1">Team page se workers add karo</p>
        </div>
      ) : tab === "attendance" ? (
        <div className="card overflow-hidden">
          {/* Day headers — desktop: full calendar grid, mobile: scrollable table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-muted font-semibold w-32">Worker</th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const dayOfWeek = new Date(year, month - 1, day).getDay();
                    return (
                      <th key={day} className={`text-center py-3 px-1 w-8 font-semibold ${isToday(day) ? "text-accent" : dayOfWeek === 0 ? "text-danger/60" : "text-muted"}`}>
                        <div>{day}</div>
                        <div className="text-2xs opacity-60">{DAYS[dayOfWeek].charAt(0)}</div>
                      </th>
                    );
                  })}
                  <th className="text-center px-3 py-3 text-muted font-semibold w-16">P/A/H</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w, wi) => {
                  const monthStr = `${year}-${String(month).padStart(2,"0")}`;
                  const wAttend = attendance.filter(a => a.worker_id === w.id && a.date.substring(0,7) === monthStr);
                  const p = wAttend.filter(a => a.status === "present").length;
                  const h = wAttend.filter(a => a.status === "half").length;
                  const a = wAttend.filter(a => a.status === "absent").length;
                  return (
                    <tr key={w.id} className={wi % 2 === 0 ? "bg-surface-1" : "bg-surface-2/30"}>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-primary text-xs">{w.name}</p>
                        <p className="text-2xs text-muted">{w.role || "Staff"}</p>
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const status = getStatus(w.id, day);
                        const key = `${w.id}-${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                        const isSaving = saving === key;
                        const cfg = status ? statusConfig[status] : null;
                        return (
                          <td key={day} className="text-center px-0.5 py-1.5">
                            <button
                              onClick={() => markAttendance(w.id, day, status)}
                              disabled={!!isSaving}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${cfg ? cfg.bg : "bg-surface-2 text-muted/40 hover:bg-accent/20 hover:text-accent"} ${isToday(day) ? "ring-1 ring-accent/50" : ""} ${isSaving ? "opacity-50" : ""}`}>
                              {isSaving ? "…" : cfg ? cfg.label : "·"}
                            </button>
                          </td>
                        );
                      })}
                      <td className="text-center px-3 py-2 whitespace-nowrap">
                        <span className="text-success font-bold">{p}</span>
                        <span className="text-muted">/</span>
                        <span className="text-danger font-bold">{a}</span>
                        <span className="text-muted">/</span>
                        <span className="text-yellow-400 font-bold">{h}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="px-4 py-3 border-t border-white/5 flex items-center gap-4 text-2xs text-muted">
            <span>Click cell to cycle:</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-surface-2 inline-block" /> Empty</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-success inline-block" /> Present (P)</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-danger inline-block" /> Absent (A)</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-yellow-400 inline-block" /> Half Day (H)</span>
          </div>
        </div>
      ) : (
        /* Salary Tab */
        <div className="space-y-3">
          {salary.length === 0 ? (
            <div className="text-center py-8 text-muted text-sm">Loading salary data...</div>
          ) : (
            salary.map(s => (
              <div key={s.worker_id} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-primary">{s.worker_name}</p>
                    <p className="text-xs text-muted">Monthly Salary: {fmtINR(s.monthly_salary)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-primary">{fmtINR(s.net_salary)}</p>
                    <p className="text-xs text-muted">Net Payable</p>
                  </div>
                </div>
                {/* Breakdown */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-3">
                  <div className="flex justify-between text-muted">
                    <span>Present Days</span>
                    <span className="text-success font-semibold">{s.present_days}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Half Days</span>
                    <span className="text-yellow-400 font-semibold">{s.half_days}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Absent Days</span>
                    <span className="text-danger font-semibold">{s.absent_days}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Effective Days</span>
                    <span className="text-primary font-semibold">{s.effective_days.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Total Days</span>
                    <span className="text-primary font-semibold">{s.total_days}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Gross Salary</span>
                    <span className="text-primary font-semibold">{fmtINR(s.gross_salary)}</span>
                  </div>
                </div>
                {/* Calculation viz */}
                <div className="flex items-center gap-2 text-xs bg-surface-2/50 rounded-xl p-3">
                  <div className="text-center">
                    <p className="text-primary font-bold">{fmtINR(s.monthly_salary)}</p>
                    <p className="text-2xs text-muted">monthly</p>
                  </div>
                  <span className="text-muted">×</span>
                  <div className="text-center">
                    <p className="text-primary font-bold">{s.effective_days.toFixed(1)}/{s.total_days}</p>
                    <p className="text-2xs text-muted">days</p>
                  </div>
                  <span className="text-muted">=</span>
                  <div className="text-center">
                    <p className="text-success font-bold">{fmtINR(s.gross_salary)}</p>
                    <p className="text-2xs text-muted">gross</p>
                  </div>
                  {s.advance_balance > 0 && (
                    <>
                      <span className="text-muted">−</span>
                      <div className="text-center">
                        <p className="text-danger font-bold">{fmtINR(s.advance_balance)}</p>
                        <p className="text-2xs text-muted">advance</p>
                      </div>
                      <span className="text-muted">=</span>
                      <div className="text-center">
                        <p className="text-accent font-bold">{fmtINR(s.net_salary)}</p>
                        <p className="text-2xs text-muted">net</p>
                      </div>
                    </>
                  )}
                </div>
                {s.advance_balance > 0 && (
                  <p className="text-xs text-yellow-400 mt-2">⚠ Advance balance {fmtINR(s.advance_balance)} deducted from salary</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
