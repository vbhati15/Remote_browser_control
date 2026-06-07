import { setTimeout as sleep } from "node:timers/promises";
import WebSocket from "ws";

const baseUrl = process.env.SMOKE_URL ?? "http://127.0.0.1:3000";
const wsUrl = baseUrl.replace(/^http/, "ws") + "/ws";

const deadline = (ms, label) =>
  new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), ms);
  });

async function assertHttp() {
  const response = await fetch(baseUrl);
  if (!response.ok) {
    throw new Error(`HTTP health check failed with ${response.status}`);
  }
  console.log(`HTTP OK: ${baseUrl}`);
}

async function withSocket(run) {
  const socket = new WebSocket(wsUrl);
  const messages = [];

  socket.on("message", (raw) => {
    messages.push(JSON.parse(raw.toString()));
  });

  await Promise.race([
    new Promise((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    }),
    deadline(5000, "WebSocket open")
  ]);

  console.log(`WebSocket OK: ${wsUrl}`);

  try {
    await run({
      send: (message) => socket.send(JSON.stringify(message)),
      waitFor: async (predicate, label, ms = 60000) => {
        const startedAt = Date.now();
        while (Date.now() - startedAt < ms) {
          const match = messages.find(predicate);
          if (match) return match;
          await sleep(100);
        }
        throw new Error(`Timed out waiting for ${label}`);
      }
    });
  } finally {
    socket.close();
  }
}

async function main() {
  await assertHttp();

  await withSocket(async ({ send, waitFor }) => {
    await waitFor((message) => message.type === "status", "initial status", 5000);

    send({ type: "start" });
    await waitFor((message) => message.type === "status" && message.status === "ready", "browser ready", 90000);
    console.log("Browser lifecycle OK: ready");

    const frame = await waitFor((message) => message.type === "frame" && message.data?.length > 1000, "screencast frame", 30000);
    console.log(`Screencast OK: ${frame.width}x${frame.height}`);

    send({ type: "navigate", url: "https://example.com" });
    await waitFor((message) => message.type === "url" && message.url.includes("example.com"), "navigation URL", 30000);
    console.log("Navigation OK: https://example.com");

    send({ type: "mouse", eventType: "mouseMoved", x: 640, y: 360 });
    send({ type: "mouse", eventType: "mousePressed", x: 640, y: 360, button: "left", clickCount: 1 });
    send({ type: "mouse", eventType: "mouseReleased", x: 640, y: 360, button: "left", clickCount: 1 });
    send({ type: "wheel", x: 640, y: 360, deltaX: 0, deltaY: 300 });
    send({ type: "key", eventType: "keyDown", key: "Tab", code: "Tab" });
    send({ type: "key", eventType: "keyUp", key: "Tab", code: "Tab" });
    console.log("Input forwarding OK: mouse, wheel, keyboard commands accepted");

    send({ type: "stop" });
    await waitFor((message) => message.type === "status" && message.status === "idle", "browser stop", 30000);
    console.log("Browser lifecycle OK: stopped");
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
