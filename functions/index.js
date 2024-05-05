const functions = require("firebase-functions");
const webhookController = require("./controllers/webhooks");
const userController = require("./controllers/user");
const rechargeAccountController = require("./controllers/rechargeAccount");

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
app.post("/sumAttempts", userController.sumAttempts);
app.post("/getAttempts", userController.getAttempts);

// User Routes
app.get("/getUsers", userController.getUsers);
app.post("/addUser", userController.addUser);
app.post("/deleteUser", userController.deleteUser);

// Recharge Account Routes
app.post("/createCode", rechargeAccountController.createCode);

exports.api = functions.https.onRequest(app);
