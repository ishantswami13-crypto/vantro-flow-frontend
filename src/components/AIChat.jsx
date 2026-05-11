import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const SUGGESTIONS = [
  '📊 How is my business doing?',
  '⚠️ Who owes me the most?',
  '📞 Show my call stats',
  '📦 Any low stock alerts?',
  '💰 What\'s my cash forecast?',
  '🎯 Show my CRM prospects',
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`chat-msg ${isUser ? 'chat-msg-user' : 'chat-msg-ai'}`}>
      {!isUser && <div className="chat-avatar">🤖</div>}
      <div className="chat-bubble-wrap">
        <div className={`chat-bubble ${isUser ? 'bubble-user' : 'bubble-ai'}`}>
          {msg.content}
        </div>
        {msg.actions?.length > 0 && (
          <div className="chat-actions-done">
            {msg.actions.map((a, i) => (
              <span key={i} className="chat-action-pill">{a}</span>
            ))}
          </div>
        )}
        {msg.navigate && (
          <button className="chat-nav-btn" onClick={msg.onNavigate}>
            Go to {msg.navigate} →
          </button>
        )}
      </div>
      {isUser && <div className="chat-avatar chat-avatar-user">👤</div>}
    </div>
  );
}

export default function AIChat({ user, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hi ${user.business_name?.split(' ')[0] || 'there'}! 👋 I'm Vantro AI. I can check your invoices, mark payments, manage CRM prospects, check inventory, and more. What do you need?`
      }]);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = async (text) => {
    const userText = (text || input).trim();
    if (!userText) return;

    setInput('');
    setShowSuggestions(false);
    const userMsg = { role: 'user', content: userText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build history for API (only role+content, last 10 messages)
      const history = [...messages, userMsg]
        .slice(-10)
        .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

      const res = await axios.post(`${API_BASE}/api/ai-chat`, {
        user_id: user.id,
        business_name: user.business_name,
        messages: history
      });

      const { message, actions, navigate } = res.data;
      const aiMsg = {
        role: 'assistant',
        content: message,
        actions: actions || [],
        navigate,
        onNavigate: navigate ? () => { onNavigate?.(navigate); setOpen(false); } : null
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Sorry, I hit an error. Please try again.',
        actions: []
      }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        className={`ai-chat-fab ${open ? 'fab-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Vantro AI Assistant"
      >
        {open ? '✕' : '🤖'}
        {!open && <span className="fab-pulse" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="ai-chat-panel">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-header-info">
              <span className="ai-chat-icon">🤖</span>
              <div>
                <div className="ai-chat-name">Vantro AI</div>
                <div className="ai-chat-status">● Online · Powered by Groq</div>
              </div>
            </div>
            <button className="ai-chat-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Messages */}
          <div className="ai-chat-messages">
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}

            {loading && (
              <div className="chat-msg chat-msg-ai">
                <div className="chat-avatar">🤖</div>
                <div className="chat-bubble bubble-ai chat-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}

            {/* Suggestions */}
            {showSuggestions && messages.length <= 1 && !loading && (
              <div className="chat-suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} className="chat-suggestion-chip" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="ai-chat-input-row">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask me anything... (Enter to send)"
              rows={1}
              className="ai-chat-input"
              disabled={loading}
            />
            <button
              className="ai-chat-send"
              onClick={() => send()}
              disabled={loading || !input.trim()}
            >
              {loading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
