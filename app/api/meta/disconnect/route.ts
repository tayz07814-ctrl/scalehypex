import { createServerSupabaseClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

/**
 * POST /api/meta/disconnect
 * Deletes the signed-in user's meta_accounts row(s).
 */
export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return Response.json({ error: "Not signed in" }, { status: 401 })
  }

  const { error: deleteError } = await supabase
    .from("meta_accounts")
    .delete()
    .eq("user_id", data.user.id)

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
