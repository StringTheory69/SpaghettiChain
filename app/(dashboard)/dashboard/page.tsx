import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { DashboardHeader } from "@/components/header"
import { PostCreateButton } from "@/components/post-create-button"
import { PostItem } from "@/components/post-item"
import { DashboardShell } from "@/components/shell"
import { createServerSupabaseClient } from "@/app/supabase-server"

export const metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()

  const { data: chains } = await supabase
    .from("chains")
    .select("id, title, published, created_at")
    .order("updated_at", { ascending: false })

  return (
    <DashboardShell>
      <DashboardHeader heading="Posts" text="Create and manage chains.">
        <PostCreateButton />
      </DashboardHeader>
      <div>
        {chains?.length ? (
          <div className="divide-y divide-border rounded-md border">
            {chains.map((post) => (
              <PostItem key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="post" />
            <EmptyPlaceholder.Title>No chains created</EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              You don&apos;t have any chains yet. Start creating content.
            </EmptyPlaceholder.Description>
            <PostCreateButton variant="outline" />
          </EmptyPlaceholder>
        )}
      </div>
    </DashboardShell>
  )
}
