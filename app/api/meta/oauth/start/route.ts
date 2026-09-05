import { cookies } from "next/headers"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const META_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_comments",
  "business_management",
].join(",")
const STATE_COOKIE = "meta_oauth_state"
const STATE_MAX_AGE_SECONDS = 10 * 60

/**
 * GET /api/meta/oauth/start
 * Requires a logged-in Supabase user. Stores a one-time `state` in an httpOnly
 * cookie and 302-redirects to Meta's OAuth dialog.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return Response.json({ error: "Not signed in" }, { status: 401 })
  }

  const appId = process.env.META_APP_ID
  const redirectUri = process.env.META_REDIRECT_URI
  const apiVersion = process.env.GRAPH_API_VERSION ?? "v24.0"
  if (!appId || !redirectUri) {
    return Response.json(
      { error: "Meta OAuth is not configured (missing META_APP_ID or META_REDIRECT_URI)" },
      { status: 500 },
    )
  }

  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  const now = Math.floor(Date.now() / 1000)
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STATE_MAX_AGE_SECONDS,
    expires: new Date((now + STATE_MAX_AGE_SECONDS) * 1000),
  })

  const authorizeUrl = new URL(`https://www.facebook.com/${apiVersion}/dialog/oauth`)
  authorizeUrl.searchParams.set("client_id", appId)
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("state", state)
  authorizeUrl.searchParams.set("scope", META_SCOPES)
  authorizeUrl.searchParams.set("response_type", "code")

  return Response.redirect(authorizeUrl.toString(), 302)
}
