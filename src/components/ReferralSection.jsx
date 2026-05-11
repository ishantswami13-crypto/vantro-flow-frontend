import React, { useState } from 'react';

const REFERRAL_MSG = `Hey! I've been using Vantro Flow to track my invoices and collect payments faster. It's helped me recover money I thought was gone. Check it out: https://vantro-flow-frontend.vercel.app`;

function ReferralSection({ user, onMarkShared }) {
  const [copied, setCopied] = useState(false);

  const alreadyShared = !!localStorage.getItem(`vantro_shared_${user.id}`);

  const handleShare = () => {
    const encoded = encodeURIComponent(REFERRAL_MSG);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    localStorage.setItem(`vantro_shared_${user.id}`, 'true');
    if (onMarkShared) onMarkShared();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(REFERRAL_MSG).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (alreadyShared) return null;

  return (
    <div className="referral-card">
      <div className="referral-content">
        <div className="referral-text">
          <h3>🤝 Know another business owner?</h3>
          <p>Share Vantro with a friend and help them get paid faster too.</p>
        </div>
        <div className="referral-actions">
          <button className="referral-wa-btn" onClick={handleShare}>
            💬 Share on WhatsApp
          </button>
          <button className="referral-copy-btn" onClick={handleCopy}>
            {copied ? '✅ Copied!' : '📋 Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReferralSection;
