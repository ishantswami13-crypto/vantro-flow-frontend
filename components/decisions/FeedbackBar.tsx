"use client";

// One-tap pilot feedback on a decision. Each tap is stored on the backend as
// part of the decision's audit history; nothing here changes the decision.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { C } from "@/components/decisions/ui";

const V_LINE = "var(--line-strong)";
import { humaneError } from "@/components/os/prepared/kit";
import { decisionsApi, FEEDBACK_KINDS, relTime, type FeedbackKind } from "@/lib/decisions";

export default function FeedbackBar({ decisionId }: { decisionId: string }) {
  const qc = useQueryClient();
  const [picked, setPicked] = useState<FeedbackKind | null>(null);
  const [note, setNote] = useState("");
  const history = useQuery({ queryKey: ["decision-feedback", decisionId], queryFn: () => decisionsApi.getFeedback(decisionId), staleTime: 30_000 });
  const send = useMutation({
    mutationFn: (v: { kind: FeedbackKind; note?: string }) => decisionsApi.feedback(decisionId, v.kind, v.note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decision-feedback", decisionId] }),
  });
  const last = history.data?.feedback?.[0];

  return (
    <section style={{ paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
      <div className="flex flex-wrap items-center" style={{ gap: "4px 6px" }}>
        <span style={{ fontSize: 12.5, color: C.muted, marginRight: 6 }}>Was this worth your attention?</span>
        {FEEDBACK_KINDS.map((f) => (
          <button
            key={f.kind}
            type="button"
            disabled={send.isPending}
            onClick={() => { setPicked(f.kind); send.mutate({ kind: f.kind }); }}
            aria-pressed={picked === f.kind}
            className="ui-btn ui-btn-ghost ui-btn-sm"
            style={{
              fontSize: 12,
              color: picked === f.kind ? C.ink : C.muted,
              background: picked === f.kind ? "var(--surface-2)" : undefined,
              boxShadow: picked === f.kind ? `inset 0 0 0 1px ${V_LINE}` : undefined,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {picked && send.isSuccess && (
        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          <span style={{ fontSize: 12, color: C.muted }}>Recorded. Anything to add?</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was wrong or missing, in a few words"
            maxLength={1000}
            aria-label="Feedback note"
            className="ui-input flex-1 min-w-[200px]"
            style={{ width: "auto", height: 30, fontSize: 12.5 }}
          />
          <button
            type="button"
            disabled={!note.trim() || send.isPending}
            onClick={() => { send.mutate({ kind: picked, note: note.trim() }); setNote(""); }}
            className="ui-btn ui-btn-secondary ui-btn-sm"
          >
            Add note
          </button>
        </div>
      )}
      {send.isError && <p role="alert" className="text-[12px] mt-2" style={{ color: C.bad }}>{humaneError(send.error, "Your answer wasn't saved. Try again in a moment.")}</p>}
      {!picked && last && (
        <p className="text-[12px] mt-2" style={{ color: C.faint }}>You said “{last.label}” {relTime(last.at)}{last.note ? `: ${last.note}` : ""}.</p>
      )}
    </section>
  );
}
