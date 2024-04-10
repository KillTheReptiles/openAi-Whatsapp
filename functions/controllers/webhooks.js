const { textToSpeech } = require("../elevenLabs");
const { sendMessage, sendImage, sendAudio } = require("../metaAPI");
const { transcribeAudio, chatgptCompletion, generateImageDalle } = require("../openAIServices");
const { updateDocument, getDocumentsWhere } = require("../database/querys");

const authorizedUsers = require("../authorized_numbers.json");

//dotenv
require("dotenv").config();

// Initialize array to keep track of processed audio message IDs
let processedAudioMessages = [];
// Handle POST requests at /webhook endpoint
exports.handleWebhook = async (req, res) => {
  let body = req.body;

  // console.log(JSON.stringify(req.body, null, 2));
  try {
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

        // Check if the user exists
        let user = await getDocumentsWhere("users", [{ field: "phoneNumber", operator: "==", value: from }]);
        console.log("from", from, " ", user);
        user = user[0]; // get the first element of the array (if exists) because the function returns an array

        if (!user) {
          await sendMessage(phoneNumberId, from, "No estás autorizado para usar este servicio");
          return res.sendStatus(200);
        }
        // Podria por ejemplo restar un uso por texto, 5 usos por audio y 10 usos por imagen
        if (messageType === "text") {
          if (user.Attempts < 1) {
            await sendMessage(phoneNumberId, from, "No tienes más intentos disponibles");
            return res.sendStatus(200);
          }
          let msgBody = req.body.entry[0].changes[0].value.messages[0].text.body;

          if (msgBody.startsWith("/imagina ")) {
            if (user.Attempts < 10) {
              await sendMessage(
                phoneNumberId,
                from,
                "No tienes suficientes intentos disponibles para generar imágenes"
              );
              return res.sendStatus(200);
            }
            const extractedText = msgBody.substring("/imagina ".length);
            const images = await generateImageDalle(extractedText);

            for (const image of images) {
              sendImage(phoneNumberId, from, image.url);
            }
            // substract 10 Attempts
            await updateDocument("users", user.id, { Attempts: user.Attempts - 10 }); // TODO: change the 10 to a variable
          } else {
            const chatgptResponse = await chatgptCompletion(msgBody);
            await sendMessage(phoneNumberId, from, chatgptResponse);
            // substract 1 Attempts
            await updateDocument("users", user.id, { Attempts: user.Attempts - 1 }); //TODO: change the 1 to a variable
          }
        } else if (messageType === "audio") {
          if (user.Attempts < 5) {
            await sendMessage(
              phoneNumberId,
              from,
              "No tienes suficientes intentos disponibles para generar respuestas de audio"
            );
            return res.sendStatus(200);
          }
          const audioMessageId = req.body.entry[0].changes[0].value.messages[0].audio.id;

          // Check if the audio message ID has already been processed
          if (!processedAudioMessages.includes(audioMessageId)) {
            // Add the ID to the processed list
            processedAudioMessages.push(audioMessageId);

            await sendMessage(phoneNumberId, from, "Procesando nota de voz. Espera...");
            // let transcriptionResponse = "Transcripción de test sin open ai";

            let transcriptionResponse = await transcribeAudio(audioMessageId);

            // this send a message to the user in WhatsApp to let them know that the transcription is being processed
            const transcription =
              '*Transcripción del audio:*\n\n"' +
              transcriptionResponse +
              '"\n\nEstamos procesando tu mensaje con ChatGPT, tardará unos segundos...';
            await sendMessage(phoneNumberId, from, transcription);
            const chatgptResponse = await chatgptCompletion(transcriptionResponse);

            // this send the message to the user in WhatsApp in audio format
            console.log("chatgptResponse", chatgptResponse);
            const audioResponseLocal = await textToSpeech(chatgptResponse);
            //consumir mi endpoint que hostea la ruta del archivo de audio (esta en glitch)

            console.log("audioResponseLocal", audioResponseLocal);

            // await sendAudio(phoneNumberId, from, audioResponseLocal);
            await sendAudio(phoneNumberId, from, audioResponseLocal);
            // substract 5 Attempts
            await updateDocument("users", user.id, { Attempts: user.Attempts - 5 }); //TODO: change the 5 to a variable
          } else {
            console.log("Audio message already processed:", audioMessageId);
          }
        }
      }
      return res.sendStatus(200).send("Event received");
    } else {
      return res.sendStatus(200).send("No object found in request body");
    }
  } catch (error) {
    console.error(error);
    return res.sendStatus(200);
  }
};

exports.verifyWebhook = (req, res) => {
  const challenge = req.query["hub.challenge"];
  const verify_token = req.query["hub.verify_token"];

  console.log("challenge", challenge);
  console.log("verify_token", verify_token);

  if (verify_token === process.env.VERIFY_TOKEN) {
    return res.status(200).send(challenge); // Just the challenge
  }
  return res.status(400).send({ message: "Bad request!" });
};
