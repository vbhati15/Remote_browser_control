"use client";

import { FormEvent, KeyboardEvent, MouseEvent, WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import type { BrowserStatus, ServerMessage } from "@/server/types";

const viewport = { width: 1280, height: 720 };

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const [status, setStatus] = useState<BrowserStatus>("idle");
  const [message, setMessage] = useState("Ready to start a local Chromium container.");
  const [url, setUrl] = useState("https://example.com");
  const [currentUrl, setCurrentUrl] = useState("about:blank");
  const [recentUrls, setRecentUrls] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [controlSocketUrl, setControlSocketUrl] = useState("");
  const [showRecentUrls, setShowRecentUrls] = useState(false);

  const canControl = status === "ready" && connected;

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;

    const connect = () => {
      if (cancelled) return;
      const url = websocketUrls()[attempt % websocketUrls().length];
      setControlSocketUrl(url);
      attempt += 1;
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        attempt = 0;
        setConnected(true);
        setMessage("Connected to local control server.");
      });

      socket.addEventListener("close", () => {
        if (cancelled) return;
        setConnected(false);
        setMessage("Disconnected from local control server. Retrying...");
        reconnectTimerRef.current = window.setTimeout(connect, 1000);
      });

      socket.addEventListener("error", () => {
        socket.close();
      });

      socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data) as ServerMessage;

        if (data.type === "status") {
          setStatus(data.status);
          if (data.message) setMessage(data.message);
        }

        if (data.type === "error") {
          setStatus("error");
          setMessage(data.message);
        }

        if (data.type === "url") {
          setCurrentUrl(data.url);
          setUrl(data.url);
        }

        if (data.type === "frame") {
          drawFrame(data.data);
        }
      });
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("recentUrls");
    if (stored) {
      try {
        setRecentUrls(JSON.parse(stored));
      } catch {
        // Ignore malformed storage data.
      }
    }
  }, []);

  function saveRecentUrl(nextUrl: string) {
    const trimmed = nextUrl.trim();
    if (!trimmed) return;

    setRecentUrls((urls) => {
      const updated = [trimmed, ...urls.filter((item) => item !== trimmed)].slice(0, 5);
      window.localStorage.setItem("recentUrls", JSON.stringify(updated));
      return updated;
    });
  }

  const statusLabel = useMemo(() => {
    if (!connected) return "Disconnected";
    return status.charAt(0).toUpperCase() + status.slice(1);
  }, [connected, status]);

  function send(payload: unknown) {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }

  function drawFrame(base64: string) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, viewport.width, viewport.height);
      setHasFrame(true);
    };
    image.src = `data:image/jpeg;base64,${base64}`;
  }

  function startBrowser() {
    setHasFrame(false);
    send({ type: "start" });
  }

  function stopBrowser() {
    send({ type: "stop" });
  }

  function refreshBrowser() {
    send({ type: "refresh" });
  }

  function navigate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send({ type: "navigate", url });
    saveRecentUrl(url);
  }

  function revisitUrl(recentUrl: string) {
    setUrl(recentUrl);
    send({ type: "navigate", url: recentUrl });
    saveRecentUrl(recentUrl);
    setShowRecentUrls(false);
  }

  function canvasPoint(event: MouseEvent<HTMLCanvasElement> | WheelEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * viewport.width,
      y: ((event.clientY - rect.top) / rect.height) * viewport.height
    };
  }

  function handleMouseMove(event: MouseEvent<HTMLCanvasElement>) {
    if (!canControl) return;
    const point = canvasPoint(event);
    send({ type: "mouse", eventType: "mouseMoved", ...point });
  }

  function handleMouseDown(event: MouseEvent<HTMLCanvasElement>) {
    if (!canControl) return;
    event.currentTarget.focus();
    const point = canvasPoint(event);
    send({ type: "mouse", eventType: "mousePressed", ...point, button: "left", clickCount: 1 });
  }

  function handleMouseUp(event: MouseEvent<HTMLCanvasElement>) {
    if (!canControl) return;
    const point = canvasPoint(event);
    send({ type: "mouse", eventType: "mouseReleased", ...point, button: "left", clickCount: 1 });
  }

  function handleWheel(event: WheelEvent<HTMLCanvasElement>) {
    if (!canControl) return;
    event.preventDefault();
    const point = canvasPoint(event);
    send({ type: "wheel", ...point, deltaX: event.deltaX, deltaY: event.deltaY });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    if (!canControl) return;
    event.preventDefault();
    const text = event.key.length === 1 ? event.key : undefined;
    send({ type: "key", eventType: "keyDown", key: event.key, code: event.code, text });
  }

  function handleKeyUp(event: KeyboardEvent<HTMLCanvasElement>) {
    if (!canControl) return;
    event.preventDefault();
    send({ type: "key", eventType: "keyUp", key: event.key, code: event.code });
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <h1>Remote Browser Control</h1>
          <p>{connected ? currentUrl : `Control socket: ${controlSocketUrl}`}</p>
        </div>
        <div className={`status status-${status}`}>
          <span />
          {statusLabel}
        </div>
      </section>

      <section className="controls">
        <button onClick={startBrowser} disabled={!connected || status === "building" || status === "starting" || status === "connecting"}>
          Start Browser
        </button>
        <button className="secondary" onClick={stopBrowser} disabled={!connected || status === "idle" || status === "stopping"}>
          Stop
        </button>
        <button className="secondary refreshButton" onClick={refreshBrowser} disabled={!canControl}>
          Refresh
        </button>
        <form onSubmit={navigate}>
          <input value={url} onChange={(event) => setUrl(event.target.value)} aria-label="URL" />
          <button type="submit" disabled={!canControl}>
            Go
          </button>
        </form>
        {recentUrls.length > 0 && (
          <div className="recentUrlsContainer">
            <button
              type="button"
              className="recentUrlsButton"
              onClick={() => setShowRecentUrls(!showRecentUrls)}
            >
              Recent URLs ({recentUrls.length})
            </button>
            {showRecentUrls && (
              <div className="recentUrls">
                {recentUrls.map((recentUrl) => (
                  <button key={recentUrl} type="button" onClick={() => revisitUrl(recentUrl)}>
                    {recentUrl}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="viewportWrap">
        <canvas
          ref={canvasRef}
          width={viewport.width}
          height={viewport.height}
          tabIndex={0}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          className="browserCanvas"
        />
        {!hasFrame && (
          <div className="emptyState">
            <strong>{message}</strong>
            <span>Start the browser, then click the viewport before typing.</span>
          </div>
        )}
      </section>
    </main>
  );
}

function websocketUrls() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const port = window.location.port || "3000";
  const urls = [
    `${protocol}://${window.location.host}/ws`,
    `ws://localhost:${port}/ws`,
    `ws://127.0.0.1:${port}/ws`
  ];

  return [...new Set(urls)];
}
