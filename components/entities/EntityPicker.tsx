"use client";

// The company switcher shown beside a page title: "All companies" or one of
// the Spaces the owner set up. Hidden until there is at least one company.

import Link from "next/link";
import { useActiveEntity } from "@/lib/entities";
import { PillSelect } from "@/components/command/Charts";

export function EntityPicker() {
  const { entities, entity, setActive } = useActiveEntity();
  if (!entities.length) return null;
  const options = [{ value: "", label: "All companies" }, ...entities.map((e) => ({ value: e.id, label: e.name }))];
  return <PillSelect label="Company" value={entity?.id || ""} options={options} onChange={(v) => setActive(v || null)} />;
}

/** One line under a title saying which company the figures cover. */
export function EntityNote() {
  const { entity } = useActiveEntity();
  if (!entity) return null;
  return (
    <p className="cc-note" style={{ margin: 0 }}>
      Showing {entity.name} only: {entity.customers.length} customer{entity.customers.length === 1 ? "" : "s"}{entity.suppliers.length ? ` and ${entity.suppliers.length} supplier${entity.suppliers.length === 1 ? "" : "s"}` : ""}.{" "}
      <Link href="/spaces" className="sp-link">Manage Spaces</Link>
    </p>
  );
}
