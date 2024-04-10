const functions = require("firebase-functions");
const webhookController = require("./controllers/webhooks");
const userController = require("./controllers/user");

//dotenv
require("dotenv").config();
// Dependencies
const express = require("express");
const bodyParser = require("body-parser");

// Initialize Express app
const app = express();
app.use(bodyParser.json());

// Meta Routes
app.post("/webhook", webhookController.handleWebhook);
app.get("/webhook", webhookController.verifyWebhook);

// Attempts Routes
app.post("/updateAttempts", userController.updateAttempts);
app.post("/getAttempts", userController.getAttempts);

// User Routes
app.get("/getUsers", userController.getUsers);
app.post("/addUser", userController.addUser);

exports.api = functions.https.onRequest(app);
