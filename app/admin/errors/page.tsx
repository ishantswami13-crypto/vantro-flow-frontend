"use client";
import { useEffect, useState } from 'react';
import { request } from '@/lib/api';

interface ErrorEvent {
  id: string;
  error_id: string;
  type: string;
  severity: string;
  route: string;
  created_at: string;
  resolved_at: string | null;
}

interface ErrorSummary {
  totalErrors: number;
  criticalErrors: number;
}

export default function AdminErrorsDashboard() {
  // Typed rather than inferred: useState([]) infers never[], so every later
  // setEvents call is a type error and the rows have to be cast to any to read
  // a field. Naming the shape once removes both.
  const [events, setEvents] = useState<ErrorEvent[]>([]);
  const [summary, setSummary] = useState<ErrorSummary>({ totalErrors: 0, criticalErrors: 0 });

  useEffect(() => {
    request<{ summary: ErrorSummary }>('/api/admin/error-summary')
      .then(res => setSummary(res.summary)).catch(() => {});
    request<{ data: ErrorEvent[] }>('/api/admin/error-events')
      .then(res => setEvents(res.data)).catch(() => {});
  }, []);

  const resolve = async (id: string) => {
    await request(`/api/admin/error-events/${id}/resolve`, { method: 'PATCH' });
    setEvents(events.map(e => e.id === id ? { ...e, resolved_at: new Date().toISOString() } : e));
  };

  return (
    <div className="p-8 bg-bg text-primary min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-primary">Error Intelligence Dashboard</h1>
      <div className="flex gap-4 mb-8">
        <div className="card-premium p-6 w-64">
          <div className="section-label">Total Errors Today</div>
          <div className="text-3xl font-bold mt-2 text-primary metric-value">{summary.totalErrors}</div>
        </div>
        <div className="card-premium p-6 w-64 border-danger/30">
          <div className="section-label">Critical Errors</div>
          <div className="text-3xl font-bold mt-2 text-danger metric-value">{summary.criticalErrors}</div>
        </div>
      </div>

      <div className="card-premium overflow-hidden">
        <table className="min-w-full table-premium">
          <thead>
            <tr className="border-b border-border">
              <th className="px-6 py-3 text-left section-label">Error ID</th>
              <th className="px-6 py-3 text-left section-label">Type &amp; Severity</th>
              <th className="px-6 py-3 text-left section-label">Route</th>
              <th className="px-6 py-3 text-left section-label">Time</th>
              <th className="px-6 py-3 text-right section-label">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map(evt => (
              <tr key={evt.id} className={evt.resolved_at ? 'opacity-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-secondary">{evt.error_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-primary">{evt.type}</div>
                  <div className="text-2xs uppercase px-2 py-1 bg-danger-dim text-danger rounded-full inline-block mt-1">{evt.severity}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{evt.route}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{new Date(evt.created_at).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {!evt.resolved_at && (
                    <button onClick={() => resolve(evt.id)} className="text-accent hover:text-accent-hover font-medium">Resolve</button>
                  )}
                  {evt.resolved_at && <span className="text-muted">Resolved</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
