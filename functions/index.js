const functions = require("firebase-functions");
const webhookController = require("./controllers/webhooks");
const userController = require("./controllers/user");
const rechargeAccountController = require("./controllers/rechargeAccount");
const { isLogged } = require("./middlewares/isLogged");

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
app.post("/sumAttempts", isLogged, userController.sumAttempts);
app.post("/getAttempts", isLogged, userController.getAttempts);

// User Routes
app.get("/getUsers", isLogged, userController.getUsers);
app.post("/addUser", isLogged, userController.addUser);
app.post("/deleteUser", isLogged, userController.deleteUser);

// Recharge Account Routes
app.get("/getCodes", isLogged, rechargeAccountController.getCodes);
app.post("/createCode", isLogged, rechargeAccountController.createCode);
app.post("/deleteCode", isLogged, rechargeAccountController.deleteCode);

exports.apiDev = functions.https.onRequest(app);
