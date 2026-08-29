# ScaleHypex yt-dlp image for Cloudflare Containers.
# Build and push, then set the image in worker/wrangler.jsonc (containers[0].image):
#   docker build -t <registry>/scalehypex-ytdlp:latest .
#   docker push <registry>/scalehypex-ytdlp:latest
# Worker invokes it as: yt-dlp -f best -o - --no-playlist --force-overwrites <url>
# (`-o -` streams the raw mp4 to stdout; yt-dlp logs go to stderr)
FROM python:3.12-slim
RUN pip install --no-cache-dir yt-dlp
ENTRYPOINT ["yt-dlp"]
