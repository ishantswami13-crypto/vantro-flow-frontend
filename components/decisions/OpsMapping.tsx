"use client";

// The column-mapping step of an operational import, shared by the file
// import (app/decisions/operations-import) and data feeds (app/decisions/feeds):
// what each Starlane field is, which column of the source holds it, the
// import's own proposal and the day/month question for ambiguous dates.

import { C, Pill, SectionLabel } from "@/components/decisions/ui";
import type { OpsKind, OpsField, OpsImportOptions, OpsPreview } from "@/lib/decisions";

export const LABEL: Record<OpsField, string> = {
  customer_name: "Customer name", customer_ref: "Customer code", order_ref: "Order number", line_ref: "Line number", record_id: "Record id",
  product_name: "Product name", sku: "SKU / item code", quantity: "Ordered quantity", outstanding_quantity: "Quantity still to deliver",
  unit_price: "Unit price", currency: "Currency", order_date: "Order date", promised_date: "Promised delivery date", status: "Status",
  supplier_name: "Supplier name", supplier_ref: "Supplier code", supplier_tax_id: "Supplier GSTIN", po_ref: "Purchase order number",
  received_quantity: "Quantity already received", expected_date: "Expected delivery date", purchase_date: "PO date", unit_cost: "Unit cost",
  on_hand: "Stock on hand", unit: "Unit", category: "Category", finished_sku: "Finished product SKU", finished_name: "Finished product name",
  component_sku: "Component SKU", component_name: "Component name", quantity_per_unit: "Quantity per finished unit",
};
export const label = (kind: OpsKind, f: OpsField) => (kind === "products" && f === "unit_price" ? "Selling price" : LABEL[f]);
export const HELP: Partial<Record<OpsField, string>> = {
  on_hand: "Physical stock today. Never include goods still on order.",
  quantity_per_unit: "How many of the component one finished unit uses.",
};

export const FIELDS: Record<OpsKind, { field: OpsField; required?: boolean; date?: boolean }[]> = {
  products: [
    { field: "sku" }, { field: "product_name", required: true }, { field: "on_hand" }, { field: "unit" }, { field: "unit_price" }, { field: "category" },
  ],
  components: [
    { field: "finished_sku" }, { field: "finished_name" }, { field: "component_sku" }, { field: "component_name" }, { field: "quantity_per_unit", required: true },
  ],
  orders: [
    { field: "customer_name", required: true }, { field: "order_ref", required: true }, { field: "sku" }, { field: "product_name" },
    { field: "quantity", required: true }, { field: "outstanding_quantity" }, { field: "promised_date", date: true }, { field: "unit_price" },
    { field: "currency" }, { field: "order_date", date: true }, { field: "status" }, { field: "line_ref" }, { field: "customer_ref" }, { field: "record_id" },
  ],
  purchase_lines: [
    { field: "supplier_name", required: true }, { field: "po_ref", required: true }, { field: "sku" }, { field: "product_name" },
    { field: "quantity", required: true }, { field: "received_quantity" }, { field: "outstanding_quantity" }, { field: "expected_date", date: true },
    { field: "unit_cost" }, { field: "currency" }, { field: "purchase_date", date: true }, { field: "status" }, { field: "line_ref" },
    { field: "supplier_tax_id" }, { field: "supplier_ref" }, { field: "record_id" },
  ],
};

export const KIND_TEXT: Record<OpsKind, { title: string; what: string; noun: string; template: string }> = {
  products: { title: "Products and stock on hand", what: "Your item master: SKU, name and the physical stock you hold today.", noun: "product", template: "/templates/starlane-products-template.csv" },
  components: { title: "Components (bill of materials)", what: "Which components, and how many, make one finished product. Skip this if you only resell.", noun: "component link", template: "/templates/starlane-components-template.csv" },
  purchase_lines: { title: "Open purchase orders", what: "Goods you have ordered from suppliers: how many, how many have arrived, and when the rest is expected.", noun: "purchase line", template: "/templates/starlane-purchase-orders-template.csv" },
  orders: { title: "Open customer orders", what: "Sales orders not yet fully delivered: who ordered what, how many are still to deliver, and the date you promised.", noun: "order line", template: "/templates/starlane-sales-orders-template.csv" },
};
export const KIND_ORDER: OpsKind[] = ["products", "components", "purchase_lines", "orders"];

export const selectStyle = { border: `1px solid ${C.line}`, color: C.ink, background: "#fff" } as const;

export function MappingSection({ kind, p, opts, setOpts }: { kind: OpsKind; p: OpsPreview; opts: OpsImportOptions; setOpts: (o: OpsImportOptions) => void }) {
  const fields = FIELDS[kind];
  const used = new Map<string, OpsField>();
  for (const [f, h] of Object.entries(opts.mapping)) if (h) used.set(h, f as OpsField);
  const sample = (h: string | null | undefined) => {
    if (!h) return null;
    const i = p.file.columns.indexOf(h);
    const vals = p.file.sampleRows.map((r) => r[i]).filter((v) => v != null && String(v).trim() !== "").slice(0, 3);
    return vals.length ? vals.join(" · ") : "empty in the first rows";
  };
  const dateHeaders = fields.filter((f) => f.date).map((f) => opts.mapping[f.field]).filter(Boolean) as string[];

  return (
    <section className="mb-10">
      <SectionLabel>What each column means</SectionLabel>
      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <label className="flex flex-col gap-1 text-[12.5px]" style={{ color: C.muted }}>
          Which system is this file from? (required)
          <input
            value={opts.sourceSystem}
            maxLength={60}
            placeholder="e.g. Tally Prime, Zoho Inventory, our order sheet"
            onChange={(e) => setOpts({ ...opts, sourceSystem: e.target.value })}
            className="text-[14px] rounded-md px-3 py-2"
            style={selectStyle}
          />
          <span style={{ color: C.faint }}>Lines are matched to earlier imports from the same system, so use the same name each time.</span>
        </label>
        {(kind === "orders" || kind === "purchase_lines") && <label className="flex flex-col gap-1 text-[12.5px]" style={{ color: C.muted }}>
          Currency when a row has none
          <select value={opts.currency || ""} onChange={(e) => setOpts({ ...opts, currency: e.target.value || null })} className="text-[14px] rounded-md px-3 py-2" style={selectStyle}>
            <option value="">None: leave the value uncounted</option>
            {["INR", "USD", "EUR", "GBP", "AED", "SGD"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>}
      </div>

      {kind === "purchase_lines" && (
        <fieldset className="mb-5 rounded-[8px] px-4 py-3" style={{ border: `1px solid ${C.line}`, background: "#fff" }}>
          <legend className="text-[12.5px] px-1" style={{ color: C.muted }}>Who records stock when these goods arrive? (required)</legend>
          {([
            ["STARLANE", "Starlane", "Receipts you record on Inbound shipments add to stock here."],
            ["EXTERNAL", "My accounting system (e.g. Tally purchase vouchers)", "Stock comes from your accounting sync; receipts here only track what is still due, so nothing is counted twice."],
          ] as const).map(([v, label, help]) => (
            <label key={v} className="flex items-start gap-2.5 py-1.5 text-[13.5px]" style={{ color: C.body }}>
              <input type="radio" name="stockFollows" checked={opts.stockFollows === v} onChange={() => setOpts({ ...opts, stockFollows: v })} className="mt-1" />
              <span><span style={{ color: C.ink, fontWeight: 500 }}>{label}</span><span className="block text-[12.5px]" style={{ color: C.faint }}>{help}</span></span>
            </label>
          ))}
          {p.tenant.hasTallyStock && (
            <p className="text-[12px] mt-1" style={{ color: C.warn }}>Your stock already comes from Tally, so the accounting-system option is preselected.</p>
          )}
        </fieldset>
      )}

      <div className="rounded-[8px] overflow-hidden" style={{ border: `1px solid ${C.line}`, background: "#fff" }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: C.wash, color: C.muted }}>
              <th className="text-left font-normal px-4 py-2">Starlane needs</th>
              <th className="text-left font-normal px-4 py-2">Column in your file</th>
              <th className="text-left font-normal px-4 py-2 hidden md:table-cell">First values</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(({ field, required, date }) => {
              const header = opts.mapping[field] || "";
              const prop = p.proposal.fields[field];
              const isProposal = !!prop && prop.header === header;
              const dateOrder = date && header ? p.proposal.dateOrders[header] : null;
              return (
                <tr key={field} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="px-4 py-2 align-top" style={{ color: C.ink }}>
                    {label(kind, field)}{required ? <span style={{ color: C.bad }}> *</span> : null}
                    {(kind === "orders" || kind === "purchase_lines") && (field === "sku" || field === "product_name") && <span className="block text-[11.5px]" style={{ color: C.faint }}>SKU or name: at least one</span>}
                    {kind === "components" && /_sku$|_name$/.test(field) && <span className="block text-[11.5px]" style={{ color: C.faint }}>SKU or name: at least one</span>}
                    {HELP[field] && <span className="block text-[11.5px]" style={{ color: C.faint }}>{HELP[field]}</span>}
                  </td>
                  <td className="px-4 py-2 align-top">
                    <select
                      aria-label={label(kind, field)}
                      value={header}
                      onChange={(e) => setOpts({ ...opts, mapping: { ...opts.mapping, [field]: e.target.value || null } })}
                      className="text-[13px] rounded-md px-2 py-1.5 w-full max-w-[240px]"
                      style={selectStyle}
                    >
                      <option value="">Not in this file</option>
                      {p.file.columns.map((c) => (
                        <option key={c} value={c} disabled={used.has(c) && used.get(c) !== field}>{c}</option>
                      ))}
                    </select>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {isProposal && prop.verdict === "CONFIRMED" && <Pill tone="good" title={prop.reason}>Matched by name</Pill>}
                      {isProposal && prop.verdict === "SUGGESTED" && <Pill tone="warn" title={prop.reason}>Suggested: please check</Pill>}
                      {header && !isProposal && <Pill tone="neutral">Your choice</Pill>}
                      {!header && required && <Pill tone="bad">Missing</Pill>}
                      {dateOrder && dateOrder.verdict === "PROVEN" && <Pill tone="good" title={dateOrder.reason}>Date order read from the data</Pill>}
                    </div>
                  </td>
                  <td className="px-4 py-2 align-top hidden md:table-cell tabular-nums" style={{ color: C.faint }}>{sample(header)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dateHeaders.map((h) => {
        const d = p.proposal.dateOrders[h];
        if (!d || d.verdict === "PROVEN" || d.verdict === "NOT_NEEDED") return null;
        return (
          <div key={h} className="mt-3 rounded-[8px] px-4 py-3" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
            <p className="text-[13.5px]" style={{ color: C.ink }}>How are dates written in &quot;{h}&quot;?</p>
            <p className="text-[12px] mb-2" style={{ color: C.faint }}>{d.reason}</p>
            {(["DMY", "MDY"] as const).map((o) => (
              <label key={o} className="inline-flex items-center gap-2 mr-5 text-[13px]" style={{ color: C.body }}>
                <input type="radio" name={`date-${h}`} checked={opts.dateOrders[h] === o} onChange={() => setOpts({ ...opts, dateOrders: { ...opts.dateOrders, [h]: o } })} />
                {o === "DMY" ? "Day first (03/04 = 3 April)" : "Month first (03/04 = 4 March)"}
              </label>
            ))}
          </div>
        );
      })}

      {p.proposal.unmapped.length > 0 && (
        <p className="text-[12px] mt-3" style={{ color: C.faint }}>Not used: {p.proposal.unmapped.join(", ")}.</p>
      )}
    </section>
  );
}
