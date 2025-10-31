const express = require('express');
const path = require('path'); // We need this to build reliable file paths
const app = express();

// Use a port that Render.com will provide, or 3000 for local testing
const port = process.env.PORT || 3000;

// Route for /sender
app.get('/sender', (req, res) => {
  // path.join() creates a correct path to your file
  // __dirname is the directory where this script is running
  res.sendFile(path.join(__dirname, 'sender.html'));
});

// Route for /receiver
app.get('/receiver', (req, res) => {
  res.sendFile(path.join(__dirname, 'receiver.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
