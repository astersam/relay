const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const url = require('url');

const app = express();
const server = http.createServer(app);

// Use 'noServer: true' to manually handle the upgrade process
// This lets us inspect the request (e.g., the URL) before upgrading.
const wss = new WebSocketServer({ noServer: true });

// This Map will store our rooms.
// The key will be the 'roomId' (your "unique key").
// The value will be a Set of all connected WebSocket clients in that room.
const rooms = new Map();

// A simple health check route for Render
app.get('/', (req, res) => {
  res.send('WebSocket Relay Server is running.');
});

// Handle the HTTP 'upgrade' event to WebSockets
server.on('upgrade', (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;

  // Use a regex to match '/ws/ANYTHING'
  // and capture 'ANYTHING' as the roomId.
  const roomMatch = pathname.match(/^\/ws\/([a-zA-Z0-9_-]+)$/);

  if (!roomMatch) {
    // If the URL doesn't match our pattern, reject the connection.
    console.log(`[Reject] Invalid connection URL: ${pathname}`);
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }

  const roomId = roomMatch[1];

  // Complete the WebSocket handshake
  wss.handleUpgrade(request, socket, head, (ws) => {
    // Add this new client (ws) to the correct room.
    
    // 1. Get the room (or create it if it's the first client)
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    const room = rooms.get(roomId);

    // 2. Add the new client to the room
    room.add(ws);
    console.log(`[Connect] Client joined room: ${roomId}. Total clients: ${room.size}`);

    // --- This is the "Dumb Relay" Logic ---
    ws.on('message', (message, isBinary) => {
      // 'message' is raw data (Buffer or string). We don't parse it.
      console.log(`[Message] Received in room ${roomId}. Relaying to ${room.size - 1} other clients.`);

      // Iterate over all clients in the *same room*
      for (const client of room) {
        // Send the message to everyone *except* the original sender
        if (client !== ws && client.readyState === client.OPEN) {
          // Forward the raw message, preserving its type (binary or text)
          client.send(message, { binary: isBinary });
        }
      }
    });

    // --- Cleanup Logic ---
    ws.on('close', () => {
      // Remove the client from the room
      room.delete(ws);
      console.log(`[Disconnect] Client left room: ${roomId}. Total clients: ${room.size}`);

      // If the room is now empty, delete the room itself to save memory
      if (room.size === 0) {
        rooms.delete(roomId);
        console.log(`[Cleanup] Room ${roomId} is now empty and has been removed.`);
      }
    });

    ws.on('error', (error) => {
      console.error(`[Error] WebSocket error in room ${roomId}:`, error);
    });
  });
});

// Start the server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
