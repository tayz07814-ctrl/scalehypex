import { cookies } from "next/headers"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  exchangeCodeForUserToken,
  exchangeForLongLivedUserToken,
  getPages,
  getInstagramAccount,
  MetaApiError,
} from "@/lib/meta/api"

export const runtime = "nodejs"

const STATE_COOKIE = "meta_oauth_state"

/**
 * GET /api/meta/oauth/callback
 * Meta redirects back here with ?code=..&state=.. after the user approves.
 * Validates state against the httpOnly cookie set at /start (single-use,
 * deleted immediately), exchanges the code for a user token, upserts one
 * meta_accounts row per page, then redirects to /dashboard?meta=connected
 * (or ?meta=error on failure).
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
        error: "Invalid or missing OAuth state. Start again from the dashboard (Connect Facebook/Instagram).",
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

  const failRedirect = () =>
    Response.redirect(new URL("/dashboard?meta=error", url.origin), 302)

  // Two-step exchange: code → short-lived user token → long-lived user token.
  // Page tokens from /me/accounts inherit this lifetime (non-expiring if long).
  let userToken
  try {
    const shortLived = await exchangeCodeForUserToken(code)
    userToken = await exchangeForLongLivedUserToken(shortLived.access_token)
  } catch (err) {
    if (err instanceof MetaApiError) {
      console.error(`Meta token exchange failed (${err.code}): ${err.message}`)
    } else {
      console.error("Meta token exchange failed", err)
    }
    return failRedirect()
  }

  let pages
  try {
    pages = await getPages(userToken.access_token)
  } catch (err) {
    if (err instanceof MetaApiError) {
      console.error(`Meta pages fetch failed (${err.code}): ${err.message}`)
    } else {
      console.error("Meta pages fetch failed", err)
    }
    return failRedirect()
  }

  for (const page of pages) {
    const { error: dbError } = await supabase
      .from("meta_accounts")
      .upsert(
        {
          user_id: userId,
          fb_page_id: page.id,
          page_name: page.name,
          page_token: page.access_token,
        },
        { onConflict: "user_id,fb_page_id" },
      )
    if (dbError) {
      return failRedirect()
    }

    // Best-effort: link the page's Instagram Business account; never block connect on this.
    try {
      const ig = await getInstagramAccount(page.id, page.access_token)
      if (ig) {
        await supabase
          .from("meta_accounts")
          .update({
          ig_user_id: ig.id,
          ig_username: ig.username,
          ig_picture_url: ig.profile_picture_url ?? null,
        })
          .eq("user_id", userId)
          .eq("fb_page_id", page.id)
      }
    } catch {
      // keep Instagram fields null and continue
    }
  }

  return Response.redirect(new URL("/dashboard?meta=connected", url.origin), 302)
}
