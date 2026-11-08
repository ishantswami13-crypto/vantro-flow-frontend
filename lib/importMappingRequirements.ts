import type { ImportOptions, LedgerField } from "./decisions";

// Match the importer's mapping rule: a balance can stand in for invoice amount.
export function isRequiredMapping(field: LedgerField, mapping: ImportOptions["mapping"]): boolean {
  return field === "customer" || field === "invoice_date" || (field === "amount" && !mapping.outstanding);
}
