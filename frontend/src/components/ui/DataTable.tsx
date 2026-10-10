import type { ReactNode } from "react";
import { Spinner } from "./Spinner";

export interface Column<T> { header: string; render: (row: T) => ReactNode; className?: string }

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading: boolean;
  error?: string | null;
  emptyTitle: string;
  emptyHint: string;
}

export function DataTable<T>({ columns, rows, rowKey, loading, error, emptyTitle, emptyHint }: Props<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-muted">
        <Spinner /> Loading emails...
      </div>
    );
  }
  if (error) return <div className="py-20 text-center text-sm text-rose-ink">{error}</div>;
  if (!rows.length) {
    return (
      <div className="py-20 text-center">
        <p className="font-semibold">{emptyTitle}</p>
        <p className="mt-1 text-sm text-muted">{emptyHint}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-muted">
            {columns.map((c) => (
              <th key={c.header} className="whitespace-nowrap px-4 py-3 font-medium">{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className="border-b border-line/70 last:border-0 hover:bg-canvas/60">
              {columns.map((c) => (
                <td key={c.header} className={`px-4 py-3 ${c.className ?? ""}`}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
