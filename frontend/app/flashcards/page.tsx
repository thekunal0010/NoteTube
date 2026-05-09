import { DashboardLayout } from "@/components/dashboard-layout"
import { EmptyState } from "@/components/empty-state"

export default function FlashcardsPage() {
  return (
    <DashboardLayout>
      <EmptyState
        title="No Flashcards Available"
        description="Generate notes from a YouTube video first to create flashcards."
        actionLabel="Go to Dashboard"
        actionHref="/dashboard"
      />
    </DashboardLayout>
  )
}
