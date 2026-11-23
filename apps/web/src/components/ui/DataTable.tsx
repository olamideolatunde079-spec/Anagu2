"use client";
/**
 * DataTable — dark-themed sortable, paginated data table with skeleton loading.
 */
import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

export interface Column<T> {
  key:       keyof T | string;
  header:    string;
  sortable?: boolean;
  render?:   (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T extends { id: string }> {
  columns:    Column<T>[];
  data:       T[];
  loading?:   boolean;
  pageSize?:  number;
  emptyState?: React.ReactNode;
  className?:  string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  pageSize = 20,
  emptyState,
  className,
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey]   = useState<string | null>(null);
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("asc");
  const [page, setPage]         = useState(1);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = (a as Record<string, unknown>)[sortKey];
        const bv = (b as Record<string, unknown>)[sortKey];
        const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data;

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData   = sorted.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className={clsx("overflow-x-auto rounded-xl", className)}>
      <table className="data-table w-full">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={clsx(col.className, col.sortable && "cursor-pointer select-none group")}
                onClick={() => col.sortable && toggleSort(String(col.key))}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <span className="text-[#29345A] group-hover:text-[#AAB4CC]">
                      {sortKey === String(col.key)
                        ? sortDir === "asc"
                          ? <ChevronUp    size={12} />
                          : <ChevronDown  size={12} />
                        : <ChevronsUpDown size={12} />}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={String(col.key)}>
                      <div className="h-4 bg-[#29345A]/40 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            : pageData.length === 0
            ? (
                <tr>
                  <td colSpan={columns.length} className="py-0">
                    {emptyState ?? (
                      <div className="py-12 text-center text-sm text-[#AAB4CC]">
                        No records found
                      </div>
                    )}
                  </td>
                </tr>
              )
            : pageData.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={clsx(onRowClick && "cursor-pointer")}
                >
                  {columns.map((col) => (
                    <td key={String(col.key)} className={col.className}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[String(col.key)] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>

      {/* Pagination */}
      {!loading && sorted.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#29345A]">
          <p className="text-xs text-[#AAB4CC]">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost p-1.5 disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pg = page <= 4 ? i + 1 : i + page - 3;
              if (pg > totalPages) return null;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={clsx(
                    "w-7 h-7 rounded text-xs font-medium transition-colors",
                    pg === page
                      ? "bg-[#6338F5] text-white"
                      : "text-[#AAB4CC] hover:bg-white/5 hover:text-white"
                  )}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-ghost p-1.5 disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
