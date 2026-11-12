"use client";

// Knowledge: collections of documents that people and agents can search.
// Scope decides who can read a collection (only me, a team, or the whole
// organization) and the server enforces it on every search, including an
// agent's. Search is full-text over the stored text and every result
// carries its citation. Text files are read in this browser; PDF and Word
// (.docx) files are sent to the server, which reads their text and keeps only
// the text. A scanned PDF or a legacy .doc is refused with the reason.

import { Fragment, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader, Button, EmptyLine } from "@/components/v32/ui";
import { IconLibrary, IconUpload, IconTrash } from "@/components/v32/icons";
import { platformApi, type Collection } from "@/lib/platform";
import { useActiveOrg, useWorkspace, can, PlatformErrorBanner, Loading, Chip, Field, Section, useAction, InlineError, when } from "@/components/platform/ui";

const TEXT_FILES = ".txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.xml,.log,.yaml,.yml";
const SERVER_FILES = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_CHARS = 1_000_000;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const isServerFile = (f: File) => /\.(pdf|docx)$/i.test(f.name);

/** Show «highlighted» search terms without rendering any HTML from the server. */
function Snippet({ text }: { text: string }) {
  const parts = text.split(/(«[^»]*»)/g);
  return <>{parts.map((p, i) => (p.startsWith("«") && p.endsWith("»") ? <mark key={i} style={{ background: "rgba(140,104,38,0.16)", color: "inherit", padding: "0 1px" }}>{p.slice(1, -1)}</mark> : <Fragment key={i}>{p}</Fragment>))}</>;
}

function scopeLabel(c: Collection) {
  return c.scope === "personal" ? "Only me" : c.scope === "team" ? `Team${c.teamName ? `: ${c.teamName}` : ""}` : "Organization";
}

function CollectionView({ c, onDeleted }: { c: Collection; onDeleted: () => void }) {
  const qc = useQueryClient();
  const docs = useQuery({ queryKey: ["platform", "documents", c.id], queryFn: () => platformApi.documents(c.id) });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState<{ name: string; type: string } | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const doc = useQuery({ queryKey: ["platform", "document", openDoc], queryFn: () => platformApi.document(openDoc as string).then((r) => r.document), enabled: !!openDoc });
  const act = useAction();
  const refresh = () => qc.invalidateQueries({ queryKey: ["platform"] });

  async function pick(file: File | undefined) {
    if (!file) return;
    act.setError(null);
    if (isServerFile(file)) {
      if (file.size > MAX_UPLOAD_BYTES) { act.setError("Files up to 15 MB can be added to Knowledge."); return; }
      setFile(file); setContent(""); setSource(null);
      setTitle((t) => t || file.name.replace(/\.[^.]+$/, ""));
      return;
    }
    if (/\.(doc|xls|xlsx|ppt|pptx)$/i.test(file.name)) { act.setError("Only Word (.docx) and PDF are read from documents. Save older .doc files as .docx or PDF."); return; }
    if (file.size > 4 * MAX_CHARS) { act.setError("That file is too large. Text documents up to about 1 million characters are supported."); return; }
    setReading(file.name);
    try {
      const text = await file.text();
      if (text.length > MAX_CHARS) { act.setError("That file has more than 1 million characters. Split it into smaller documents."); return; }
      if (/\u0000/.test(text.slice(0, 2000))) { act.setError("That file is not text. Choose a PDF, a Word (.docx) file or a text file."); return; }
      setFile(null);
      setContent(text);
      setTitle((t) => t || file.name.replace(/\.[^.]+$/, ""));
      setSource({ name: file.name, type: file.type || "text/plain" });
    } finally { setReading(null); }
  }
  async function add() {
    const r = await act.run(() => file
      ? platformApi.uploadDocument(c.id, file, title.trim() || undefined)
      : platformApi.addDocument(c.id, { title: title.trim(), content, sourceName: source?.name, mimeType: source?.type, sourceKind: source ? "upload" : "paste" }));
    if (r) { setTitle(""); setContent(""); setSource(null); setFile(null); await refresh(); }
  }

  return (
    <div className="pf-stack">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="hv-block-title" style={{ fontSize: 22 }}>{c.name}</h2>
          <p style={{ margin: 0, fontSize: 12.5, color: "#6E6A63" }}>{scopeLabel(c)} · {c.documentCount} document{c.documentCount === 1 ? "" : "s"}{c.ownerEmail ? ` · created by ${c.ownerEmail}` : ""}</p>
          {c.description && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#43433F" }}>{c.description}</p>}
        </div>
        {c.canWrite && <Button small disabled={act.busy} onClick={() => { if (window.confirm(`Delete "${c.name}" and its ${c.documentCount} document(s)? Agents that use it will lose access. This cannot be undone.`)) act.run(async () => { await platformApi.deleteCollection(c.id); await refresh(); onDeleted(); }); }}><IconTrash size={12} /> Delete collection</Button>}
      </div>

      {c.canWrite && (
        <Section title="Add a document">
          <div className="pf-stack" style={{ gap: 10 }}>
            <Field label="Title" htmlFor="doc-title"><input id="doc-title" className="pf-input" maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            {file ? (
              <div className="pf-note" role="status">
                <strong style={{ fontWeight: 500 }}>{file.name}</strong> ({(file.size / 1024).toFixed(file.size < 10240 ? 1 : 0)} KB). Starlane reads its text when you add it and keeps only the text. Scanned PDFs without a text layer are refused.{" "}
                <button type="button" onClick={() => setFile(null)} style={{ textDecoration: "underline" }}>Remove</button>
              </div>
            ) : (
              <Field label="Text" htmlFor="doc-text" hint={source ? `From ${source.name} (${content.length.toLocaleString()} characters)` : "Paste the text, or choose a PDF, Word (.docx) or text file."}>
                <textarea id="doc-text" className="pf-textarea" rows={6} value={content} onChange={(e) => { setContent(e.target.value); setSource(null); }} />
              </Field>
            )}
            <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
              <label className="btn-secondary-v32 inline-flex items-center gap-1.5" style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12.5, border: "1px solid #E4E1DA", cursor: "pointer" }}>
                <IconUpload size={12} /> {reading ? `Reading ${reading}…` : file ? "Choose another file" : "Choose a file"}
                <input type="file" aria-label="Choose a PDF, Word or text file" accept={`${SERVER_FILES},${TEXT_FILES}`} style={{ display: "none" }} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              <Button small primary disabled={act.busy || (file ? false : !title.trim() || !content.trim())} onClick={add}>{act.busy ? (file ? "Reading and adding…" : "Adding…") : "Add document"}</Button>
            </div>
            <InlineError error={act.error} />
          </div>
        </Section>
      )}

      <Section title="Documents">
        {docs.isLoading ? <Loading rows={3} /> : docs.error ? <PlatformErrorBanner error={docs.error} what="Documents" /> : (docs.data?.documents || []).length === 0 ? (
          <p style={{ fontSize: 12.5, color: "#8F8A81", margin: 0 }}>No documents yet.</p>
        ) : (
          <div className="pf-list">
            {(docs.data?.documents || []).map((d) => (
              <Fragment key={d.id}>
                <div className="pf-row">
                  <button type="button" className="pf-row-main text-left" onClick={() => setOpenDoc(openDoc === d.id ? null : d.id)} aria-expanded={openDoc === d.id}>
                    <div className="pf-row-title">{d.title}</div>
                    <div className="pf-row-sub">{d.sourceName || d.sourceKind} · {d.chunkCount} passage{d.chunkCount === 1 ? "" : "s"} · {(d.byteSize / 1024).toFixed(d.byteSize < 10240 ? 1 : 0)} KB · {when(d.createdAt)}{d.uploadedBy ? ` · ${d.uploadedBy}` : ""}</div>
                  </button>
                  {d.status !== "ready" && <Chip tone="warn">{d.statusDetail || d.status}</Chip>}
                  {c.canWrite && <Button small disabled={act.busy} onClick={() => { if (window.confirm(`Delete "${d.title}"?`)) act.run(async () => { await platformApi.deleteDocument(c.id, d.id); await refresh(); }); }}>Delete</Button>}
                </div>
                {openDoc === d.id && <div style={{ padding: "0 16px 14px" }}>{doc.isLoading ? <Loading rows={1} /> : doc.data ? <><pre className="pf-pre">{doc.data.text}</pre>{doc.data.truncated && <p style={{ fontSize: 12, color: "#8F8A81" }}>Showing the beginning of the document.</p>}</> : <PlatformErrorBanner error={doc.error} what="The document" />}</div>}
              </Fragment>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function NewCollection({ onCreated }: { onCreated: (id: string) => void }) {
  const org = useActiveOrg();
  const ws = useWorkspace();
  const teams = useQuery({ queryKey: ["platform", "teams", org], queryFn: () => platformApi.teams() });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<"personal" | "team" | "organization">("organization");
  const [teamId, setTeamId] = useState("");
  const act = useAction();
  const qc = useQueryClient();
  async function create() {
    const r = await act.run(() => platformApi.createCollection({ name: name.trim(), description: description.trim() || undefined, scope, teamId: scope === "team" ? teamId : null }));
    if (r) { await qc.invalidateQueries({ queryKey: ["platform", "collections"] }); onCreated(r.id); }
  }
  return (
    <div className="pf-stack">
      <h2 className="hv-block-title" style={{ fontSize: 22 }}>New collection</h2>
      <Field label="Name" htmlFor="c-name"><input id="c-name" className="pf-input" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: Customer contracts" /></Field>
      <Field label="Description" htmlFor="c-desc"><input id="c-desc" className="pf-input" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <div className="pf-grid2">
        <Field label="Who can read it" htmlFor="c-scope" hint="Agents can only read it when the person they run for can.">
          <select id="c-scope" className="pf-select" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
            <option value="organization">Everyone in the organization</option>
            <option value="team">A team</option>
            <option value="personal">Only me</option>
          </select>
        </Field>
        {scope === "team" && (
          <Field label="Team" htmlFor="c-team"><select id="c-team" className="pf-select" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">Choose a team</option>
            {(teams.data?.teams || []).filter((t) => t.isMember || can(ws.data, "teams.manage")).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></Field>
        )}
      </div>
      <div><Button primary disabled={act.busy || !name.trim() || (scope === "team" && !teamId)} onClick={create}>Create collection</Button></div>
      <InlineError error={act.error} />
    </div>
  );
}

export default function KnowledgePage() {
  const org = useActiveOrg();
  const ws = useWorkspace();
  const cols = useQuery({ queryKey: ["platform", "collections", org], queryFn: () => platformApi.collections(), retry: false });
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const search = useQuery({ queryKey: ["platform", "search", org, submitted], queryFn: () => platformApi.search(submitted), enabled: submitted.trim().length > 1 });
  const list = cols.data?.collections || [];
  const current = list.find((c) => c.id === selected) || null;
  const canWrite = can(ws.data, "knowledge.write");

  return (
    <DashboardLayout pageTitle="Knowledge">
      <PageHeader title="Knowledge" subtitle="Documents your people and agents can search, with a citation for every answer" right={canWrite ? <Button primary onClick={() => setSelected("new")}>New collection</Button> : undefined} />
      <div className="pf-stack fade-once" style={{ marginTop: 18 }}>
        <PlatformErrorBanner error={cols.error} what="Knowledge" />
        <form className="flex items-center" style={{ gap: 8, maxWidth: 640 }} onSubmit={(e) => { e.preventDefault(); setSubmitted(query); }}>
          <input aria-label="Search knowledge" className="pf-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search every collection you can read" />
          <Button primary type="submit" disabled={query.trim().length < 2}>Search</Button>
        </form>
        {submitted.trim().length > 1 && (
          <Section title={`Results for "${submitted}"`} aside={search.data ? `${search.data.results.length} passage${search.data.results.length === 1 ? "" : "s"} in ${search.data.searchedCollections} collection${search.data.searchedCollections === 1 ? "" : "s"}` : undefined}>
            {search.isLoading ? <Loading rows={2} /> : search.error ? <PlatformErrorBanner error={search.error} what="Search" /> : (search.data?.results || []).length === 0 ? (
              <p style={{ fontSize: 12.5, color: "#8F8A81", margin: 0 }}>Nothing matched. Search looks for the words themselves, so try the terms the document uses.</p>
            ) : (
              <div className="pf-list">
                {(search.data?.results || []).map((r, i) => (
                  <button key={`${r.documentId}-${r.chunk}`} type="button" className="pf-row w-full text-left" style={{ alignItems: "flex-start" }} onClick={() => setSelected(r.collectionId)}>
                    <span style={{ fontSize: 12, color: "#8F8A81", minWidth: 22 }}>[{i + 1}]</span>
                    <div className="pf-row-main">
                      <div style={{ fontSize: 13.5, color: "#1F1D1A", lineHeight: 1.55 }}><Snippet text={r.snippet} /></div>
                      <div className="pf-row-sub">{r.citation}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Section>
        )}

        {cols.isLoading && <Loading rows={3} />}
        {cols.data && (
          <div className="hv-detail" style={{ gridTemplateColumns: "minmax(0, 300px) minmax(0, 1fr)" }}>
            <div>
              {list.length === 0 ? (
                <EmptyLine icon={<IconLibrary size={17} />} title="No collections yet" body={canWrite ? "Create a collection, add documents, then give agents access to it." : "Nobody has shared a collection with you yet."} />
              ) : (
                <div className="pf-list">
                  {list.map((c) => (
                    <button key={c.id} type="button" className="pf-row w-full text-left" style={selected === c.id ? { background: "#F6F5F1" } : undefined} onClick={() => setSelected(c.id)}>
                      <div className="pf-row-main"><div className="pf-row-title">{c.name}</div><div className="pf-row-sub">{scopeLabel(c)} · {c.documentCount} doc{c.documentCount === 1 ? "" : "s"}</div></div>
                    </button>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 12, color: "#8F8A81", margin: "10px 0 0" }}>Files in the Finance Vault stay in <a href="/library" style={{ textDecoration: "underline" }}>Vault</a>.</p>
            </div>
            <div>
              {selected === "new" ? <NewCollection onCreated={(id) => setSelected(id)} />
                : current ? <CollectionView key={current.id} c={current} onDeleted={() => setSelected(null)} />
                : list.length > 0 && <p style={{ fontSize: 13, color: "#8F8A81", margin: 0 }}>Choose a collection to see its documents.</p>}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
