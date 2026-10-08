"use client";

import React from "react";

// Shared table: quiet 12px header in the tertiary ink, 48px rows with a
// hairline between them, hover on surface-2, numeric cells right-aligned
// with tabular figures and never wrapped. Every colour is a token.
export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  numeric?: boolean; // right-aligned, tabular figures, no wrapping
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, rows, rowKey, emptyMessage = "Nothing to show yet." }: DataTableProps<T>) {
  // No header over an empty table: just the honest sentence.
  if (rows.length === 0) {
    return <p style={{ margin: 0, padding: "24px 16px", fontSize: 13, color: "var(--ink-2)", textAlign: "center" }}>{emptyMessage}</p>;
  }
  const align = (col: DataTableColumn<T>) => col.align || (col.numeric ? "right" : "left");
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)" }}>
            {columns.map(col => (
              <th key={col.key} scope="col" style={{ textAlign: align(col), padding: "10px 16px", fontSize: 12, fontWeight: 400, color: "var(--ink-3)", whiteSpace: "nowrap", background: "transparent" }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)} className="row-hover" style={{ borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--line-row)" }}>
              {columns.map(col => (
                <td
                  key={col.key}
                  style={{
                    textAlign: align(col), padding: "0 16px", height: 48, color: col.numeric ? "var(--ink)" : "var(--body)",
                    fontVariantNumeric: col.numeric ? "tabular-nums" : undefined, whiteSpace: col.numeric ? "nowrap" : undefined,
                  }}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
