import { Container } from "@cloudflare/containers"

/**
 * Durable Object that hosts the yt-dlp container (Cloudflare Containers).
 * The queue consumer reaches it via getContainer(env.YTDLP, id).downloadVideo(url)
 * and receives the raw mp4 bytes streamed to stdout by yt-dlp (`-o -`).
 */
export class YtDlpContainer extends Container {
  async downloadVideo(
    url: string,
  ): Promise<{ exitCode: number; stdout: ArrayBuffer; stderr: ArrayBuffer }> {
    const c = this.ctx.container
    if (!c || !c.running) {
      await this.start()
    }
    const proc = await this.ctx.container!.exec(
      ["yt-dlp", "-f", "best", "-o", "-", "--no-playlist", "--force-overwrites", url],
      { signal: AbortSignal.timeout(180_000) },
    )
    const output = await proc.output()
    return {
      exitCode: output.exitCode,
      stdout: output.stdout,
      stderr: output.stderr,
    }
  }
}
