import CDP from "chrome-remote-interface";
import type { Client } from "chrome-remote-interface";
import type { WebSocket } from "ws";
import { buildBrowserImage, removeBrowserContainer, startBrowserContainer } from "./docker";
import type { BrowserStatus, ClientMessage, ServerMessage } from "./types";

type Send = (message: ServerMessage) => void;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class BrowserSession {
  private client: Client | null = null;
  private status: BrowserStatus = "idle";
  private readonly sockets = new Set<WebSocket>();

  addSocket(socket: WebSocket) {
    this.sockets.add(socket);
    this.sendTo(socket, { type: "status", status: this.status });
  }

  removeSocket(socket: WebSocket) {
    this.sockets.delete(socket);
  }

  async handle(message: ClientMessage) {
    if (message.type === "start") {
      await this.start();
      return;
    }

    if (message.type === "stop") {
      await this.stop();
      return;
    }

    if (!this.client) {
      this.broadcast({ type: "error", message: "Browser is not ready yet." });
      return;
    }

    if (message.type === "navigate") {
      await this.navigate(message.url);
    } else if (message.type === "mouse") {
      await this.client.Input.dispatchMouseEvent({
        type: message.eventType,
        x: Math.round(message.x),
        y: Math.round(message.y),
        button: message.button ?? "left",
        clickCount: message.clickCount ?? 1
      });
    } else if (message.type === "wheel") {
      await this.client.Input.dispatchMouseEvent({
        type: "mouseWheel",
        x: Math.round(message.x),
        y: Math.round(message.y),
        deltaX: message.deltaX,
        deltaY: message.deltaY
      });
    } else if (message.type === "key") {
      await this.client.Input.dispatchKeyEvent({
        type: message.eventType,
        key: message.key,
        code: message.code,
        text: message.text
      });
    }
  }

  private async start() {
    if (this.status === "starting" || this.status === "building" || this.status === "connecting") {
      return;
    }

    try {
      await this.stopClientOnly();
      this.setStatus("building", "Building Chromium Docker image...");
      await buildBrowserImage();

      this.setStatus("starting", "Starting Chromium container...");
      await startBrowserContainer();

      this.setStatus("connecting", "Connecting to Chrome DevTools Protocol...");
      this.client = await this.connectWithRetry();
      await this.prepareBrowser(this.client);
      this.setStatus("ready", "Browser is ready.");
    } catch (error) {
      this.setStatus("error", error instanceof Error ? error.message : "Failed to start browser.");
    }
  }

  private async stop() {
    this.setStatus("stopping", "Stopping browser...");
    await this.stopClientOnly();
    await removeBrowserContainer();
    this.setStatus("idle", "Browser stopped.");
  }

  private async stopClientOnly() {
    if (!this.client) return;
    try {
      await this.client.Page.stopScreencast();
      await this.client.close();
    } catch {
      // The browser may already be gone.
    } finally {
      this.client = null;
    }
  }

  private async connectWithRetry() {
    let lastError: unknown;

    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const target = await CDP.New({ host: "127.0.0.1", port: 9222, url: "about:blank" });
        return await CDP({ host: "127.0.0.1", port: 9222, target });
      } catch (error) {
        lastError = error;
        await sleep(500);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Timed out connecting to Chromium.");
  }

  private async prepareBrowser(client: Client) {
    await Promise.all([client.Page.enable(), client.Runtime.enable()]);
    await client.Emulation.setDeviceMetricsOverride({
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
      mobile: false
    });

    client.Page.screencastFrame(async ({ data, metadata, sessionId }) => {
      this.broadcast({
        type: "frame",
        data,
        width: Math.round(metadata.deviceWidth || 1280),
        height: Math.round(metadata.deviceHeight || 720)
      });
      await client.Page.screencastFrameAck({ sessionId });
    });

    client.Page.frameNavigated(({ frame }) => {
      if (frame.url) {
        this.broadcast({ type: "url", url: frame.url });
      }
    });

    await client.Page.startScreencast({
      format: "jpeg",
      quality: 75,
      maxWidth: 1280,
      maxHeight: 720,
      everyNthFrame: 1
    });
  }

  private async navigate(rawUrl: string) {
    const url = normalizeUrl(rawUrl);
    await this.client?.Page.navigate({ url });
    this.broadcast({ type: "url", url });
  }

  private setStatus(status: BrowserStatus, message?: string) {
    this.status = status;
    this.broadcast({ type: "status", status, message });
  }

  private broadcast(message: ServerMessage) {
    for (const socket of this.sockets) {
      this.sendTo(socket, message);
    }
  }

  private sendTo(socket: WebSocket, message: ServerMessage) {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }
}

function normalizeUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "about:blank";
  if (/^(https?:|about:|data:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
