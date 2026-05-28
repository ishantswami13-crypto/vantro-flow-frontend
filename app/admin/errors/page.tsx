"use client";
import { useEffect, useState } from 'react';
import { request } from '@/lib/api';

export default function AdminErrorsDashboard() {
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState({ totalErrors: 0, criticalErrors: 0 });

  useEffect(() => {
    request('/api/admin/error-summary').then((res: any) => setSummary(res.summary)).catch(() => {});
    request('/api/admin/error-events').then((res: any) => setEvents(res.data)).catch(() => {});
  }, []);

  const resolve = async (id: string) => {
    await request(`/api/admin/error-events/${id}/resolve`, { method: 'PATCH' });
    setEvents(events.map((e: any) => e.id === id ? { ...e, resolved_at: new Date().toISOString() } : e));
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Error Intelligence Dashboard</h1>
      <div className="flex gap-4 mb-8">
        <div className="p-6 bg-white shadow rounded-lg w-64 border-l-4 border-blue-500">
          <div className="text-sm text-gray-500 font-bold uppercase tracking-wide">Total Errors Today</div>
          <div className="text-3xl font-bold mt-2">{summary.totalErrors}</div>
        </div>
        <div className="p-6 bg-white shadow rounded-lg w-64 border-l-4 border-red-500">
          <div className="text-sm text-gray-500 font-bold uppercase tracking-wide">Critical Errors</div>
          <div className="text-3xl font-bold mt-2 text-red-600">{summary.criticalErrors}</div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type & Severity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map((evt: any) => (
              <tr key={evt.id} className={evt.resolved_at ? 'opacity-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{evt.error_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold">{evt.type}</div>
                  <div className="text-xs uppercase px-2 py-1 bg-red-100 text-red-800 rounded-full inline-block mt-1">{evt.severity}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{evt.route}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(evt.created_at).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {!evt.resolved_at && (
                    <button onClick={() => resolve(evt.id)} className="text-blue-600 hover:text-blue-900 font-medium">Resolve</button>
                  )}
                  {evt.resolved_at && <span className="text-gray-500">Resolved</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
