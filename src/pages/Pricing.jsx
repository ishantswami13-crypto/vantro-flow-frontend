import React, { useState } from 'react';

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    emoji: '🌱',
    monthly: 0,
    annual: 0,
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#86efac',
    badge: null,
    tagline: 'Get started for free',
    features: [
      { text: 'Up to 50 invoices/month', included: true },
      { text: 'Basic payment reminders', included: true },
      { text: 'CSV upload', included: true },
      { text: 'WhatsApp templates (3)', included: true },
      { text: 'AI Insights', included: false },
      { text: 'Camera scanner', included: false },
      { text: 'CRM Prospects', included: false },
      { text: 'Cash Flow Forecast', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Get started free',
    ctaStyle: 'outline',
  },
  {
    key: 'pro',
    name: 'Pro',
    emoji: '⚡',
    monthly: 999,
    annual: 799,
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#93c5fd',
    badge: 'Most Popular',
    tagline: 'For growing distributors',
    features: [
      { text: 'Unlimited invoices', included: true },
      { text: 'Smart payment reminders', included: true },
      { text: 'CSV + Camera scanner', included: true },
      { text: 'WhatsApp templates (unlimited)', included: true },
      { text: 'AI Insights & Analytics', included: true },
      { text: 'CRM Prospects Kanban', included: true },
      { text: 'Cash Flow Forecast', included: true },
      { text: 'Priority support', included: false },
      { text: 'Tally integration', included: false },
    ],
    cta: 'Start 14-day free trial',
    ctaStyle: 'filled',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    emoji: '🏆',
    monthly: 2499,
    annual: 1999,
    color: '#7c3aed',
    bg: '#faf5ff',
    border: '#c4b5fd',
    badge: 'Best Value',
    tagline: 'Full power + integrations',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Tally / ERP integration', included: true },
      { text: 'ML-based call priority', included: true },
      { text: 'Custom WhatsApp templates', included: true },
      { text: 'Deep AI analysis (Claude)', included: true },
      { text: 'Multi-user (up to 5)', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Priority support 24×7', included: true },
      { text: 'Custom onboarding', included: true },
    ],
    cta: 'Contact sales',
    ctaStyle: 'purple',
  },
];

const FAQS = [
  { q: 'Can I switch plans anytime?', a: 'Yes! Upgrade or downgrade at any time. Changes take effect immediately and you\'re billed pro-rata.' },
  { q: 'Is there a free trial for paid plans?', a: 'Pro plan comes with a 14-day free trial — no credit card required. Enterprise includes a 30-day trial.' },
  { q: 'What payment methods do you accept?', a: 'UPI, credit/debit cards, net banking, and NEFT/RTGS for enterprise. Invoices in INR.' },
  { q: 'What happens if I exceed my invoice limit?', a: 'On Starter, you\'ll be prompted to upgrade. We never delete your data — we just pause new uploads until you upgrade.' },
  { q: 'Can I export my data?', a: 'Yes — all plans support CSV export of invoices, payments, and call logs at any time.' },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="pricing-page">
      {/* Hero */}
      <div className="pricing-hero">
        <h1>Simple, transparent pricing</h1>
        <p>No hidden fees. Cancel anytime. Built for Indian distributors.</p>
        <div className="pricing-toggle">
          <span className={!annual ? 'toggle-active' : ''}>Monthly</span>
          <button
            className={`toggle-switch ${annual ? 'on' : ''}`}
            onClick={() => setAnnual(a => !a)}
            aria-label="Toggle annual billing"
          >
            <span className="toggle-thumb" />
          </button>
          <span className={annual ? 'toggle-active' : ''}>
            Annual <span className="save-badge">Save 20%</span>
          </span>
        </div>
      </div>

      {/* Plans */}
      <div className="pricing-cards">
        {PLANS.map(plan => {
          const price = annual ? plan.annual : plan.monthly;
          return (
            <div
              key={plan.key}
              className={`pricing-card ${plan.key === 'pro' ? 'pricing-card-featured' : ''}`}
              style={{ borderColor: plan.key === 'pro' ? plan.color : undefined }}
            >
              {plan.badge && (
                <div className="plan-badge" style={{ background: plan.color }}>{plan.badge}</div>
              )}
              <div className="plan-header">
                <span className="plan-emoji">{plan.emoji}</span>
                <div>
                  <h2 className="plan-name">{plan.name}</h2>
                  <p className="plan-tagline">{plan.tagline}</p>
                </div>
              </div>

              <div className="plan-price">
                {price === 0 ? (
                  <span className="price-val">Free</span>
                ) : (
                  <>
                    <span className="price-currency">₹</span>
                    <span className="price-val">{price.toLocaleString('en-IN')}</span>
                    <span className="price-period">/mo{annual ? ' (billed annually)' : ''}</span>
                  </>
                )}
              </div>

              <ul className="plan-features">
                {plan.features.map((f, i) => (
                  <li key={i} className={`plan-feature ${f.included ? 'included' : 'excluded'}`}>
                    <span className="feature-icon">{f.included ? '✅' : '❌'}</span>
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`plan-cta plan-cta-${plan.ctaStyle}`}
                style={plan.ctaStyle === 'filled' ? { background: plan.color } : plan.ctaStyle === 'purple' ? { background: plan.color } : { color: plan.color, borderColor: plan.color }}
                onClick={() => alert(`Coming soon! We'll reach out when ${plan.name} plan is available. 🚀`)}
              >
                {plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Comparison hint */}
      <div className="pricing-note">
        <span>🤝</span>
        <p>All plans include data security, regular backups, and GDPR-compliant data handling. Indian data stored on Indian servers.</p>
      </div>

      {/* Social proof */}
      <div className="pricing-proof">
        <h2>Trusted by distributors across India</h2>
        <div className="proof-stats">
          <div className="proof-stat">
            <strong>₹2.4Cr+</strong>
            <span>Collected via Vantro</span>
          </div>
          <div className="proof-stat">
            <strong>340+</strong>
            <span>Active distributors</span>
          </div>
          <div className="proof-stat">
            <strong>32%</strong>
            <span>Avg faster collections</span>
          </div>
          <div className="proof-stat">
            <strong>4.8★</strong>
            <span>Average rating</span>
          </div>
        </div>

        <div className="testimonials">
          <div className="testimonial">
            <p>"Vantro Pro paid for itself in the first week — recovered ₹1.2L I had almost written off."</p>
            <span>— Rajesh Sharma, FMCG Distributor, Delhi</span>
          </div>
          <div className="testimonial">
            <p>"The CRM Prospects feature helped me close 3 new dealers this month. Worth every rupee."</p>
            <span>— Meena Patel, Pharma Distributor, Ahmedabad</span>
          </div>
          <div className="testimonial">
            <p>"Cash Flow Forecast showed me exactly when I'd run into trouble. Avoided a crisis."</p>
            <span>— Suresh Kumar, Auto Parts Dealer, Chennai</span>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="pricing-faq">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-list">
          {FAQS.map((faq, i) => (
            <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
              <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{faq.q}</span>
                <span className="faq-arrow">{openFaq === i ? '▲' : '▼'}</span>
              </button>
              {openFaq === i && <div className="faq-a">{faq.a}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* CTA banner */}
      <div className="pricing-cta-banner">
        <h2>Ready to recover your money faster?</h2>
        <p>Join 340+ distributors already using Vantro Flow</p>
        <button className="pricing-cta-main" onClick={() => alert('Sign up is available on the login page! 🚀')}>
          Start free today →
        </button>
      </div>
    </div>
  );
}
