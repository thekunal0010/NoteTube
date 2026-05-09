import { DashboardLayout } from "@/components/dashboard-layout"
import { EmptyState } from "@/components/empty-state"

export default function NotesPage() {
  return (
    <DashboardLayout>
      <EmptyState
        title="No Notes Available"
        description="Generate notes from a YouTube video first."
        actionLabel="Go to Dashboard"
        actionHref="/dashboard"
      />
    </DashboardLayout>
  )
}
