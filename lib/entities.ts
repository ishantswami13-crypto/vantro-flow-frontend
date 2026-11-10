// Spaces: the companies an owner runs inside one account (GET /api/entities).
// Customers and suppliers are assigned to a company by name, so invoices and
// bills follow their counterparty. The company being viewed is remembered in
// this browser per user; "All companies" is the default.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUser, request } from "@/lib/api";

export type Entity = {
  id: string; name: string; currency: string | null; country: string | null; color: string | null;
  customers: string[]; suppliers: string[];
};
type ListResponse = { available: boolean; entities: Entity[] };

export const entitiesApi = {
  list: () => request<ListResponse>("/api/entities"),
  create: (body: { name: string; currency?: string | null; country?: string | null }) =>
    request<{ entity: Entity }>("/api/entities", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Pick<Entity, "name" | "currency" | "country" | "color">>) =>
    request<{ entity: Entity }>(`/api/entities/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => request<{ success: boolean }>(`/api/entities/${id}`, { method: "DELETE" }),
  members: (id: string, customers: string[], suppliers: string[]) =>
    request<{ entity: Entity }>(`/api/entities/${id}/members`, { method: "PUT", body: JSON.stringify({ customers, suppliers }) }),
};

export const ENTITY_EVENT = "starlane:entity";
const key = () => { const id = getUser()?.id; return id ? `starlane_entity:${id}` : null; };
export function readActiveEntity(): string | null {
  if (typeof window === "undefined") return null;
  try { const k = key(); return k ? localStorage.getItem(k) : null; } catch { return null; }
}
export function setActiveEntity(id: string | null) {
  try { const k = key(); if (k) { if (id) localStorage.setItem(k, id); else localStorage.removeItem(k); } } catch { /* storage off: the choice lasts this page only */ }
  window.dispatchEvent(new Event(ENTITY_EVENT));
}

const norm = (s: string | null | undefined) => (s || "").trim().replace(/\s+/g, " ").toLowerCase();

export function useEntities() {
  return useQuery({ queryKey: ["entities"], queryFn: entitiesApi.list, staleTime: 60_000, retry: 1 });
}

/** The company being viewed, and filters that keep only its customers and suppliers. */
export function useActiveEntity() {
  const q = useEntities();
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    const load = () => setActiveId(readActiveEntity());
    load();
    window.addEventListener(ENTITY_EVENT, load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener(ENTITY_EVENT, load); window.removeEventListener("storage", load); };
  }, []);
  const entities = useMemo(() => q.data?.entities || [], [q.data]);
  const entity = entities.find((e) => e.id === activeId) || null;

  // Each customer or supplier name → its company.
  const owner = useMemo(() => {
    const c = new Map<string, Entity>(), s = new Map<string, Entity>();
    for (const e of entities) { e.customers.forEach((n) => c.set(norm(n), e)); e.suppliers.forEach((n) => s.set(norm(n), e)); }
    return { c, s };
  }, [entities]);

  const customerEntity = useCallback((name: string | null | undefined) => owner.c.get(norm(name)) || null, [owner]);
  const supplierEntity = useCallback((name: string | null | undefined) => owner.s.get(norm(name)) || null, [owner]);
  const keepCustomer = useCallback((name: string | null | undefined) => !entity || owner.c.get(norm(name))?.id === entity.id, [entity, owner]);
  const keepSupplier = useCallback((name: string | null | undefined) => !entity || owner.s.get(norm(name))?.id === entity.id, [entity, owner]);

  return { available: q.data?.available ?? false, loading: q.isLoading, entities, entity, setActive: setActiveEntity, customerEntity, supplierEntity, keepCustomer, keepSupplier };
}
