FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    socat \
  && rm -rf /var/lib/apt/lists/*

EXPOSE 9222

CMD ["sh", "-c", "socat TCP-LISTEN:9222,fork,reuseaddr TCP:127.0.0.1:9223 & chromium --headless=new --disable-gpu --disable-dev-shm-usage --no-sandbox --remote-allow-origins=* --remote-debugging-address=127.0.0.1 --remote-debugging-port=9223 --window-size=1280,720 about:blank"]
