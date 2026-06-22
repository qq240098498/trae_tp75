import * as React from "react";
import { Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: keyof T | string;
  title: React.ReactNode;
  dataIndex?: keyof T;
  render?: (record: T, index: number) => React.ReactNode;
  width?: string | number;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  dataSource: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  striped?: boolean;
  rowKey?: keyof T | ((record: T) => string);
  className?: string;
  tableClassName?: string;
  emptyText?: React.ReactNode;
}

export function Table<T extends object>({
  columns,
  dataSource,
  loading = false,
  pagination,
  striped = true,
  rowKey = "id" as keyof T,
  className,
  tableClassName,
  emptyText = "暂无数据",
}: TableProps<T>) {
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === "function") {
      return rowKey(record);
    }
    return String(record[rowKey] ?? index);
  };

  const renderCell = (column: Column<T>, record: T, index: number): React.ReactNode => {
    if (column.render) {
      return column.render(record, index);
    }
    const dataIndex = column.dataIndex ?? (column.key as keyof T);
    return record[dataIndex] as React.ReactNode;
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0;

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <div className="relative w-full overflow-auto">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-industrial-orange">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-sm font-medium">加载中...</span>
            </div>
          </div>
        )}
        <table className={cn("w-full border-collapse text-sm", tableClassName)}>
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              {columns.map((column, index) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "px-4 py-3 text-left font-semibold text-slate-300",
                    "border-r border-slate-700 last:border-r-0",
                    column.className
                  )}
                  style={{ width: column.width }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataSource.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              dataSource.map((record, index) => (
                <tr
                  key={getRowKey(record, index)}
                  className={cn(
                    "border-b border-slate-700/50 transition-colors",
                    "hover:bg-slate-800/50",
                    striped && index % 2 === 1 && "bg-slate-800/30"
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn(
                        "px-4 py-3 text-slate-300",
                        "border-r border-slate-700/30 last:border-r-0",
                        column.className
                      )}
                      style={{ width: column.width }}
                    >
                      {renderCell(column, record, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 bg-slate-800/50">
          <div className="text-sm text-slate-400">
            共 <span className="text-white font-medium">{pagination.total}</span> 条，
            第 <span className="text-white font-medium">{pagination.current}</span> /{" "}
            <span className="text-white font-medium">{totalPages}</span> 页
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onChange(1, pagination.pageSize)}
              disabled={pagination.current <= 1}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                pagination.current <= 1
                  ? "text-slate-600 cursor-not-allowed"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              )}
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
              disabled={pagination.current <= 1}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                pagination.current <= 1
                  ? "text-slate-600 cursor-not-allowed"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              )}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 text-sm text-white bg-industrial-orange rounded-md font-medium">
              {pagination.current}
            </span>
            <button
              onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
              disabled={pagination.current >= totalPages}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                pagination.current >= totalPages
                  ? "text-slate-600 cursor-not-allowed"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              )}
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => pagination.onChange(totalPages, pagination.pageSize)}
              disabled={pagination.current >= totalPages}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                pagination.current >= totalPages
                  ? "text-slate-600 cursor-not-allowed"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              )}
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
