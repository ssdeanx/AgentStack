import { LoadingSkeleton } from "../_components"

export default function AgentsLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-6">
        <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-48 bg-muted rounded animate-pulse" />
      </div>
      <div className="flex-1 overflow-auto p-6">
        <LoadingSkeleton variant="list" count={8} />
      </div>
    </div>
  )
}
