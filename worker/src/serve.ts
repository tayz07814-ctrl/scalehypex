import type { WorkerBindings } from "./supabase"

/**
 * Serve an R2 object with HTTP Range support (video seeking).
 * Route: GET /v/{userId}/{ttVideoId}/video.mp4
 *
 * This is the public video endpoint — R2_PUBLIC_BASE points at
 * `https://<worker>.workers.dev/v`, so stored r2_url values are
 * `https://<worker>.workers.dev/v/{userId}/{ttVideoId}/video.mp4`.
 */
export async function serveR2Object(
  env: WorkerBindings,
  key: string,
  request: Request,
): Promise<Response> {
  const rangeHeader = request.headers.get("range") ?? ""
  const m = rangeHeader.match(/^bytes=(\d*)-(\d*)$/)
  let offset = 0
  let length: number | undefined

  if (m && (m[1] !== "" || m[2] !== "")) {
    if (m[1] === "") {
      // suffix range: last N bytes — need total size first
      const head = await env.VIDEOS.get(key, { range: { offset: 0, length: 1 } })
      const total = head?.size ?? 0
      const suffix = parseInt(m[2], 10)
      offset = Math.max(0, total - suffix)
      length = Math.min(suffix, total - offset)
    } else {
      offset = parseInt(m[1], 10)
      if (m[2] !== "") length = parseInt(m[2], 10) - offset + 1
    }
  }

  const opts: { range?: { offset: number; length?: number } } = {}
  if (length !== undefined) opts.range = { offset, length }
  else if (offset > 0) opts.range = { offset }

  const obj = await env.VIDEOS.get(key, opts)
  if (!obj) {
    return json({ error: "not found" }, 404)
  }
  const total = obj.size ?? 0
  if (offset >= total) {
    return new Response(null, {
      status: 416,
      headers: { "content-range": `bytes */${total}` },
    })
  }
  const servedLength = length !== undefined ? Math.min(length, total - offset) : total - offset

  const headers = new Headers({
    "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
    "content-length": String(servedLength),
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=31536000, immutable",
  })
  if (length !== undefined) {
    headers.set("content-range", `bytes ${offset}-${offset + servedLength - 1}/${total}`)
  }
  return new Response(obj.body, {
    status: length !== undefined ? 206 : 200,
    headers,
  })
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}