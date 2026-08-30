/**
 * TikTok Open Platform client (Login Kit web flow).
 *
 * SERVER-ONLY — uses TIKTOK_CLIENT_SECRET, never import from client components.
 * Endpoints per verified research (README "TikTok (VERIFIED)", Aug 2026):
 *   - Authorize:  https://www.tiktok.com/v2/auth/authorize/?client_key=..&response_type=code&scope=..&redirect_uri=..&state=..
 *   - Token:      POST https://open.tiktokapis.com/v2/oauth/token/ (form-encoded)
 *   - User info:  GET  https://open.tiktokapis.com/v2/user/info/?fields=...
 *   - Video list: POST https://open.tiktokapis.com/v2/video/list/ (JSON body)
 *
 * Worker-portable: pure fetch, no Node builtins. The token functions accept an
 * optional `TikTokCredentials`; when omitted they fall back to the
 * TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET env vars (Next.js/Node). Pass it
 * explicitly from environments without process.env (Cloudflare Workers).
 */

const TIKTOK_BASE_URL = "https://open.tiktokapis.com"

export class TikTokApiError extends Error {
  status: number
  code: string
  logId?: string

  constructor(status: number, code: string, message: string, logId?: string) {
    super(message)
    this.name = "TikTokApiError"
    this.status = status
    this.code = code
    this.logId = logId
  }
}

/** TikTok error envelope: { error: { code, message, log_id } } */
interface TikTokErrorEnvelope {
  error?: {
    code?: string
    message?: string
    log_id?: string
  }
}

async function parseTikTokResponse<T>(res: Response): Promise<T> {
  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new TikTokApiError(
      res.status,
      "invalid_response",
      `TikTok API returned a non-JSON response (status ${res.status})`,
    )
  }
  // TikTok returns HTTP 200 even on API errors (e.g. invalid_grant), with the
  // error in the JSON body. Treat that as an error, not a success.
  const envelope = body as TikTokErrorEnvelope
  if (!res.ok || envelope?.error) {
    const err = envelope?.error
    throw new TikTokApiError(
      res.status,
      err?.code ?? "unknown",
      err?.message ?? `TikTok API error (status ${res.status})`,
      err?.log_id,
    )
  }
  return body as T
}

/**
 * Explicit client credentials, for environments without process.env
 * (e.g. Cloudflare Worker `env` bindings).
 */
export interface TikTokCredentials {
  clientKey: string
  clientSecret: string
}

function resolveCredentials(credentials?: TikTokCredentials): TikTokCredentials {
  const clientKey = credentials?.clientKey ?? process.env.TIKTOK_CLIENT_KEY
  const clientSecret = credentials?.clientSecret ?? process.env.TIKTOK_CLIENT_SECRET
  if (!clientKey || !clientSecret) {
    throw new Error(
      "Missing TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET env vars — TikTok OAuth is not configured",
    )
  }
  return { clientKey, clientSecret }
}

export interface TikTokTokenResponse {
  access_token: string
  open_id: string
  refresh_token: string
  expires_in: number
  refresh_expires_in: number
  scope: string
}

async function requestToken(
  params: { code?: string; refreshToken?: string },
  credentials?: TikTokCredentials,
): Promise<TikTokTokenResponse> {
  const { clientKey, clientSecret } = resolveCredentials(credentials)

  const form = new URLSearchParams()
  form.set("client_key", clientKey)
  form.set("client_secret", clientSecret)
  if (params.code) {
    form.set("code", params.code)
    form.set("grant_type", "authorization_code")
  } else if (params.refreshToken) {
    form.set("refresh_token", params.refreshToken)
    form.set("grant_type", "refresh_token")
  } else {
    throw new Error("requestToken: missing code or refreshToken")
  }

  const res = await fetch(`${TIKTOK_BASE_URL}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  })
  return parseTikTokResponse<TikTokTokenResponse>(res)
}

/** Exchange an OAuth authorization code for tokens (Login Kit web flow). */
export function exchangeCodeForTokens(
  code: string,
  credentials?: TikTokCredentials,
): Promise<TikTokTokenResponse> {
  return requestToken({ code }, credentials)
}

/** Refresh an access token using a refresh token. */
export function refreshAccessToken(
  refreshToken: string,
  credentials?: TikTokCredentials,
): Promise<TikTokTokenResponse> {
  return requestToken({ refreshToken }, credentials)
}

export interface TikTokUser {
  open_id: string
  avatar_url?: string
  display_name?: string
  created_at?: number
}

interface TikTokUserInfoResponse {
  data: { user: TikTokUser }
}

/** GET /v2/user/info/ — basic public profile for the token's user. */
export async function getUserInfo(accessToken: string): Promise<TikTokUser> {
  const res = await fetch(
    `${TIKTOK_BASE_URL}/v2/user/info/?fields=open_id,avatar_url,display_name,created_at`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const body = await parseTikTokResponse<TikTokUserInfoResponse>(res)
  return body.data.user
}

export interface TikTokVideo {
  id: string
  create_time: number
  title: string
  video_description?: string
  cover: string
  duration: number
  video_tags?: string[]
  download_count?: number
  share_count?: number
  comment_count?: number
  like_count?: number
  collect_count?: number
  play_count?: number
  is_public?: boolean
}

export interface TikTokVideoList {
  videos: TikTokVideo[]
  cursor: number
  has_more: boolean
}

interface TikTokVideoListResponse {
  data: TikTokVideoList
}

/** POST /v2/video/list/ — newest-first list of the user's public videos. */
export async function listVideos(
  accessToken: string,
  cursor = 0,
  count = 35,
): Promise<TikTokVideoList> {
  const res = await fetch(
    `${TIKTOK_BASE_URL}/v2/video/list/?fields=id,title,video_description,duration,cover_image_url,create_time`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ cursor, count }),
    },
  )
  const body = await parseTikTokResponse<TikTokVideoListResponse>(res)
  return body.data
}
