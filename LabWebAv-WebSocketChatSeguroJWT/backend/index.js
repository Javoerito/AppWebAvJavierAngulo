const WebSocket = require('ws');
const https = require('https');
const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const url = require('url');

const app = express();

// Create a secret to be used for signing the JWTs.
const jwtSecret = "example-secret";

// Create an array with user login credentials and information.
// Typically, you would store this information in a database,
// and the passwords would be stored encrypted.
const userCredentials = [
    {
        "username": "javier.angulo",
        "password": "12345678",
        "userId": 1,
        "userInfo": "Soy Javier A."
    },
    {
        "username": "samara.salazar",
        "password": "12345678",
        "userId": 2,
        "userInfo": "Soy Samara S."
    },
    {
        "username": "userC",
        "password": "passwordC",
        "userId": 3,
        "userInfo": "I am userC."
    }
];

// SSL credentials
const server = https.createServer({
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('key.pem')
}, app);

// Define the WebSocket server. Here, the server mounts to the `/ws`
// route of the Express JS server.
//const wss = new WebSocket.Server({ server });
const wss = new WebSocket.Server({ server: server, path: '/ws' });

// Create an empty list that can be used to store WebSocket clients.

var wsClients = [];
// Handle the WebSocket `connection` event. This checks the request URL
// for a JWT. If the JWT can be verified, the client's connection is added;
// otherwise, the connection is closed.
wss.on('connection', (ws, req) => {
    console.log("Client connected")
    var token = url.parse(req.url, true).query.token;

    var wsUsername = "";

    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            ws.close();
        } else {
            wsClients[token] = ws;
            wsUsername = decoded.username;
          console.log('Client name connected: ' + wsUsername);  
        }
    });

    // Handle the WebSocket `message` event. If any of the clients has a token
    // that is no longer valid, send an error message and close the client's
    // connection.
    ws.on('message', (data) => {
        for (const [token, client] of Object.entries(wsClients)) {
            jwt.verify(token, jwtSecret, (err, decoded) => {
                if (err) {
                    client.send("Error: Your token is no longer valid. Please reauthenticate.");
                    client.close();
                } else {
                    client.send(wsUsername + ": " + data);
                }
            });
        }
    });
});

app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Create an endpoint for authentication.
app.get('/auth', (req, res) => {
  res.send(fetchUserToken(req));
});

// Check request credentials, and create a JWT if there is a match.
const fetchUserToken = (req) => {
  for (i=0; i<userCredentials.length; i++) {
      if (userCredentials[i].username == req.query.username
          && userCredentials[i].password == req.query.password) {
          return jwt.sign(
              {
                  "sub": userCredentials[i].userId,
                  "username": req.query.username
              },
              jwtSecret,
              { expiresIn: 900 } // Expire the token after 15 minutes.
          );
      }
  }

  return "Error: No matching user credentials found.";
}

// Fetch the user information matching the user ID in the request.
const fetchUserInfo = (userId) => {
  for (i=0; i<userCredentials.length; i++) {
      if (userCredentials[i].userId == userId) {
          return userCredentials[i].userInfo;
      }
  }

  return "Error: Unable to fulfill the request.";
}

// Add an endpoint for user information requests. The endpoint first
// verifies the JWT. If it is valid, it makes the call to fetch the
// user's information.
app.get('/userInfo', (req, res) => {
  jwt.verify(req.query.token, jwtSecret, (err, decodedToken) => {
      if (err) {
          res.send(err);
      } else {
          res.send(fetchUserInfo(decodedToken.sub));
      }
  });
});

server.listen(5000, () => {
  console.log('WebSocket Server running on https://localhost:5000');
});

