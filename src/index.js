const { textToSpeech } = require("./elevenLabs");
const { sendMessage, sendImage, sendAudio } = require("./metaAPI");
const { transcribeAudio, chatgptCompletion, generateImageDalle } = require("./openAIServices");
//dotenv
require("dotenv").config();
// Dependencies
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");

// Initialize Express app
const app = express().use(bodyParser.json());

textToSpeech("Hola, esto es una prueba de texto a voz con Eleven Labs");

// Set up webhook endpoint
app.listen(process.env.PORT || 3000, () => console.log("Webhook is listening"));
// Initialize array to keep track of processed audio message IDs
let processedAudioMessages = [];
// Handle POST requests at /webhook endpoint
app.post("/webhook", async (req, res) => {
  let body = req.body;

  console.log(JSON.stringify(req.body, null, 2));

  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      let phoneNumberId = req.body.entry[0].changes[0].value.metadata.phone_number_id;
      let from = req.body.entry[0].changes[0].value.messages[0].from;
      let messageType = req.body.entry[0].changes[0].value.messages[0].type;

      if (messageType === "text") {
        let msgBody = req.body.entry[0].changes[0].value.messages[0].text.body;

        if (msgBody.startsWith("/imagina ")) {
          const extractedText = msgBody.substring("/imagina ".length);
          const images = await generateImageDalle(extractedText);

          for (const image of images) {
            sendImage(phoneNumberId, from, image.url);
          }
        } else {
          const chatgptResponse = await chatgptCompletion(msgBody);
          await sendMessage(phoneNumberId, from, chatgptResponse);
        }
      } else if (messageType === "audio") {
        const audioMessageId = req.body.entry[0].changes[0].value.messages[0].audio.id;

        // Check if the audio message ID has already been processed
        if (!processedAudioMessages.includes(audioMessageId)) {
          // Add the ID to the processed list
          processedAudioMessages.push(audioMessageId);

          await sendMessage(phoneNumberId, from, "Procesando nota de voz. Espera...");
          let transcriptionResponse = "Transcripción de test sin open ai";

          //await transcribeAudio(audioMessageId);

          // this send a message to the user in WhatsApp to let them know that the transcription is being processed
          const transcription =
            '*Transcripción del audio:*\n\n"' +
            transcriptionResponse +
            '"\n\n_Estamos procesando tu mensaje con ChatGPT, tardará unos segundos..._';
          await sendMessage(phoneNumberId, from, transcription);
          const chatgptResponse = await chatgptCompletion(transcriptionResponse);

          // this send the message to the user in WhatsApp in audio format
          console.log("chatgptResponse", chatgptResponse);
          const audioResponseLocal = await textToSpeech("ESTO ES UNA PRUEBA DE ERROR ELEVENLABS");
          //consumir mi endpoint que hostea la ruta del archivo de audio (esta en glitch)

          // await sendAudio(phoneNumberId, from, audioResponseLocal);
          await sendMessage(phoneNumberId, from, "procesado elevenlabs");
        } else {
          console.log("Audio message already processed:", audioMessageId);
        }
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

app.get("/webhook", (req, res) => {
  const challenge = req.query["hub.challenge"];
  const verify_token = req.query["hub.verify_token"];

  console.log("challenge", challenge);
  console.log("verify_token", verify_token);

  if (verify_token === process.env.VERIFY_TOKEN) {
    return res.status(200).send(challenge); // Just the challenge
  }
  return res.status(400).send({ message: "Bad request!" });
});

// This is a endpoint to host the audio files

app.get("/audio/", async (req, res) => {
  const audioResponseLocal = await textToSpeech("ESTO ES UNA PRUEBA DE ERROR ELEVENLABS");
  console.log("audioResponseLocal", audioResponseLocal);
  return res.status(200).send(audioResponseLocal);
});
