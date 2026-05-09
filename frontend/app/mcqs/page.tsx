import { DashboardLayout } from "@/components/dashboard-layout"
import { EmptyState } from "@/components/empty-state"

export default function MCQsPage() {
  return (
    <DashboardLayout>
      <EmptyState
        title="No MCQs Available"
        description="Generate notes from a YouTube video first to create practice questions."
        actionLabel="Go to Dashboard"
        actionHref="/dashboard"
      />
    </DashboardLayout>
  )
}
