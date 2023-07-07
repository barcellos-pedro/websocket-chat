import WebSocket, { WebSocketServer } from "ws";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

const server = createServer();
const wsServer = new WebSocketServer({ noServer: true });

const isConnectionOpen = (client) => client.readyState === WebSocket.OPEN;

const sendMessage = (data, socket) => {
  for (const client of wsServer.clients) {
    // send to every other connected WebSocket clients, excluding itself
    if (client !== socket && isConnectionOpen(client)) {
      client.send(data.toString());
    }
  }
};

const broadcast = (data, type, options) => {
  console.log(`[broadcasting] - ${type}`);

  switch (type) {
    case "error":
      sendMessage(data);
      break;
    case "message":
      sendMessage(data, options.socket);
      break;
    case "close":
      sendMessage(data);
      break;
    default:
      throw new Error(`Broadcast type [${type}] not supported`);
  }
};

// Websocket listeners
wsServer.on("connection", (socket, req) => {
  console.log(`Connected clients = ${wsServer.clients.size}`);

  socket.on("close", () => broadcast("Client disconnected", "close"));

  socket.on("error", (error) => {
    broadcast(`${error.name}: ${error.message}`, "error");
  });

  socket.on("message", (data, isBinary) => {
    broadcast(data, "message", { isBinary, socket });
  });
});

// Serve index.html
server.on("request", async (req, res) => {
  res.end(await readFile("index.html"));
});

// Upgrade connection to Websocket
server.on("upgrade", (request, socket, head) => {
  if (request.url !== "/chat") {
    socket.destroy();
    return;
  }

  wsServer.handleUpgrade(request, socket, head, (socket) => {
    wsServer.emit("connection", socket, request);
  });
});

server.listen(8080, () => console.log("running on http://localhost:8080"));
