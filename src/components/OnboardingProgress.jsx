import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const STEPS = [
  { key: 'uploaded', label: 'Upload your first invoices', icon: '📤', page: 'dashboard' },
  { key: 'called', label: 'Log your first call', icon: '📞', page: 'calls' },
  { key: 'paid', label: 'Mark a customer as paid', icon: '✅', page: 'payments' },
  { key: 'shared', label: 'Share Vantro with a friend', icon: '🤝', page: null },
];

function OnboardingProgress({ user, onNavigate }) {
  const [completed, setCompleted] = useState({});
  const [dismissed, setDismissed] = useState(false);
  const [loginCount, setLoginCount] = useState(0);

  useEffect(() => {
    const count = parseInt(localStorage.getItem('vantro_logins') || '0') + 1;
    localStorage.setItem('vantro_logins', count);
    setLoginCount(count);

    const saved = JSON.parse(localStorage.getItem(`vantro_onboarding_${user.id}`) || '{}');
    const wasDismissed = localStorage.getItem(`vantro_onboarding_dismissed_${user.id}`) === 'true';
    setCompleted(saved);
    setDismissed(wasDismissed);

    // Check actual data
    Promise.all([
      axios.get(`${API_BASE}/api/invoices/${user.id}`),
      axios.get(`${API_BASE}/api/calls/${user.id}`),
    ]).then(([invRes, callRes]) => {
      const hasInvoices = (invRes.data.invoices?.length || 0) > 0;
      const hasCalls = (callRes.data.calls?.length || 0) > 0;
      const hasPaid = invRes.data.invoices?.some(i => i.payment_status === 'Paid');
      const hasShared = !!localStorage.getItem(`vantro_shared_${user.id}`);
      const newCompleted = { uploaded: hasInvoices, called: hasCalls, paid: hasPaid, shared: hasShared };
      setCompleted(newCompleted);
      localStorage.setItem(`vantro_onboarding_${user.id}`, JSON.stringify(newCompleted));
    }).catch(() => {});
  }, [user.id]);

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem(`vantro_onboarding_dismissed_${user.id}`, 'true');
  };

  const markShared = () => {
    localStorage.setItem(`vantro_shared_${user.id}`, 'true');
    setCompleted(c => ({ ...c, shared: true }));
  };

  // Only show for first 8 logins and if not all complete
  const allDone = STEPS.every(s => completed[s.key]);
  if (dismissed || loginCount > 8 || allDone) return null;

  const doneCount = STEPS.filter(s => completed[s.key]).length;
  const pct = Math.round((doneCount / STEPS.length) * 100);
  const nextStep = STEPS.find(s => !completed[s.key]);

  return (
    <div className="onboarding-card">
      <div className="onboarding-header">
        <div>
          <h3>🚀 Quick Start — {pct}% complete</h3>
          <p>Complete these to get the most from Vantro</p>
        </div>
        <button className="onb-dismiss" onClick={dismiss}>✕</button>
      </div>

      <div className="onb-progress-bar">
        <div className="onb-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="onb-steps">
        {STEPS.map(step => (
          <div key={step.key} className={`onb-step ${completed[step.key] ? 'done' : ''}`}>
            <span className="onb-icon">{completed[step.key] ? '✅' : step.icon}</span>
            <span className="onb-step-label">{step.label}</span>
            {!completed[step.key] && step.key === nextStep?.key && (
              step.key === 'shared'
                ? <button className="onb-action-btn" onClick={markShared}>Mark as done</button>
                : step.page && <button className="onb-action-btn" onClick={() => onNavigate(step.page)}>Go →</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default OnboardingProgress;
