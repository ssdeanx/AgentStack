"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/ui/input"
import { Button } from "@/ui/button"
import {
  ChevronUp,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

export interface Column<T> {
  id: string
  header: string
  accessorKey?: keyof T
  accessorFn?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  searchPlaceholder?: string
  searchKey?: keyof T
  onRowClick?: (row: T) => void
  selectedId?: string
  getRowId?: (row: T) => string
  pageSize?: number
  emptyMessage?: string
  className?: string
}

export function DataTable<T>({
  columns,
  data,
  searchPlaceholder = "Search...",
  searchKey,
  onRowClick,
  selectedId,
  getRowId,
  pageSize = 10,
  emptyMessage = "No data found",
  className,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(0)

  const filteredData = useMemo(() => {
    if (!search || !searchKey) return data
    const searchLower = search.toLowerCase()
    return data.filter((row) => {
      const value = row[searchKey]
      if (typeof value === "string") {
        return value.toLowerCase().includes(searchLower)
      }
      return String(value).toLowerCase().includes(searchLower)
    })
  }, [data, search, searchKey])

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData
    const column = columns.find((c) => c.id === sortColumn)
    if (!column) return filteredData

    return [...filteredData].sort((a, b) => {
      let aVal: unknown
      let bVal: unknown

      if (column.accessorKey) {
        aVal = a[column.accessorKey]
        bVal = b[column.accessorKey]
      } else if (column.accessorFn) {
        aVal = column.accessorFn(a)
        bVal = column.accessorFn(b)
      } else {
        return 0
      }

      if (aVal === bVal) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      const comparison = aVal < bVal ? -1 : 1
      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [filteredData, sortColumn, sortDirection, columns])

  const paginatedData = useMemo(() => {
    const start = page * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, page, pageSize])

  const totalPages = Math.ceil(sortedData.length / pageSize)

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(columnId)
      setSortDirection("asc")
    }
  }

  const getCellValue = (row: T, column: Column<T>): React.ReactNode => {
    if (column.accessorFn) {
      return column.accessorFn(row)
    }
    if (column.accessorKey) {
      const value = row[column.accessorKey]
      if (value === null || value === undefined) return "-"
      return String(value)
    }
    return "-"
  }

  return (
    <div className={cn("space-y-4", className)}>
      {searchKey && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            className="pl-9"
          />
        </div>
      )}

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className={cn(
                      "px-4 py-3 text-left text-sm font-medium text-muted-foreground",
                      column.sortable && "cursor-pointer select-none",
                      column.className
                    )}
                    onClick={() => column.sortable && handleSort(column.id)}
                  >
                    <div className="flex items-center gap-1">
                      {column.header}
                      {column.sortable && sortColumn === column.id && (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => {
                  const rowId = getRowId?.(row) ?? String(index)
                  const isSelected = selectedId === rowId
                  return (
                    <tr
                      key={rowId}
                      className={cn(
                        "border-b transition-colors",
                        onRowClick && "cursor-pointer hover:bg-accent/50",
                        isSelected && "bg-accent"
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          className={cn("px-4 py-3 text-sm", column.className)}
                        >
                          {getCellValue(row, column)}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1} to{" "}
            {Math.min((page + 1) * pageSize, sortedData.length)} of{" "}
            {sortedData.length} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
