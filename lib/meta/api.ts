/**
 * Meta (Facebook) Graph API client.
 *
 * SERVER-ONLY — uses META_APP_SECRET, never import from client components.
 * Endpoints:
 *   - User token: GET https://graph.facebook.com/{v}/oauth/access_token (fb_exchange_token grant)
 *   - Pages:      GET https://graph.facebook.com/{v}/me/accounts?fields=id,name,access_token,category
 *   - Instagram:  GET https://graph.facebook.com/{v}/{pageId}/instagram_account?fields=id,username
 *
 * Worker-portable: pure fetch, no Node builtins. The functions accept an
 * optional `MetaCredentials`; when omitted they fall back to the
 * META_APP_ID / META_APP_SECRET / GRAPH_API_VERSION env vars (Next.js/Node).
 * Pass it explicitly from environments without process.env (Cloudflare Workers).
 */

const GRAPH_BASE_URL = "https://graph.facebook.com"

export class MetaApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "MetaApiError"
    this.status = status
    this.code = code
  }
}

/** Meta Graph error envelope: { error: { code, message, type } } */
interface MetaErrorEnvelope {
  error?: {
    code?: number | string
    message?: string
    type?: string
  }
}

async function parseMetaResponse<T>(res: Response): Promise<T> {
  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new MetaApiError(
      res.status,
      "invalid_response",
      `Meta Graph API returned a non-JSON response (status ${res.status})`,
    )
  }
  if (!res.ok) {
    const envelope = body as MetaErrorEnvelope
    const err = envelope.error
    throw new MetaApiError(
      res.status,
      String(err?.code ?? "unknown"),
      err?.message ?? `Meta Graph API error (status ${res.status})`,
    )
  }
  return body as T
}

/**
 * Explicit app credentials, for environments without process.env
 * (e.g. Cloudflare Worker `env` bindings).
 */
export interface MetaCredentials {
  appId: string
  appSecret: string
  apiVersion?: string
}

function resolveCredentials(credentials?: MetaCredentials): MetaCredentials {
  const appId = credentials?.appId ?? process.env.META_APP_ID
  const appSecret = credentials?.appSecret ?? process.env.META_APP_SECRET
  const apiVersion = credentials?.apiVersion ?? process.env.GRAPH_API_VERSION ?? "v24.0"
  if (!appId || !appSecret) {
    throw new Error(
      "Missing META_APP_ID or META_APP_SECRET env vars — Meta OAuth is not configured",
    )
  }
  return { appId, appSecret, apiVersion }
}

export interface MetaUserTokenResponse {
  access_token: string
  expires_in: number
}

/**
 * Step 1: exchange the OAuth authorization code for a short-lived user access
 * token (~1h). Feed the result into exchangeForLongLivedUserToken before
 * calling /me/accounts — page tokens inherit the user token's lifetime.
 */
export async function exchangeCodeForUserToken(
  code: string,
  credentials?: MetaCredentials,
): Promise<MetaUserTokenResponse> {
  const { appId, appSecret, apiVersion } = resolveCredentials(credentials)

  const url = new URL(`${GRAPH_BASE_URL}/${apiVersion}/oauth/access_token`)
  url.searchParams.set("grant_type", "authorization_code")
  url.searchParams.set("fb_exchange_token", code)
  url.searchParams.set("client_id", appId)
  url.searchParams.set("client_secret", appSecret)

  return parseMetaResponse<MetaUserTokenResponse>(await fetch(url.toString()))
}

/**
 * Step 2: exchange a short-lived user token for a long-lived one (~60 days).
 * Pages fetched with this token return non-expiring page access tokens.
 */
export async function exchangeForLongLivedUserToken(
  shortLivedToken: string,
  credentials?: MetaCredentials,
): Promise<MetaUserTokenResponse> {
  const { appId, appSecret, apiVersion } = resolveCredentials(credentials)

  const url = new URL(`${GRAPH_BASE_URL}/${apiVersion}/oauth/access_token`)
  url.searchParams.set("grant_type", "fb_exchange_token")
  url.searchParams.set("fb_exchange_token", shortLivedToken)
  url.searchParams.set("client_id", appId)
  url.searchParams.set("client_secret", appSecret)

  return parseMetaResponse<MetaUserTokenResponse>(await fetch(url.toString()))
}

export interface MetaPage {
  id: string
  name: string
  access_token: string
  category?: string
}

interface MetaPagesResponse {
  data: MetaPage[]
}

/** GET /me/accounts — Facebook Pages the user token can manage. */
export async function getPages(
  userToken: string,
  credentials?: MetaCredentials,
): Promise<MetaPage[]> {
  const { apiVersion } = resolveCredentials(credentials)

  const url = new URL(`${GRAPH_BASE_URL}/${apiVersion}/me/accounts`)
  url.searchParams.set("fields", "id,name,access_token,category")
  url.searchParams.set("limit", "100")

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${userToken}` },
  })
  const body = await parseMetaResponse<MetaPagesResponse>(res)
  return body.data
}

export interface MetaInstagramAccount {
  id: string
  username: string
  profile_picture_url?: string
}

/** GET /{igUserId}?fields=profile_picture_url - IG profile picture via page token. */
export async function getIgProfilePicture(
  igUserId: string,
  pageToken: string,
  credentials?: MetaCredentials,
): Promise<string | null> {
  const { apiVersion } = resolveCredentials(credentials)
  const res = await fetch(
    `${GRAPH_BASE_URL}/${apiVersion}/${igUserId}?fields=profile_picture_url`,
    { headers: { Authorization: `Bearer ${pageToken}` } },
  )
  if (res.status === 400 || res.status === 404) return null
  const body = await parseMetaResponse<{ profile_picture_url?: string }>(res)
  return body.profile_picture_url ?? null
}

interface MetaInstagramAccountResponse {
  id: string
  username: string
}

/**
 * GET /{pageId}/instagram_account — the Instagram Business account linked to
 * the page. Returns null (not throw) when the page has no linked account.
 */
export async function getInstagramAccount(
  pageId: string,
  pageToken: string,
  credentials?: MetaCredentials,
): Promise<MetaInstagramAccount | null> {
  const { apiVersion } = resolveCredentials(credentials)

  const res = await fetch(
    `${GRAPH_BASE_URL}/${apiVersion}/${pageId}/instagram_account?fields=id,username,profile_picture_url`,
    { headers: { Authorization: `Bearer ${pageToken}` } },
  )
  if (res.status === 400 || res.status === 404) {
    return null
  }
  return parseMetaResponse<MetaInstagramAccount>(res)
}

// ---------------------------------------------------------------------------
// Phase 6 — publishing (Instagram Reels + Facebook Page videos).
//
// These use the per-user page token stored in meta_accounts (page_token). No
// app credentials, no process.env — worker-portable like the rest of this
// file. Each takes an optional `apiVersion` (default v24.0) as the LAST param.
// ---------------------------------------------------------------------------

const DEFAULT_API_VERSION = "v24.0"

export interface FbVideoUploadResponse {
  id: string
}

/**
 * POST /{pageId}/videos (url + description) — start an async Facebook page
 * video upload from a remote URL. Returns the video id; poll
 * getFbVideoProcessingStatus until PUBLISHED before creating the feed post.
 */
export async function createFbPageVideoUpload(
  pageId: string,
  pageToken: string,
  videoUrl: string,
  description: string,
  apiVersion?: string,
): Promise<FbVideoUploadResponse> {
  const v = apiVersion ?? DEFAULT_API_VERSION
  const body = new URLSearchParams()
  body.set("url", videoUrl)
  body.set("description", description)
  const res = await fetch(`${GRAPH_BASE_URL}/${v}/${pageId}/videos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pageToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })
  return parseMetaResponse<FbVideoUploadResponse>(res)
}

export interface FbVideoProcessingResponse {
  processing_info?: { status?: string }
}

/** GET /{videoId}?fields=processing_info — status: PUBLISHED|IN_PROCESS|FAILED|CANCELED. */
export async function getFbVideoProcessingStatus(
  videoId: string,
  pageToken: string,
  apiVersion?: string,
): Promise<FbVideoProcessingResponse> {
  const v = apiVersion ?? DEFAULT_API_VERSION
  const url = new URL(`${GRAPH_BASE_URL}/${v}/${videoId}`)
  url.searchParams.set("fields", "processing_info")
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${pageToken}` },
  })
  return parseMetaResponse<FbVideoProcessingResponse>(res)
}

export interface FbPageVideoPostResponse {
  id: string
}

/** POST /{pageId}/videos (video_id) — create the feed post; returns the feed post id. */
export async function createFbPageVideoPost(
  pageId: string,
  pageToken: string,
  videoId: string,
  apiVersion?: string,
): Promise<FbPageVideoPostResponse> {
  const v = apiVersion ?? DEFAULT_API_VERSION
  const body = new URLSearchParams()
  body.set("video_id", videoId)
  const res = await fetch(`${GRAPH_BASE_URL}/${v}/${pageId}/videos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pageToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })
  return parseMetaResponse<FbPageVideoPostResponse>(res)
}

export interface IgReelCreationResponse {
  id: string
}

/** POST /{igUserId}/media (REELS) — start a Reels upload; returns the creation id. */
export async function createIgReel(
  igUserId: string,
  pageToken: string,
  videoUrl: string,
  caption: string,
  apiVersion?: string,
): Promise<IgReelCreationResponse> {
  const v = apiVersion ?? DEFAULT_API_VERSION
  const body = new URLSearchParams()
  body.set("media_type", "REELS")
  body.set("reels_media_url", videoUrl)
  body.set("caption", caption)
  const res = await fetch(`${GRAPH_BASE_URL}/${v}/${igUserId}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pageToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })
  return parseMetaResponse<IgReelCreationResponse>(res)
}

export interface IgMediaStatusResponse {
  status?: string
}

/** GET /{mediaId}?fields=status — status: IN_PROGRESS|FINISHED|ERROR. */
export async function getIgMediaStatus(
  igUserId: string,
  pageToken: string,
  mediaId: string,
  apiVersion?: string,
): Promise<IgMediaStatusResponse> {
  const v = apiVersion ?? DEFAULT_API_VERSION
  const url = new URL(`${GRAPH_BASE_URL}/${v}/${mediaId}`)
  url.searchParams.set("fields", "status")
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${pageToken}` },
  })
  return parseMetaResponse<IgMediaStatusResponse>(res)
}

export interface IgReelPublishResponse {
  status_code?: number
}

/** POST /{igUserId}/media_publish (creation_id) — publish the finished creation. */
export async function publishIgReel(
  igUserId: string,
  pageToken: string,
  mediaId: string,
  apiVersion?: string,
): Promise<IgReelPublishResponse> {
  const v = apiVersion ?? DEFAULT_API_VERSION
  const body = new URLSearchParams()
  body.set("creation_id", mediaId)
  const res = await fetch(`${GRAPH_BASE_URL}/${v}/${igUserId}/media_publish`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pageToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })
  return parseMetaResponse<IgReelPublishResponse>(res)
}

// ---------------------------------------------------------------------------
// Phase 7 — comments (Facebook page posts + Instagram media).
//
// Same worker-portable pattern as Phase 6: pure fetch, form-encoded POSTs,
// per-user page token from meta_accounts, optional `apiVersion` (default
// v24.0) as the LAST param.
// ---------------------------------------------------------------------------

export interface MetaComment {
  id: string
  text: string
  from?: { name?: string }
}

export interface MetaCommentsResponse {
  data: MetaComment[]
}

/** GET /{postId}/comments — comments on a Facebook page post. */
export async function getFbPostComments(
  postId: string,
  pageToken: string,
  apiVersion?: string,
): Promise<MetaCommentsResponse> {
  const v = apiVersion ?? DEFAULT_API_VERSION
  const url = new URL(`${GRAPH_BASE_URL}/${v}/${postId}/comments`)
  url.searchParams.set("fields", "id,text,from")
  url.searchParams.set("limit", "50")
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${pageToken}` },
  })
  return parseMetaResponse<MetaCommentsResponse>(res)
}

export interface MetaCommentReplyResponse {
  id: string
}

/** POST /{commentId}/comments — reply to a Facebook page comment. */
export async function postFbCommentReply(
  commentId: string,
  pageToken: string,
  message: string,
  apiVersion?: string,
): Promise<MetaCommentReplyResponse> {
  const v = apiVersion ?? DEFAULT_API_VERSION
  const body = new URLSearchParams()
  body.set("message", message)
  const res = await fetch(`${GRAPH_BASE_URL}/${v}/${commentId}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pageToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })
  return parseMetaResponse<MetaCommentReplyResponse>(res)
}

/** GET /{mediaId}/comments — comments on an Instagram media item. */
export async function getIgMediaComments(
  igUserId: string,
  pageToken: string,
  mediaId: string,
  apiVersion?: string,
): Promise<MetaCommentsResponse> {
  const v = apiVersion ?? DEFAULT_API_VERSION
  const url = new URL(`${GRAPH_BASE_URL}/${v}/${mediaId}/comments`)
  url.searchParams.set("fields", "id,text,from")
  url.searchParams.set("limit", "50")
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${pageToken}` },
  })
  return parseMetaResponse<MetaCommentsResponse>(res)
}

/** POST /{mediaId}/comments — reply to an Instagram comment. */
export async function postIgComment(
  igUserId: string,
  pageToken: string,
  mediaId: string,
  message: string,
  apiVersion?: string,
): Promise<MetaCommentReplyResponse> {
  const v = apiVersion ?? DEFAULT_API_VERSION
  const body = new URLSearchParams()
  body.set("message", message)
  const res = await fetch(`${GRAPH_BASE_URL}/${v}/${mediaId}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pageToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })
  return parseMetaResponse<MetaCommentReplyResponse>(res)
}

/** POST /{igUserId}/messages — send an Instagram DM (text) to a user. */
export async function sendIgDm(
  igUserId: string,
  pageToken: string,
  recipientIgId: string,
  text: string,
  apiVersion?: string,
): Promise<{ ok: boolean }> {
  const v = apiVersion ?? DEFAULT_API_VERSION
  const body = new URLSearchParams()
  body.set("recipient", JSON.stringify({ id: recipientIgId }))
  body.set("message", JSON.stringify({ text }))
  const res = await fetch(`${GRAPH_BASE_URL}/${v}/${igUserId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pageToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })
  await parseMetaResponse<unknown>(res)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Phase 8 — video metrics (per-published-post analytics).
//
// IG: GET /{mediaId} fields (likes/comments/media_product_type/permalink)
// plus GET /{mediaId}/insights?metric=plays,saved,shares&period=lifetime.
// FB: GET /{videoId}/video_insights?metric=total_video_views,
// total_video_impressions&period=lifetime plus GET /{videoId} fields
// (likes/comments summaries, shares, views).
// Tolerant: 400/404 return partial results with null-like defaults —
// never throws (the collector must survive bad/deleted media).
// ---------------------------------------------------------------------------

export interface IgMediaMetrics {
  like_count?: number
  comments_count?: number
  plays?: number
  saved?: number
  shares?: number
  permalink?: string
  media_product_type?: string
}

interface IgInsightValue {
  value?: number
}

interface IgInsight {
  name?: string
  period?: string
  values?: IgInsightValue[]
}

interface IgMediaFieldsResponse {
  like_count?: number
  comments_count?: number
  media_product_type?: string
  permalink?: string
}

/** Pull one metric value out of a Graph insights { data: [...] } payload. */
function insightValue(
  data: IgInsight[] | undefined,
  name: string,
): number | undefined {
  const found = (data ?? []).find((d) => d.name === name)
  return found?.values?.[0]?.value
}

/**
 * GET /{mediaId} (+ /{mediaId}/insights) — IG Business media performance for
 * a published Reel/post: likes, comments, lifetime plays/saves/shares,
 * permalink. Tolerant: 400/404 → empty-ish result, never throws to caller.
 */
export async function getIgMediaMetrics(
  igUserId: string,
  pageToken: string,
  mediaId: string,
  apiVersion?: string,
): Promise<IgMediaMetrics> {
  const v = apiVersion ?? DEFAULT_API_VERSION
  const result: IgMediaMetrics = {}

  try {
    const url = new URL(`${GRAPH_BASE_URL}/${v}/${mediaId}`)
    url.searchParams.set(
      "fields",
      "like_count,comments_count,media_product_type,media_type,permalink,timestamp",
    )
    url.searchParams.set("metric_type", "plays")
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${pageToken}` },
    })
    if (res.status === 400 || res.status === 404) return result
    const body = await parseMetaResponse<IgMediaFieldsResponse>(res)
    result.like_count = body.like_count
    result.comments_count = body.comments_count
    result.media_product_type = body.media_product_type
    result.permalink = body.permalink
  } catch {
    return result
  }

  try {
    const url = new URL(`${GRAPH_BASE_URL}/${v}/${mediaId}/insights`)
    url.searchParams.set("metric", "plays,saved,shares")
    url.searchParams.set("period", "lifetime")
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${pageToken}` },
    })
    if (res.status === 400 || res.status === 404) return result
    const body = await parseMetaResponse<{ data?: IgInsight[] }>(res)
    result.plays = insightValue(body.data, "plays")
    result.saved = insightValue(body.data, "saved")
    result.shares = insightValue(body.data, "shares")
  } catch {
    // Insights are optional — keep whatever the media fields call returned.
  }
  return result
}

export interface FbVideoMetrics {
  views?: number
  likes?: number
  comments_count?: number
  shares?: number
}

interface FbVideoFieldsResponse {
  views?: number
  likes?: { summary?: { total_count?: number } }
  comments?: { summary?: { total_count?: number } }
  shares?: { count?: number } | number
}

/**
 * GET /{videoId}/video_insights + /{videoId} — Facebook page video
 * performance: total views, likes, comments, shares. Tolerant: 400/404 →
 * partial result, never throws to caller.
 */
export async function getFbVideoMetrics(
  pageId: string,
  pageToken: string,
  videoId: string,
  apiVersion?: string,
): Promise<FbVideoMetrics> {
  const v = apiVersion ?? DEFAULT_API_VERSION
  const result: FbVideoMetrics = {}

  try {
    const url = new URL(`${GRAPH_BASE_URL}/${v}/${videoId}/video_insights`)
    url.searchParams.set("metric", "total_video_views,total_video_impressions")
    url.searchParams.set("period", "lifetime")
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${pageToken}` },
    })
    if (res.status === 400 || res.status === 404) return result
    const body = await parseMetaResponse<{ data?: IgInsight[] }>(res)
    result.views =
      insightValue(body.data, "total_video_views") ??
      insightValue(body.data, "total_video_impressions")
  } catch {
    return result
  }

  try {
    const url = new URL(`${GRAPH_BASE_URL}/${v}/${videoId}`)
    url.searchParams.set(
      "fields",
      "likes.summary(true),comments.summary(true),shares,views",
    )
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${pageToken}` },
    })
    if (res.status === 400 || res.status === 404) return result
    const body = await parseMetaResponse<FbVideoFieldsResponse>(res)
    result.views = body.views ?? result.views
    result.likes = body.likes?.summary?.total_count
    result.comments_count = body.comments?.summary?.total_count
    result.shares =
      typeof body.shares === "number" ? body.shares : body.shares?.count
  } catch {
    // Fields are optional — keep whatever the insights call returned.
  }
  return result
}
