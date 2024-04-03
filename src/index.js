const { textToSpeech } = require("./elevenLabs");
const { sendMessage, sendImage, sendAudio } = require("./metaAPI");
const { transcribeAudio, chatgptCompletion, generateImageDalle } = require("./openAIServices");

// Dependencies
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");

// Initialize Express app
const app = express().use(bodyParser.json());

// Set up webhook endpoint
app.listen(process.env.PORT || 1337, () => console.log("Webhook is listening render.com"));
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
          let transcriptionResponse = await transcribeAudio(audioMessageId);

          // this send a message to the user in WhatsApp to let them know that the transcription is being processed
          const transcription =
            '*Transcripción del audio:*\n\n"' +
            transcriptionResponse +
            '"\n\n_Estamos procesando tu mensaje con ChatGPT, tardará unos segundos..._';
          await sendMessage(phoneNumberId, from, transcription);
          const chatgptResponse = await chatgptCompletion(transcriptionResponse);

          // this send the message to the user in WhatsApp in audio format

          const audioResponseLocal = await textToSpeech(chatgptResponse);

          //consumir mi endpoint que hostea la ruta del archivo de audio (esta en glitch)

          await sendAudio(phoneNumberId, from, audioResponse);
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

// This is a endpoint to host the audio files

app.get("/audio/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "temp", filename);
  const stat = fs.statSync(filePath);

  res.writeHead(200, {
    "Content-Type": "audio/ogg",
    "Content-Length": stat.size,
  });

  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
});
