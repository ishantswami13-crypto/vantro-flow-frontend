"use client";

// Organization settings: profile and first-time setup, applications,
// members and roles, teams, agent policies, usage and the audit log. Every
// change is checked against the caller's role on the server and recorded in
// the audit log; this page only shows what the server allows.

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Subnav, Button, EmptyLine } from "@/components/v32/ui";
import { platformApi, PlatformError, type Role, type Policy, type ModelPrices } from "@/lib/platform";
import AuditList from "@/components/platform/AuditList";
import { useActiveOrg, useWorkspace, can, PlatformErrorBanner, Loading, Chip, Field, Section, useAction, InlineError, when, MeasuredKpi, Kpi, money } from "@/components/platform/ui";

type Tab = "general" | "apps" | "members" | "teams" | "policies" | "usage" | "audit";
const ROLE_HELP: Record<Role, string> = {
  owner: "Everything, including handing over ownership",
  admin: "Manage members, teams, apps, policies and every agent",
  member: "Create and run agents, add knowledge, decide approvals meant for members",
  viewer: "See agents, runs and knowledge; change nothing",
};
const INDUSTRIES = ["Industrial distribution", "Manufacturing", "Professional services", "Legal", "Accounting", "E-commerce", "Retail", "Software", "Healthcare", "Logistics", "Education", "Other"];

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["platform"] });
}

function General() {
  const ws = useWorkspace();
  const org = ws.data?.organization;
  const [industryPreview, setIndustryPreview] = useState("");
  // During setup, suggestions follow the industry being typed (the server's rules; nothing is saved).
  const apps = useQuery({ queryKey: ["platform", "apps", org?.id, industryPreview], queryFn: () => platformApi.apps(industryPreview || undefined), enabled: !!org, placeholderData: (prev) => prev });
  const invalidate = useInvalidate();
  const editable = can(ws.data, "org.manage");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [context, setContext] = useState("");
  const [landing, setLanding] = useState("/bridge");
  const [picked, setPicked] = useState<string[]>([]);
  const act = useAction();
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!org) return;
    setName(org.name || ""); setIndustry(org.industry || ""); setContext(org.operatingContext || "");
    setLanding(typeof org.preferences?.defaultLanding === "string" ? org.preferences.defaultLanding : "/bridge");
  }, [org]);
  useEffect(() => { if (!ws.data?.needsSetup) return; const t = setTimeout(() => setIndustryPreview(industry.trim()), 400); return () => clearTimeout(t); }, [industry, ws.data?.needsSetup]);
  useEffect(() => { if (apps.data) setPicked(apps.data.apps.filter((a) => a.enabled || (!org?.onboarded && a.suggested)).map((a) => a.key)); }, [apps.data, org?.onboarded]);
  if (!org) return <Loading rows={3} />;
  const setup = ws.data?.needsSetup;

  async function save() {
    setSaved(false);
    const ok = await act.run(async () => {
      if (setup) await platformApi.setup({ name: name.trim(), industry: industry.trim(), operatingContext: context.trim() || undefined, apps: picked });
      else await platformApi.updateOrg({ name: name.trim(), industry: industry.trim(), operatingContext: context.trim(), preferences: { defaultLanding: landing } });
      return true;
    });
    if (ok) { setSaved(true); await invalidate(); }
  }

  return (
    <div className="pf-stack" style={{ maxWidth: 760 }}>
      {setup && <div className="pf-note is-warn">Tell Starlane about your organization and pick the applications you want. Everything else (agents, knowledge, approvals) is the same for every organization. You can change all of this later.</div>}
      <div className="pf-grid2">
        <Field label="Organization name" htmlFor="o-name"><input id="o-name" className="pf-input" maxLength={120} value={name} disabled={!editable} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Industry" htmlFor="o-ind">
          <input id="o-ind" className="pf-input" list="industries" maxLength={80} value={industry} disabled={!editable} onChange={(e) => setIndustry(e.target.value)} placeholder="Type or choose" />
          <datalist id="industries">{INDUSTRIES.map((i) => <option key={i} value={i} />)}</datalist>
        </Field>
      </div>
      <Field label="How your organization works" htmlFor="o-ctx" hint="Optional. What you sell, who your customers are, how work flows. Agents can use this as context.">
        <textarea id="o-ctx" className="pf-textarea" rows={4} maxLength={2000} value={context} disabled={!editable} onChange={(e) => setContext(e.target.value)} />
      </Field>
      {setup ? (
        <Section title="Applications">
          {apps.isLoading ? <Loading rows={2} /> : (
            <div className="pf-list">
              {(apps.data?.apps || []).map((a) => (
                <label key={a.key} className="pf-row" style={{ cursor: a.status === "available" ? "pointer" : "default", alignItems: "flex-start" }}>
                  <input type="checkbox" disabled={a.status !== "available"} checked={picked.includes(a.key)} style={{ marginTop: 3, accentColor: "#191917" }} onChange={(e) => setPicked(e.target.checked ? [...picked, a.key] : picked.filter((k) => k !== a.key))} />
                  <div className="pf-row-main"><div className="pf-row-title">{a.name}{a.suggested ? " · suggested for your industry" : ""}</div><div className="pf-row-sub" style={{ whiteSpace: "normal" }}>{a.summary}</div></div>
                  {a.status === "planned" && <Chip>Planned</Chip>}
                </label>
              ))}
            </div>
          )}
        </Section>
      ) : (
        <Field label="Home page for this organization" htmlFor="o-land">
          <select id="o-land" className="pf-select" style={{ maxWidth: 280 }} value={landing} disabled={!editable} onChange={(e) => setLanding(e.target.value)}>
            <option value="/bridge">Ask (new question)</option><option value="/agents">Agents</option><option value="/command">Command Center</option><option value="/knowledge">Knowledge</option>
          </select>
        </Field>
      )}
      {editable ? (
        <div className="flex items-center" style={{ gap: 10 }}>
          <Button primary disabled={act.busy || !name.trim()} onClick={save}>{setup ? "Finish setup" : "Save"}</Button>
          {saved && <span style={{ fontSize: 12.5, color: "#477054" }}>Saved.</span>}
        </div>
      ) : <div className="pf-note">Only admins and the owner can change these settings.</div>}
      <InlineError error={act.error} />
      <p style={{ fontSize: 12, color: "#8F8A81", margin: 0 }}>Your role here: {ws.data?.role}. {ws.data?.role ? ROLE_HELP[ws.data.role] : ""}.</p>
    </div>
  );
}

function Apps() {
  const ws = useWorkspace();
  const q = useQuery({ queryKey: ["platform", "apps", ws.data?.organization.id], queryFn: () => platformApi.apps() });
  const invalidate = useInvalidate();
  const act = useAction();
  const editable = can(ws.data, "apps.manage");
  if (q.isLoading) return <Loading rows={4} />;
  if (q.error) return <PlatformErrorBanner error={q.error} what="Applications" />;
  return (
    <div className="pf-stack" style={{ maxWidth: 820 }}>
      <p style={{ margin: 0, fontSize: 13, color: "#43433F" }}>Applications add screens for one kind of work. Turning one off hides its screens for everyone in this organization; its data is kept.</p>
      <div className="pf-list">
        {(q.data?.apps || []).map((a) => (
          <div key={a.key} className="pf-row" style={{ alignItems: "flex-start" }}>
            <div className="pf-row-main">
              <div className="pf-row-title">{a.name}</div>
              <div className="pf-row-sub" style={{ whiteSpace: "normal" }}>{a.summary}</div>
              {a.requires && <div style={{ fontSize: 12, color: "#8F8A81", marginTop: 3 }}>Needs: {a.requires}</div>}
              {a.items.length > 0 && <div style={{ fontSize: 12, color: "#8F8A81", marginTop: 3 }}>Screens: {a.items.map((i) => i.label).join(", ")}</div>}
            </div>
            {a.status === "planned" ? <Chip>Planned</Chip> : editable ? (
              <Button small primary={!a.enabled} disabled={act.busy} onClick={() => act.run(async () => { await platformApi.setApp(a.key, !a.enabled); await invalidate(); })}>{a.enabled ? "Turn off" : "Turn on"}</Button>
            ) : <Chip tone={a.enabled ? "good" : undefined}>{a.enabled ? "On" : "Off"}</Chip>}
          </div>
        ))}
      </div>
      <InlineError error={act.error} />
    </div>
  );
}

function Members() {
  const ws = useWorkspace();
  const q = useQuery({ queryKey: ["platform", "members", ws.data?.organization.id], queryFn: () => platformApi.members() });
  const invalidate = useInvalidate();
  const act = useAction();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [mail, setMail] = useState(true);
  const [result, setResult] = useState<{ text: string; url?: string; note?: string | null } | null>(null);
  const [copied, setCopied] = useState(false);
  const manage = can(ws.data, "members.manage");
  const isOwner = ws.data?.role === "owner";
  const invites = useQuery({ queryKey: ["platform", "invitations", ws.data?.organization.id], queryFn: () => platformApi.invitations(), enabled: manage });
  const open = (invites.data?.invitations || []).filter((i) => i.status === "pending");
  // An existing account is added at once; anyone else gets an invitation link.
  async function add() {
    setResult(null); setCopied(false);
    const addr = email.trim();
    await act.run(async () => {
      try {
        await platformApi.addMember(addr, role);
        setResult({ text: `${addr} was added as ${role}.` });
      } catch (e) {
        if (!(e instanceof PlatformError) || e.code !== "USER_NOT_FOUND") throw e;
        const r = await platformApi.invite(addr, role, mail);
        setResult({ text: `${addr} has no Starlane account yet, so an invitation was created.${r.emailSent ? " It was emailed to them." : ""}`, url: r.url, note: r.emailNote });
      }
      setEmail(""); await invalidate();
    });
  }
  return (
    <div className="pf-stack" style={{ maxWidth: 820 }}>
      {manage && (
        <Section title="Add or invite a member">
          <div className="flex flex-wrap items-end" style={{ gap: 8 }}>
            <div style={{ flex: 1, minWidth: 220 }}><Field label="Email" htmlFor="m-email"><input id="m-email" type="email" className="pf-input" value={email} onChange={(e) => setEmail(e.target.value)} /></Field></div>
            <div style={{ width: 150 }}><Field label="Role" htmlFor="m-role"><select id="m-role" className="pf-select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {isOwner && <option value="admin">Admin</option>}<option value="member">Member</option><option value="viewer">Viewer</option>
            </select></Field></div>
            <Button primary disabled={act.busy || !/\S+@\S+\.\S+/.test(email)} onClick={add}>Add or invite</Button>
          </div>
          <label className="pf-toggle" style={{ marginTop: 8 }}><input type="checkbox" checked={mail} onChange={(e) => setMail(e.target.checked)} />If they have no account yet, email them the invitation link</label>
          <p style={{ fontSize: 12, color: "#8F8A81", margin: "6px 0 0" }}>Someone who already has a Starlane account is added straight away. Anyone else gets a link that works only when they sign in with this email. It expires in 7 days.</p>
          {result && (
            <div className="pf-note" role="status" style={{ marginTop: 10 }}>
              {result.text}{result.note ? ` ${result.note}` : ""}
              {result.url && (
                <div className="flex items-center" style={{ gap: 8, marginTop: 8 }}>
                  <input aria-label="Invitation link" readOnly className="pf-input" value={result.url} onFocus={(e) => e.target.select()} />
                  <Button small onClick={() => { navigator.clipboard?.writeText(result.url!).then(() => setCopied(true)).catch(() => {}); }}>{copied ? "Copied" : "Copy link"}</Button>
                </div>
              )}
              {result.url && <div style={{ fontSize: 12, color: "#8F8A81", marginTop: 6 }}>This link is shown only now. Revoke the invitation below to cancel it.</div>}
            </div>
          )}
        </Section>
      )}
      {manage && open.length > 0 && (
        <Section title="Invitations waiting" aside={`${open.length}`}>
          <div className="pf-list">
            {open.map((i) => (
              <div key={i.id} className="pf-row">
                <div className="pf-row-main"><div className="pf-row-title">{i.email}</div><div className="pf-row-sub">{i.role} · {i.emailSent ? "emailed" : "link shared by hand"} · expires {when(i.expiresAt)}{i.invitedByEmail ? ` · by ${i.invitedByEmail}` : ""}</div></div>
                {(isOwner || i.role !== "admin") && <Button small disabled={act.busy} onClick={() => { if (window.confirm(`Revoke the invitation for ${i.email}? The link stops working.`)) act.run(async () => { await platformApi.revokeInvitation(i.id); await invalidate(); }); }}>Revoke</Button>}
              </div>
            ))}
          </div>
        </Section>
      )}
      <InlineError error={act.error} />
      <Section title="Members" aside={q.data ? `${q.data.members.length}` : undefined}>
        {q.isLoading ? <Loading rows={3} /> : q.error ? <PlatformErrorBanner error={q.error} what="Members" /> : (
          <div className="pf-list">
            {(q.data?.members || []).map((m) => (
              <div key={m.userId} className="pf-row">
                <div className="pf-row-main"><div className="pf-row-title">{m.name || m.email}</div><div className="pf-row-sub">{m.email} · joined {when(m.joinedAt)}</div></div>
                {manage && m.role !== "owner" && (isOwner || m.role !== "admin") ? (
                  <>
                    <select aria-label={`Role of ${m.email}`} className="pf-select" style={{ width: 120 }} value={m.role} disabled={act.busy} onChange={(e) => act.run(async () => { await platformApi.changeRole(m.userId, e.target.value as Role); await invalidate(); })}>
                      {isOwner && <option value="admin">Admin</option>}<option value="member">Member</option><option value="viewer">Viewer</option>
                    </select>
                    <Button small disabled={act.busy} onClick={() => { if (window.confirm(`Remove ${m.email} from this organization? Their private agents stay but stop running for them.`)) act.run(async () => { await platformApi.removeMember(m.userId); await invalidate(); }); }}>Remove</Button>
                  </>
                ) : <Chip tone={m.role === "owner" ? "good" : undefined}>{m.role}</Chip>}
              </div>
            ))}
          </div>
        )}
      </Section>
      <Section title="Roles">
        <div className="pf-list">{(Object.keys(ROLE_HELP) as Role[]).map((r) => <div key={r} className="pf-row"><div className="pf-row-main"><div className="pf-row-title" style={{ textTransform: "capitalize" }}>{r}</div><div className="pf-row-sub" style={{ whiteSpace: "normal" }}>{ROLE_HELP[r]}</div></div></div>)}</div>
      </Section>
    </div>
  );
}

function Teams() {
  const ws = useWorkspace();
  const q = useQuery({ queryKey: ["platform", "teams", ws.data?.organization.id], queryFn: () => platformApi.teams() });
  const members = useQuery({ queryKey: ["platform", "members", ws.data?.organization.id], queryFn: () => platformApi.members() });
  const invalidate = useInvalidate();
  const act = useAction();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [adding, setAdding] = useState<Record<string, string>>({});
  const manage = can(ws.data, "teams.manage");
  return (
    <div className="pf-stack" style={{ maxWidth: 820 }}>
      {manage && (
        <Section title="New team">
          <div className="flex flex-wrap items-end" style={{ gap: 8 }}>
            <div style={{ width: 220 }}><Field label="Name" htmlFor="t-name"><input id="t-name" className="pf-input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></Field></div>
            <div style={{ flex: 1, minWidth: 200 }}><Field label="Description" htmlFor="t-desc"><input id="t-desc" className="pf-input" maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} /></Field></div>
            <Button primary disabled={act.busy || !name.trim()} onClick={() => act.run(async () => { await platformApi.createTeam(name.trim(), description.trim() || undefined); setName(""); setDescription(""); await invalidate(); })}>Create team</Button>
          </div>
        </Section>
      )}
      <InlineError error={act.error} />
      {q.isLoading ? <Loading rows={3} /> : q.error ? <PlatformErrorBanner error={q.error} what="Teams" /> : (q.data?.teams || []).length === 0 ? (
        <EmptyLine title="No teams yet" body="Teams let you share agents and knowledge with a group instead of everyone." />
      ) : (q.data?.teams || []).map((t) => (
        <Section key={t.id} title={t.name} aside={`${t.memberCount} member${t.memberCount === 1 ? "" : "s"}${t.isMember ? " · you are in it" : ""}`}>
          {t.description && <p style={{ margin: "0 0 8px", fontSize: 13, color: "#43433F" }}>{t.description}</p>}
          <div className="pf-list">
            {t.members.map((m) => (
              <div key={m.userId} className="pf-row">
                <div className="pf-row-main"><div className="pf-row-title">{m.email}</div></div>
                {manage && <Button small disabled={act.busy} onClick={() => act.run(async () => { await platformApi.removeTeamMember(t.id, m.userId); await invalidate(); })}>Remove</Button>}
              </div>
            ))}
            {t.members.length === 0 && <div className="pf-row"><span style={{ fontSize: 12.5, color: "#8F8A81" }}>No members yet.</span></div>}
          </div>
          {manage && (
            <div className="flex flex-wrap items-center" style={{ gap: 8, marginTop: 8 }}>
              <select aria-label={`Add to ${t.name}`} className="pf-select" style={{ maxWidth: 280 }} value={adding[t.id] || ""} onChange={(e) => setAdding({ ...adding, [t.id]: e.target.value })}>
                <option value="">Add a member…</option>
                {(members.data?.members || []).filter((m) => !t.members.some((x) => x.userId === m.userId)).map((m) => <option key={m.userId} value={m.userId}>{m.email}</option>)}
              </select>
              <Button small disabled={act.busy || !adding[t.id]} onClick={() => act.run(async () => { await platformApi.addTeamMember(t.id, adding[t.id]); setAdding({ ...adding, [t.id]: "" }); await invalidate(); })}>Add</Button>
              <Button small disabled={act.busy} onClick={() => { if (window.confirm(`Delete the team "${t.name}"? It is refused while agents or collections still belong to it.`)) act.run(async () => { await platformApi.deleteTeam(t.id); await invalidate(); }); }}>Delete team</Button>
            </div>
          )}
        </Section>
      ))}
    </div>
  );
}

function Policies() {
  const ws = useWorkspace();
  const q = useQuery({ queryKey: ["platform", "policy", ws.data?.organization.id], queryFn: () => platformApi.policy() });
  const tools = useQuery({ queryKey: ["platform", "tools", ws.data?.organization.id], queryFn: () => platformApi.tools() });
  const invalidate = useInvalidate();
  const act = useAction();
  const [p, setP] = useState<Policy | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (q.data) setP(q.data.policy); }, [q.data]);
  const manage = can(ws.data, "policies.manage");
  if (q.isLoading || !p) return q.error ? <PlatformErrorBanner error={q.error} what="Policies" /> : <Loading rows={3} />;
  const set = (patch: Partial<Policy>) => { setSaved(false); setP({ ...p, ...patch }); };
  return (
    <div className="pf-stack" style={{ maxWidth: 760 }}>
      <div className="pf-grid2">
        <Field label="Agent runs at the same time" htmlFor="p-conc" hint={`Up to ${p.ceilings.maxConcurrentExecutions} on this server`}>
          <input id="p-conc" type="number" className="pf-input" min={1} max={p.ceilings.maxConcurrentExecutions} value={p.maxConcurrentExecutions} disabled={!manage} onChange={(e) => set({ maxConcurrentExecutions: Number(e.target.value) })} />
        </Field>
        <Field label="Agent runs per day" htmlFor="p-daily" hint={`Up to ${p.ceilings.dailyExecutionLimit} on this server`}>
          <input id="p-daily" type="number" className="pf-input" min={1} max={p.ceilings.dailyExecutionLimit} value={p.dailyExecutionLimit} disabled={!manage} onChange={(e) => set({ dailyExecutionLimit: Number(e.target.value) })} />
        </Field>
        <Field label="Default approver for new agents" htmlFor="p-appr">
          <select id="p-appr" className="pf-select" value={p.defaultApproverRole} disabled={!manage} onChange={(e) => set({ defaultApproverRole: e.target.value as Role })}>
            <option value="member">A member or above</option><option value="admin">An admin or the owner</option><option value="owner">Only the owner</option>
          </select>
        </Field>
      </div>
      <label className="pf-toggle"><input type="checkbox" checked={p.membersMayShareWithOrganization} disabled={!manage} onChange={(e) => set({ membersMayShareWithOrganization: e.target.checked })} />Members may share agents and knowledge with the whole organization</label>
      <ModelPricesEditor value={p.modelPrices} disabled={!manage} onChange={(v) => set({ modelPrices: v })} />
      <Section title="Tools turned off for every agent">
        {tools.isLoading ? <Loading rows={2} /> : (
          <div className="pf-list">
            {(tools.data?.tools || []).filter((t) => t.status !== "planned").map((t) => (
              <label key={t.key} className="pf-row" style={{ cursor: manage ? "pointer" : "default" }}>
                <input type="checkbox" checked={p.disabledTools.includes(t.key)} disabled={!manage} style={{ accentColor: "#191917" }} onChange={(e) => set({ disabledTools: e.target.checked ? [...p.disabledTools, t.key] : p.disabledTools.filter((k) => k !== t.key) })} />
                <div className="pf-row-main"><div className="pf-row-title">{t.name}</div><div className="pf-row-sub">{t.description}</div></div>
              </label>
            ))}
          </div>
        )}
      </Section>
      {manage ? (
        <div className="flex items-center" style={{ gap: 10 }}>
          <Button primary disabled={act.busy} onClick={async () => { const r = await act.run(() => platformApi.updatePolicy({ disabledTools: p.disabledTools, defaultApproverRole: p.defaultApproverRole, maxConcurrentExecutions: p.maxConcurrentExecutions, dailyExecutionLimit: p.dailyExecutionLimit, membersMayShareWithOrganization: p.membersMayShareWithOrganization, modelPrices: p.modelPrices })); if (r) { setP(r.policy); setSaved(true); await invalidate(); } }}>Save policies</Button>
          {saved && <span style={{ fontSize: 12.5, color: "#477054" }}>Saved.</span>}
        </div>
      ) : <div className="pf-note">Only admins and the owner can change policies.</div>}
      <InlineError error={act.error} />
    </div>
  );
}

const CURRENCIES = ["USD", "INR", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY"];

/** Prices per million tokens for the models this organization uses. Starlane never assumes a provider's price. */
function ModelPricesEditor({ value, onChange, disabled }: { value: ModelPrices; onChange: (v: ModelPrices) => void; disabled: boolean }) {
  const ws = useWorkspace();
  const used = useQuery({ queryKey: ["platform", "usage", ws.data?.organization.id], queryFn: () => platformApi.usage(), enabled: can(ws.data, "usage.view") });
  const [adding, setAdding] = useState("");
  const seen = (used.data?.cost.byModel || []).map((m) => m.model);
  const names = [...new Set([...seen, ...Object.keys(value.models)])].sort();
  const setPrice = (model: string, k: "input" | "output", raw: string) => {
    const cur = value.models[model] || { input: NaN, output: NaN };
    onChange({ ...value, models: { ...value.models, [model]: { ...cur, [k]: raw === "" ? NaN : Number(raw) } } });
  };
  const remove = (model: string) => { const next = { ...value.models }; delete next[model]; onChange({ ...value, models: next }); };
  return (
    <Section title="Model prices">
      <p style={{ fontSize: 12.5, color: "#6E6A63", margin: "0 0 10px" }}>Starlane records the tokens each model uses but does not know what your provider charges you. Enter the price per million tokens from your provider's bill or price page. Cost is shown only for models with a price.</p>
      <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
        <label htmlFor="mp-cur" style={{ fontSize: 12.5, color: "#43433F" }}>Currency</label>
        <select id="mp-cur" className="pf-select" style={{ width: 110 }} value={value.currency} disabled={disabled} onChange={(e) => onChange({ ...value, currency: e.target.value })}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {names.length === 0 ? <p style={{ fontSize: 12.5, color: "#8F8A81", margin: 0 }}>No model has been used yet. Models appear here after their first run, or add one below.</p> : (
        <div className="pf-list">
          {names.map((m) => {
            const pr = value.models[m];
            const seenRow = used.data?.cost.byModel?.find((x) => x.model === m);
            return (
              <div key={m} className="pf-row" style={{ flexWrap: "wrap" }}>
                <div className="pf-row-main">
                  <div className="pf-row-title">{m}</div>
                  <div className="pf-row-sub">{seenRow ? `${(seenRow.inputTokens + seenRow.outputTokens).toLocaleString()} tokens in the last 30 days` : "Not used in the last 30 days"}{pr ? "" : " · no price set"}</div>
                </div>
                <label style={{ fontSize: 12, color: "#6E6A63" }}>Input <input aria-label={`Input price for ${m}`} type="number" min={0} step="any" className="pf-input" style={{ width: 96, marginLeft: 4 }} value={pr && Number.isFinite(pr.input) ? pr.input : ""} disabled={disabled} onChange={(e) => setPrice(m, "input", e.target.value)} /></label>
                <label style={{ fontSize: 12, color: "#6E6A63" }}>Output <input aria-label={`Output price for ${m}`} type="number" min={0} step="any" className="pf-input" style={{ width: 96, marginLeft: 4 }} value={pr && Number.isFinite(pr.output) ? pr.output : ""} disabled={disabled} onChange={(e) => setPrice(m, "output", e.target.value)} /></label>
                {pr && !disabled && <Button small onClick={() => remove(m)}>Clear</Button>}
              </div>
            );
          })}
        </div>
      )}
      {!disabled && (
        <div className="flex items-center" style={{ gap: 8, marginTop: 10 }}>
          <input aria-label="Model to price" className="pf-input" style={{ maxWidth: 280 }} placeholder="provider/model, for example anthropic/claude-sonnet" value={adding} onChange={(e) => setAdding(e.target.value.trim())} />
          <Button small disabled={!/^[a-z0-9_-]+\/\S+$/.test(adding)} onClick={() => { setPrice(adding, "input", ""); setAdding(""); }}>Add model</Button>
        </div>
      )}
      <p style={{ fontSize: 12, color: "#8F8A81", margin: "8px 0 0" }}>Prices are per million tokens, in {value.currency}.</p>
    </Section>
  );
}

function Usage() {
  const ws = useWorkspace();
  const q = useQuery({ queryKey: ["platform", "usage", ws.data?.organization.id], queryFn: () => platformApi.usage() });
  if (q.isLoading) return <Loading rows={3} />;
  if (q.error) return <PlatformErrorBanner error={q.error} what="Usage" />;
  const d = q.data!;
  const total = d.daily.reduce((s, x) => s + x.executions, 0);
  const tokens = d.daily.reduce((s, x) => s + x.tokens, 0);
  return (
    <div className="pf-stack" style={{ maxWidth: 900 }}>
      <div className="pf-kpis">
        <Kpi label={`Runs today (limit ${d.limits.dailyExecutionLimit})`} value={d.today.executions} />
        <Kpi label="Runs, last 30 days" value={total} />
        <Kpi label="Tokens, last 30 days" value={tokens.toLocaleString()} />
        <Kpi label="Runs at once (limit)" value={d.limits.maxConcurrentExecutions} />
        <MeasuredKpi label="Model cost, last 30 days" m={d.cost} format={(v) => money(v, d.cost.currency)} />
      </div>
      <Section title="By model, last 30 days">
        {(d.cost.byModel || []).length === 0 ? <p style={{ fontSize: 12.5, color: "#8F8A81", margin: 0 }}>No model has been used in the last 30 days.</p> : (
          <div className="pf-list">{(d.cost.byModel || []).map((m) => <div key={m.model} className="pf-row"><div className="pf-row-main"><div className="pf-row-title">{m.model}</div><div className="pf-row-sub">{m.calls} call{m.calls === 1 ? "" : "s"} · {m.inputTokens.toLocaleString()} input and {m.outputTokens.toLocaleString()} output tokens</div></div><span style={{ fontSize: 12.5, color: m.cost == null ? "#8C6826" : "#43433F" }}>{m.cost == null ? "No price set" : money(m.cost, d.cost.currency)}</span></div>)}</div>
        )}
      </Section>
      <Section title="By agent, last 30 days">
        {d.perAgent.length === 0 ? <p style={{ fontSize: 12.5, color: "#8F8A81", margin: 0 }}>No agents yet.</p> : (
          <div className="pf-list">{d.perAgent.map((a) => <div key={a.agentId} className="pf-row"><div className="pf-row-main"><div className="pf-row-title">{a.name}</div></div><span style={{ fontSize: 12.5, color: "#43433F" }}>{a.executions} run{a.executions === 1 ? "" : "s"} · {a.tokens.toLocaleString()} tokens{a.cost.available && a.cost.value != null ? ` · ${money(a.cost.value, a.cost.currency)}` : ""}</span></div>)}</div>
        )}
      </Section>
      <Section title="By day">
        {d.daily.length === 0 ? <p style={{ fontSize: 12.5, color: "#8F8A81", margin: 0 }}>No runs in the last 30 days.</p> : (
          <div className="pf-list">{[...d.daily].reverse().map((x) => <div key={x.day} className="pf-row"><div className="pf-row-main"><div className="pf-row-title">{new Date(x.day).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</div></div><span style={{ fontSize: 12.5, color: "#43433F" }}>{x.executions} runs · {x.failed} failed · {x.modelCalls} model calls · {x.tokens.toLocaleString()} tokens</span></div>)}</div>
        )}
      </Section>
    </div>
  );
}

const TABS: { key: Tab; label: string; permission?: string }[] = [
  { key: "general", label: "General" },
  { key: "apps", label: "Applications" },
  { key: "members", label: "Members and roles" },
  { key: "teams", label: "Teams" },
  { key: "policies", label: "Agent policies" },
  { key: "usage", label: "Usage and limits", permission: "usage.view" },
  { key: "audit", label: "Audit log", permission: "audit.view" },
];

export default function OrganizationPage() {
  useActiveOrg();
  const ws = useWorkspace();
  const [tab, setTab] = useState<Tab>("general");
  useEffect(() => {
    const read = () => {
      const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
      setTab(t && TABS.some((x) => x.key === t) ? t : "general");
    };
    read();
    window.addEventListener("starlane:location", read);
    return () => window.removeEventListener("starlane:location", read);
  }, []);
  function go(t: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
    window.dispatchEvent(new Event("starlane:location"));
  }
  const tabs = TABS.filter((t) => !t.permission || can(ws.data, t.permission));

  return (
    <DashboardLayout pageTitle="Organization">
      <PageHeader title={ws.data?.organization.name || "Organization"} subtitle={ws.data ? `${ws.data.organization.industry || "Industry not set"} · you are ${ws.data.role === "owner" ? "the owner" : `a${ws.data.role === "admin" ? "n" : ""} ${ws.data.role}`}` : undefined}>
        <div style={{ marginTop: 18 }}><Subnav label="Organization settings" active={tab} onChange={go} items={tabs.map((t) => ({ key: t.key, label: t.label }))} /></div>
      </PageHeader>
      <div className="fade-once" style={{ marginTop: 18 }}>
        <PlatformErrorBanner error={ws.error} what="Organization settings" />
        {ws.isLoading && <Loading rows={4} />}
        {ws.data && (
          <>
            {tab === "general" && <General />}
            {tab === "apps" && <Apps />}
            {tab === "members" && <Members />}
            {tab === "teams" && <Teams />}
            {tab === "policies" && <Policies />}
            {tab === "usage" && <Usage />}
            {tab === "audit" && <AuditList kind="audit" />}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
