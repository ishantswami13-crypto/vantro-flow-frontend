"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Render a long list a page at a time.
 *
 * A company with thousands of invoices or customers used to get every row as
 * a DOM node at once, which froze the page for seconds and made typing in the
 * search box lag. This shows the first `pageSize` rows and adds more on
 * demand. The count starts over whenever `resetKey` changes (a new search,
 * filter or sort), so the person always sees the top of the new result.
 */
export function useIncrementalList<T>(items: T[], pageSize = 100, resetKey: unknown = undefined) {
  const [limit, setLimit] = useState(pageSize);
  useEffect(() => { setLimit(pageSize); }, [resetKey, pageSize]);
  const visible = useMemo(() => items.slice(0, limit), [items, limit]);
  const remaining = Math.max(0, items.length - visible.length);
  return {
    visible,
    remaining,
    total: items.length,
    showMore: () => setLimit((n) => n + pageSize),
  };
}
