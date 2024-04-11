const { textToSpeech } = require("../elevenLabs");
const { sendMessage, sendImage, sendAudio } = require("../metaAPI");
const { transcribeAudio, chatgptCompletion, generateImageDalle } = require("../openAIServices");
const { updateDocument, getDocumentsWhere } = require("../database/querys");
const { ref, deleteObject } = require("firebase-admin");
const { bucket } = require("../database/config");

const globalAttempts = require("../config/globalAttempts");

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
        user = user[0]; // get the first element of the array (if exists) because the function returns an array

        if (!user) {
          await sendMessage(phoneNumberId, from, "No estás autorizado para usar este servicio");
          res.sendStatus(200);
          return;
        }

        if (messageType === "text") {
          if (user.Attempts < globalAttempts.textAttempt) {
            await sendMessage(phoneNumberId, from, "No tienes más EduCoins disponibles");
            res.sendStatus(200);
            return;
          }
          let msgBody = req.body.entry[0].changes[0].value.messages[0].text.body;

          if (msgBody.startsWith("/imagina ")) {
            if (user.Attempts < globalAttempts.imageAttempt) {
              await sendMessage(
                phoneNumberId,
                from,
                "No tienes suficientes EduCoins disponibles para generar imágenes"
              );
              res.sendStatus(200);
              return;
            }

            const extractedText = msgBody.substring("/imagina ".length);
            await sendMessage(
              phoneNumberId,
              from,
              `🎨 La creatividad no entiende de prisas \n🖌️ ¡Gracias por tu paciencia!. \nTu saldo actual es ${user.Attempts}-${globalAttempts.imageAttempt} EduCoins por imagen.`
            );
            const images = await generateImageDalle(extractedText);

            for (const image of images) {
              sendImage(phoneNumberId, from, image.url);
            }
            // substract Attempts
            await updateDocument("users", user.id, { Attempts: user.Attempts - globalAttempts.imageAttempt });
            res.sendStatus(200);
            return;
          } else {
            const chatgptResponse = await chatgptCompletion(msgBody);
            await sendMessage(
              phoneNumberId,
              from,
              chatgptResponse +
                `\n\nTu saldo actual es ${user.Attempts}-${globalAttempts.textAttempt} EduCoins por Texto.`
            );
            // substract Attempts
            await updateDocument("users", user.id, { Attempts: user.Attempts - globalAttempts.textAttempt });
            res.sendStatus(200);
            return;
          }
        } else if (messageType === "audio") {
          if (user.Attempts < globalAttempts.audioAttempt) {
            await sendMessage(
              phoneNumberId,
              from,
              "No tienes suficientes EduCoins disponibles para generar respuestas de audio"
            );
            res.sendStatus(200);
            return;
          }
          const audioMessageId = req.body.entry[0].changes[0].value.messages[0].audio.id;

          // Check if the audio message ID has already been processed
          if (processedAudioMessages.includes(audioMessageId)) {
            res.sendStatus(200);
            return;
          }

          // Add the ID to the processed list
          processedAudioMessages.push(audioMessageId);

          let transcriptionResponse = await transcribeAudio(audioMessageId);

          // this send a message to the user in WhatsApp to let them know that the transcription is being processed
          const transcription = `Transcripción del audio: \n${transcriptionResponse} \n\n🎧 Estamos procesando tu audio \n🎤 Tu paciencia es música para mis oídos \nTu saldo actual es ${user.Attempts}-${globalAttempts.audioAttempt} EduCoins por Audio.`;
          await sendMessage(phoneNumberId, from, transcription);

          // function to convert the text to audio
          const chatgptResponse = await chatgptCompletion(transcriptionResponse);
          console.log("chatgptResponse", chatgptResponse);

          const audioResponsePromise = new Promise((resolve, reject) => {
            textToSpeech(chatgptResponse)
              .then((audioResponseLocal) => {
                resolve(audioResponseLocal);
              })
              .catch((error) => {
                reject(error);
              });
          });

          audioResponsePromise
            .then(async (audioResponseLocal) => {
              const isAudioSent = await sendAudio(phoneNumberId, from, audioResponseLocal.urlPromise);
              if (isAudioSent) {
                console.log("Audio enviado correctamente");
                // substract Attempts
                await updateDocument("users", user.id, { Attempts: user.Attempts - globalAttempts.audioAttempt });
              } else {
                // Si ha ocurrido un error, no eliminar el archivo
                console.log("El audio no se ha enviado correctamente, no se eliminará el archivo");
                await sendMessage(phoneNumberId, from, chatgptResponse);
                res.sendStatus(200);
                return;
              }
            })
            .catch(async (error) => {
              // Aquí puedes manejar cualquier error que ocurra durante el proceso
              console.error(error);
              // If an error occurs during text to audio conversion, send a text message instead
              await sendMessage(phoneNumberId, from, chatgptResponse);
              console.error("Error occurred while generating audio response:", error);
              res.sendStatus(200);
              return;
            });
          res.sendStatus(200);
          return;
        } else {
          console.log("Audio message already processed:", audioMessageId);
          res.sendStatus(200);
          return;
        }
      }
    }
  } catch (error) {
    console.error(error);
    res.sendStatus(200);
    return;
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
