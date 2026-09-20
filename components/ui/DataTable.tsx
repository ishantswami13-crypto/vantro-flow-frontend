"use client";

import React from "react";

// Shared table component per STARLANE_FRONTEND_HANDOFF.md §12: header row
// background #F3F2EE, uppercase 11px letter-spaced labels, numeric cells
// always IBM Plex Mono, row-hover on body rows. Uses the .v32-table /
// .row-hover CSS already added to app/globals.css rather than redefining
// the visual rules per call site — replaces the previous pattern of every
// page hand-rolling its own <table className="table-premium"> markup.
export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  numeric?: boolean; // renders the cell in IBM Plex Mono per the table spec
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, rows, rowKey, emptyMessage = "No rows to show." }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full v32-table text-xs">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{ textAlign: col.align || (col.numeric ? "right" : "left") }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-6" style={{ color: "#8A8A86" }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={rowKey(row, i)} className="row-hover">
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={col.numeric ? "v32-numeric" : ""}
                    style={{ textAlign: col.align || (col.numeric ? "right" : "left") }}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
