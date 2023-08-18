import { redirect } from "next/navigation"

import { getUser } from "@/app/supabase-server"

interface AuthLayoutProps {
  children: React.ReactNode
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const user = await getUser()

  if (user) {
    console.error("AUTH LAYOUT PAGE: USER DOESN'T EXIST")

    redirect("/dashboard")
  }
  return <div className="min-h-screen">{children}</div>
}
