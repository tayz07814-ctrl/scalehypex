# ScaleHypex yt-dlp image for Cloudflare Containers.
# Build and push (GitHub Actions workflow builds this to GHCR automatically on push).
# The Worker starts the container and runs yt-dlp via exec():
#   ["yt-dlp", "-f", "best", "-o", "-", "--no-playlist", "--force-overwrites", <page url>]
# `-o -` streams the raw mp4 to stdout; yt-dlp logs go to stderr.
FROM python:3.12-slim
RUN pip install --no-cache-dir yt-dlp
# Keep-alive entrypoint; work happens through container exec().
ENTRYPOINT ["sh", "-c", "while true; do sleep 3600; done"]
