"use client";

// "Give an agent work": the box a person types a task into, picks the agent
// for it, and starts it. Starting opens the run page, which shows the task,
// the agent's steps while it works, and the result.
//
// Only agents the backend marks runnable can be picked. Agents are fixed
// code: none calls a model or sends a message on its own, so the box says
// so instead of promising more than the agent can do.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentInfo } from "@/lib/os";
import { queueAgentWork, SUGGESTED_WORK } from "@/lib/agentWork";
import { Lettermark } from "@/components/v32/ui";

const ArrowUp = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M8 13V3M4 7l4-4 4 4" /></svg>
);
const Chev = (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M2 3.5l3 3 3-3" /></svg>
);

export default function GiveWork({ agents, fixedKey, autoFocus = false, title }: {
  agents: AgentInfo[];
  /** Lock the box to one agent (agent detail page). */
  fixedKey?: string;
  autoFocus?: boolean;
  title?: string;
}) {
  const router = useRouter();
  const runnable = useMemo(() => agents.filter((a) => a.runnable), [agents]);
  const [key, setKey] = useState<string>(fixedKey || runnable[0]?.key || "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!fixedKey && !runnable.some((a) => a.key === key) && runnable[0]) setKey(runnable[0].key);
  }, [fixedKey, runnable, key]);

  // Grow with the text, like the Home box.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [text]);

  const agent = agents.find((a) => a.key === key) || null;
  const stopped = agent?.status === "STOPPED";
  const canStart = !!agent?.runnable && !stopped && !busy;
  const suggestions = SUGGESTED_WORK[key] || [];

  const start = (instruction: string) => {
    if (!agent || !canStart) return;
    setBusy(true);
    const work = instruction.trim() || `Run the ${agent.name.toLowerCase()} on my data`;
    const token = queueAgentWork(agent.key, work);
    router.push(`/agents/${encodeURIComponent(agent.key)}/run/new?t=${encodeURIComponent(token)}`);
  };

  if (!runnable.length) return null;

  return (
    <section className="gw" aria-label={title || "Give an agent work"}>
      {title && <h2 className="gw-title">{title}</h2>}
      <form className="gw-box" onSubmit={(e) => { e.preventDefault(); start(text); }}>
        <label htmlFor="gw-input" className="sr-only">What should the agent do?</label>
        <textarea
          id="gw-input"
          ref={ref}
          rows={2}
          maxLength={1000}
          autoFocus={autoFocus}
          value={text}
          placeholder={agent ? `Give the ${agent.name.toLowerCase()} work, e.g. "${suggestions[0] || "Run on my data"}"` : "Give an agent work"}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); start(text); } }}
        />
        <div className="gw-row">
          {fixedKey ? (
            agent && <span className="gw-agent"><Lettermark letter={agent.name} size={18} />{agent.name}</span>
          ) : (
            <label className="gw-agent gw-pick">
              {agent && <Lettermark letter={agent.name} size={18} />}
              <span className="sr-only">Agent</span>
              <select value={key} onChange={(e) => setKey(e.target.value)} aria-label="Agent">
                {runnable.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
              </select>
              <span className="gw-chev">{Chev}</span>
            </label>
          )}
          <span className="gw-model">{agent?.model === "deterministic (no LLM)" ? "Fixed code, no model" : agent?.model}</span>
          <span className="flex-1" />
          <button type="submit" className="gw-start" disabled={!canStart} title={stopped ? "Stopped on Control" : undefined}>
            {busy ? "Starting…" : "Start agent"} {!busy && ArrowUp}
          </button>
        </div>
      </form>
      {stopped && <p className="gw-note" style={{ color: "#A64F4B" }}>This agent is stopped on Control, so it cannot start.</p>}
      {suggestions.length > 0 && !stopped && (
        <div className="gw-sugs" aria-label="Suggested work">
          {suggestions.map((s) => (
            <button key={s} type="button" className="gw-sug" onClick={() => { setText(s); ref.current?.focus(); }}>{s}</button>
          ))}
        </div>
      )}
      <p className="gw-note">Agents read and analyse your data and prepare work for you. None sends a message or changes a record on its own: anything that would leave Starlane waits for your approval.</p>
    </section>
  );
}
