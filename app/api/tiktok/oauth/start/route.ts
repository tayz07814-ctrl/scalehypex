import { cookies } from "next/headers"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const TIKTOK_AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/"
const TIKTOK_SCOPES = "user.info.basic,video.list"
const STATE_COOKIE = "tt_oauth_state"
const STATE_MAX_AGE_SECONDS = 10 * 60

/**
 * GET /api/tiktok/oauth/start
 * Requires a logged-in Supabase user. Stores a one-time `state` in an httpOnly
 * cookie and 302-redirects to TikTok's Login Kit authorize endpoint.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return Response.json({ error: "Not signed in" }, { status: 401 })
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const redirectUri = process.env.TIKTOK_REDIRECT_URI
  if (!clientKey || !redirectUri) {
    return Response.json(
      { error: "TikTok OAuth is not configured (missing TIKTOK_CLIENT_KEY or TIKTOK_REDIRECT_URI)" },
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

  // URLSearchParams encodes the scopes as application/x-www-form-urlencoded.
  // TikTok requires scopes as a comma-separated string (per Login Kit Web docs).
  const authorizeUrl = new URL(TIKTOK_AUTHORIZE_URL)
  authorizeUrl.searchParams.set("client_key", clientKey)
  authorizeUrl.searchParams.set("response_type", "code")
  authorizeUrl.searchParams.set("scope", TIKTOK_SCOPES)
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("state", state)

  return Response.redirect(authorizeUrl.toString(), 302)
}
