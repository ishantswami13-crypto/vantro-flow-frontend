"use client";

// One-tap pilot feedback on a decision. Each tap is stored on the backend as
// part of the decision's audit history; nothing here changes the decision.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { C } from "@/components/decisions/ui";
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
    <section className="mt-10 rounded-xl px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--line-card)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] mr-1" style={{ color: C.body }}>Is this worth your attention?</span>
        {FEEDBACK_KINDS.map((f) => (
          <button
            key={f.kind}
            type="button"
            disabled={send.isPending}
            onClick={() => { setPicked(f.kind); send.mutate({ kind: f.kind }); }}
            aria-pressed={picked === f.kind}
            className="text-[12px] px-2.5 py-1 rounded-full transition-colors"
            style={{
              border: `1px solid ${picked === f.kind ? C.accent : C.line}`,
              color: picked === f.kind ? C.accent : C.body,
              background: picked === f.kind ? "var(--selected)" : "var(--surface)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {picked && send.isSuccess && (
        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          <span className="text-[12px]" style={{ color: C.good }}>Recorded. Anything to add?</span>
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
