export type ProductLedgerSource = "purchase" | "sale";

export type ProductLedgerRow = {
  source: ProductLedgerSource;
  productName: string;
  productKey: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  amount?: number;
  date?: string;
  partyName?: string;
  documentNo?: string;
  recordId?: string | number;
};

type LineItem = {
  description?: string;
  name?: string;
  product_name?: string;
  item_name?: string;
  qty?: number | string;
  quantity?: number | string;
  unit?: string;
  price?: number | string;
  rate?: number | string;
  unit_price?: number | string;
  amount?: number | string;
  total?: number | string;
  total_amount?: number | string;
};

type LedgerConfig<T> = {
  source: ProductLedgerSource;
  date: (record: T) => string | undefined;
  partyName: (record: T) => string | undefined;
  documentNo: (record: T) => string | undefined;
  recordId?: (record: T) => string | number | undefined;
  items?: (record: T) => LineItem[] | null | undefined;
  notes?: (record: T) => string | null | undefined;
};

const ITEM_SPLIT = /[;\n]+/;
const NON_ITEM = /^(gst|igst|cgst|sgst|tax|grand total|subtotal|total)\b/i;

export function normalizeProductName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/,/g, "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function normalizeDate(value?: string): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const dmy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
  return undefined;
}

function cleanProductName(value: string): string {
  return value
    .replace(/\s+@\s*₹?.*$/i, "")
    .replace(/\s+-\s*₹?.*$/i, "")
    .replace(/\bhsn\s*[:#]?\s*\w+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTextItem(value: string): LineItem | null {
  const text = value.split("|")[0].trim();
  if (!text || NON_ITEM.test(text)) return null;

  const price = numberValue(text.match(/@\s*₹?\s*([\d,]+(?:\.\d+)?)/i)?.[1]);
  const amount = numberValue(text.match(/(?:amount|total)\s*[:=-]?\s*₹?\s*([\d,]+(?:\.\d+)?)/i)?.[1]);
  const match = text.match(/^\s*(?:(\d+(?:\.\d+)?)\s*([a-zA-Z./]+)?\s+)?(.+?)(?:\s+@\s*₹?[\d,]+(?:\.\d+)?)?\s*$/);
  if (!match) return null;

  const qty = numberValue(match[1]) || 1;
  const unit = match[2] || "";
  const description = cleanProductName(match[3] || text);
  if (!description || NON_ITEM.test(description)) return null;
  return { description, qty, unit, price: price || undefined, amount: amount || (price ? price * qty : undefined) };
}

function itemsFromNotes(notes?: string | null): LineItem[] {
  if (!notes) return [];
  return notes
    .split(ITEM_SPLIT)
    .map(parseTextItem)
    .filter((item): item is LineItem => Boolean(item));
}

function lineToRow<T>(item: LineItem, record: T, config: LedgerConfig<T>): ProductLedgerRow | null {
  const productName = cleanProductName(firstText(item.description, item.product_name, item.item_name, item.name));
  if (!productName) return null;
  const quantity = numberValue(item.qty ?? item.quantity) || 1;
  const unitPrice = numberValue(item.price ?? item.rate ?? item.unit_price) || undefined;
  const amount = numberValue(item.amount ?? item.total ?? item.total_amount) || (unitPrice ? unitPrice * quantity : undefined);

  return {
    source: config.source,
    productName,
    productKey: normalizeProductName(productName),
    quantity,
    unit: item.unit || undefined,
    unitPrice,
    amount,
    date: normalizeDate(config.date(record)),
    partyName: config.partyName(record),
    documentNo: config.documentNo(record),
    recordId: config.recordId?.(record),
  };
}

export function buildProductLedgerRows<T>(records: T[], config: LedgerConfig<T>): ProductLedgerRow[] {
  return records.flatMap((record) => {
    const directItems = config.items?.(record) || [];
    const noteItems = itemsFromNotes(config.notes?.(record));
    const items = directItems.length > 0 ? directItems : noteItems;
    return items
      .map((item) => lineToRow(item, record, config))
      .filter((row): row is ProductLedgerRow => Boolean(row));
  });
}

export function matchProductQuery(row: ProductLedgerRow, query: string): boolean {
  const normalizedQuery = normalizeProductName(query);
  if (!normalizedQuery) return true;
  return row.productKey.includes(normalizedQuery);
}

export function formatQuantity(quantity: number, unit?: string): string {
  const value = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2);
  return `${value}${unit ? ` ${unit}` : ""}`;
}

export function sortByDateDesc<T extends { date?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ad = a.date ? Date.parse(a.date) : 0;
    const bd = b.date ? Date.parse(b.date) : 0;
    return bd - ad;
  });
}

export function groupProductRows(rows: ProductLedgerRow[]) {
  const map = new Map<string, {
    productName: string;
    unit?: string;
    count: number;
    quantity: number;
    amount: number;
    lastDate?: string;
  }>();

  rows.forEach((row) => {
    const current = map.get(row.productKey) || {
      productName: row.productName,
      unit: row.unit,
      count: 0,
      quantity: 0,
      amount: 0,
      lastDate: undefined,
    };
    current.count += 1;
    current.quantity += row.quantity;
    current.amount += row.amount || 0;
    if (row.date && (!current.lastDate || Date.parse(row.date) > Date.parse(current.lastDate))) {
      current.lastDate = row.date;
    }
    map.set(row.productKey, current);
  });

  return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
}
