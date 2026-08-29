import { cookies } from "next/headers"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { exchangeCodeForTokens, getUserInfo, TikTokApiError } from "@/lib/tiktok/api"

export const runtime = "nodejs"

const STATE_COOKIE = "tt_oauth_state"

/**
 * GET /api/tiktok/oauth/callback
 * TikTok redirects back here with ?code=..&state=.. after the user approves.
 * Validates state against the httpOnly cookie set at /start (single-use,
 * deleted immediately), exchanges the code for tokens, upserts the account
 * row via the USER's Supabase client (RLS owner policy), then redirects to
 * /dashboard.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  const cookieStore = await cookies()
  const storedState = cookieStore.get(STATE_COOKIE)?.value
  cookieStore.delete(STATE_COOKIE)

  if (!code || !state || !storedState || state !== storedState) {
    return Response.json(
      {
        error: "Invalid or missing OAuth state. Start again from the dashboard (Connect TikTok).",
      },
      { status: 400 },
    )
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return Response.json({ error: "Not signed in" }, { status: 401 })
  }
  const userId = data.user.id

  let tokens
  try {
    tokens = await exchangeCodeForTokens(code)
  } catch (err) {
    const message =
      err instanceof TikTokApiError
        ? `TikTok token exchange failed (${err.code}): ${err.message}`
        : "TikTok token exchange failed"
    return Response.json({ error: message }, { status: 502 })
  }

  // Best-effort: store a display name for the UI; never block connect on this.
  let username: string | null = null
  try {
    const ttUser = await getUserInfo(tokens.access_token)
    username = ttUser.display_name ?? null
  } catch {
    // keep username null and continue
  }

  const { error: dbError } = await supabase.from("tiktok_accounts").upsert(
    {
      user_id: userId,
      tt_open_id: tokens.open_id,
      username,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    },
    { onConflict: "user_id,tt_open_id" },
  )
  if (dbError) {
    return Response.json(
      { error: `Failed to save TikTok account: ${dbError.message}` },
      { status: 500 },
    )
  }

  return Response.redirect(new URL("/dashboard", url.origin), 302)
}
