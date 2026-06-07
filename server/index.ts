import { createServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";
import { BrowserSession } from "./browserSession";
import type { ClientMessage } from "./types";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const session = new BrowserSession();

async function main() {
  await app.prepare();

  const server = createServer((req, res) => {
    handle(req, res);
  });

  const handleUpgrade = app.getUpgradeHandler();
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/ws")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
      return;
    }

    handleUpgrade(req, socket, head);
  });

  wss.on("connection", (socket) => {
    session.addSocket(socket);

    socket.on("message", async (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as ClientMessage;
        await session.handle(message);
      } catch (error) {
        socket.send(
          JSON.stringify({
            type: "error",
            message: error instanceof Error ? error.message : "Invalid message."
          })
        );
      }
    });

    socket.on("close", () => session.removeSocket(socket));
  });

  server.listen(port, () => {
    console.log(`Remote browser control app ready at http://${hostname}:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
