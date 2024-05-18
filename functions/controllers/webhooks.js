const { textToSpeech } = require("../services/elevenLabs");
const { welcomeMessage, sendMessage, sendImage, sendAudio, getImageUrl, sendVideo } = require("../services/metaAPI");
const {
  chatgptSummary,
  transcribeAudio,
  chatgptCompletion,
  generateImageDalle,
  visionOpenAI,
} = require("../services/openAIServices");
const { updateDocument, getDocumentsWhere, createDocument } = require("../database/querys");
const { claimCode } = require("./rechargeAccount");

const globalAttempts = require("../config/globalAttempts");
const { chatMemory } = require("../helpers/chatMemory");
const { searchImages, searchVideos, saveVideoInFirebaseStorage } = require("../services/pexels");

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
        user = user[0]; // get the first element of the arra/y (if exists) because the function returns an array

        // detect if is a new user in the watsapp chat and send a welcome message

        if (!user) {
          await welcomeMessage(phoneNumberId, from);
          await createDocument("users", { phoneNumber: from, Attempts: 0 });

          res.sendStatus(200);
          return;
        }

        // if (messageType === "request_welcome") {
        //   await welcomeMessage(phoneNumberId, from);
        //   res.sendStatus(200);
        //   return;
        // }
        if (messageType === "image") {
          if (user.Attempts < globalAttempts.visionOpenAIAttempt) {
            await sendMessage(
              phoneNumberId,
              from,
              "No tienes suficientes EduCoins disponibles para analizar imagenes."
            );
            res.sendStatus(200);
            return;
          }
          const imageMsg = req.body.entry[0].changes[0].value.messages[0].image.caption; // message from the image
          const image = req.body.entry[0].changes[0].value.messages[0].image;
          const imgBase64 = await getImageUrl(image.id);

          const analizedImageResponse = await visionOpenAI(imageMsg, imgBase64);

          await sendMessage(
            phoneNumberId,
            from,
            analizedImageResponse +
              `\n\nTu saldo actual es ${user.Attempts} - ${globalAttempts.visionOpenAIAttempt} EduCoins por analizar imagenes.`
          );

          // substract Attempts
          await updateDocument("users", user.id, { Attempts: user.Attempts - globalAttempts.visionOpenAIAttempt });

          // Save the message in the chat memory
          let historyMessages = await getDocumentsWhere("historyChats", [
            { field: "phoneNumber", operator: "==", value: from },
          ]);

          if (historyMessages.length === 0) {
            historyMessages = null;
          } else {
            historyMessages = historyMessages[0].messages;
          }
          await chatMemory(from, imageMsg, analizedImageResponse);

          res.sendStatus(200);
          return;
        }
        if (messageType === "text") {
          let msgBody = req.body.entry[0].changes[0].value.messages[0].text.body;
          let chatgptResponse = "";

          if (msgBody.startsWith("/code ") || msgBody.startsWith("/Code ") || msgBody.startsWith("/CODE ")) {
            // We need to convert the message to lowercase to avoid case sensitive issues

            const extractedText = msgBody.substring("/code ".length);
            const codeClaimed = await claimCode(extractedText, from);
            if (!codeClaimed) {
              await sendMessage(
                phoneNumberId,
                from,
                `🔑 El código ${extractedText} no es válido o ya ha sido canjeado.`
              );
              res.sendStatus(200);
              return;
            }
            await sendMessage(
              phoneNumberId,
              from,
              `🔑 El código ${extractedText} ha sido canjeado con éxito y te cargó ${codeClaimed.eduCoins} EduCoins. \nTu saldo actual es ${codeClaimed.newEduCoins} EduCoins.`
            );
            res.sendStatus(200);
            return;
          }
          if (msgBody.startsWith("/resume ") || msgBody.startsWith("/Resume ")) {
            if (user.Attempts < globalAttempts.audioAttempt) {
              await sendMessage(
                phoneNumberId,
                from,
                "No tienes suficientes EduCoins disponibles para generar resúmenes."
              );
              res.sendStatus(200);
              return;
            }
            const extractedText = msgBody.substring("/resume ".length);
            chatgptResponse = await chatgptSummary(extractedText);
            await sendMessage(
              phoneNumberId,
              from,
              chatgptResponse +
                `\n\nTu saldo actual es ${user.Attempts} - ${globalAttempts.textSummaryAttempt} EduCoins por resumen.`
            );
            // substract Attempts
            await updateDocument("users", user.id, { Attempts: user.Attempts - globalAttempts.textSummaryAttempt });

            res.sendStatus(200);
            return;
          }

          if (msgBody.startsWith("/qr ") || msgBody.startsWith("/Qr ") || msgBody.startsWith("/QR ")) {
            if (user.Attempts < globalAttempts.qrAttempt) {
              await sendMessage(
                phoneNumberId,
                from,
                "No tienes suficientes EduCoins disponibles para generar códigos QR"
              );
              res.sendStatus(200);
              return;
            }
            const extracted_text = msgBody.substring("/qr ".length);
            await sendImage(
              phoneNumberId,
              from,
              "https://api.qrserver.com/v1/create-qr-code/?data=" + extracted_text + "&size=1024x1024.jpg"
            );
            await sendMessage(
              phoneNumberId,
              from,
              `La generación del código QR ha sido exitosa. \nTu saldo actual es  ${user.Attempts} - ${globalAttempts.qrAttempt} EduCoins.`
            );
            // substract Attempts from user
            await updateDocument("users", user.id, { Attempts: user.Attempts - globalAttempts.qrAttempt });

            res.sendStatus(200);
            return;
          }
          if (msgBody.startsWith("/create ") || msgBody.startsWith("/Create ")) {
            if (user.Attempts < globalAttempts.imageAttempt) {
              await sendMessage(
                phoneNumberId,
                from,
                "No tienes suficientes EduCoins disponibles para generar imágenes"
              );
              res.sendStatus(200);
              return;
            }
            // We need to convert the message to lowercase to avoid case sensitive issues
            msgBody = msgBody.toLowerCase();

            const extractedText = msgBody.substring("/create ".length);
            await sendMessage(
              phoneNumberId,
              from,
              `🎨 La creatividad no entiende de prisas \n🖌️ ¡Gracias por tu paciencia!. \nTu saldo actual es ${user.Attempts} - ${globalAttempts.imageAttempt} EduCoins por imagen.`
            );
            const images = await generateImageDalle(extractedText);

            for (const image of images) {
              sendImage(phoneNumberId, from, image.url);
            }
            if (images.length === 0) {
              await sendMessage(
                phoneNumberId,
                from,
                `No se ha podido generar la imagen, no se te descontaran EduCoins.`
              );
              res.sendStatus(200);
              return;
            }
            // substract Attempts
            await updateDocument("users", user.id, { Attempts: user.Attempts - globalAttempts.imageAttempt });
            res.sendStatus(200);
            return;
          }
          if (msgBody.startsWith("/search ") || msgBody.startsWith("/Search ") || msgBody.startsWith("/SEARCH ")) {
            if (user.Attempts < globalAttempts.searchAttempt) {
              await sendMessage(
                phoneNumberId,
                from,
                "No tienes suficientes EduCoins disponibles para generar una búsqueda."
              );
              res.sendStatus(200);
              return;
            }
            msgBody = msgBody.toLowerCase();

            const extractedText = msgBody.substring("/search ".length);

            const videos = await searchVideos(extractedText);
            const images = await searchImages(extractedText);

            const randomIndexImg = Math.floor(Math.random() * images.length);
            const randomImage = images[randomIndexImg];

            const image = randomImage.src.original;

            if (videos.length === 0) {
              // send the image to the user if no videos are available
              await sendImage(phoneNumberId, from, image);

              // substract Attempts from user
              await updateDocument("users", user.id, { Attempts: user.Attempts - globalAttempts.searchAttempt });

              await sendMessage(
                phoneNumberId,
                from,
                `Se te han descontado ${globalAttempts.searchAttempt} EduCoins por la búsqueda`
              );
              res.sendStatus(200);
              return;
            }

            const randomIndex = Math.floor(Math.random() * videos.length);
            const randomVideo = videos[randomIndex];

            const videoUrl = await saveVideoInFirebaseStorage(randomVideo.video_files[0].link);

            // Send the video and image to the user if both are available
            await sendVideo(phoneNumberId, from, videoUrl);
            await sendImage(phoneNumberId, from, image);

            // substract Attempts from user
            await updateDocument("users", user.id, { Attempts: user.Attempts - globalAttempts.searchAttempt });

            await sendMessage(
              phoneNumberId,
              from,
              `Se te han descontado ${globalAttempts.searchAttempt} EduCoins por la búsqueda`
            );

            res.sendStatus(200);
            return;
          } else {
            if (user.Attempts < globalAttempts.textAttempt) {
              await sendMessage(phoneNumberId, from, "No tienes más EduCoins disponibles para generar texto.");
              res.sendStatus(200);
              return;
            }

            let historyMessages = await getDocumentsWhere("historyChats", [
              { field: "phoneNumber", operator: "==", value: from },
            ]);
            if (historyMessages.length === 0) {
              historyMessages = null;
            } else {
              historyMessages = historyMessages[0].messages;
            }

            chatgptResponse = await chatgptCompletion(msgBody, historyMessages);
            await sendMessage(
              phoneNumberId,
              from,
              chatgptResponse +
                `\n\nTu saldo actual es ${user.Attempts} - ${globalAttempts.textAttempt} EduCoins por Texto.`
            );
            await chatMemory(from, msgBody, chatgptResponse);
            // substract Attempts
            await updateDocument("users", user.id, { Attempts: user.Attempts - globalAttempts.textAttempt });
            res.sendStatus(200);
            return;
          }
        } else if (messageType === "audio") {
          if (user.Attempts < globalAttempts.audioAttempt) {
            await sendMessage(phoneNumberId, from, "No tienes suficientes EduCoins disponibles para generar audio");

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

          //load the history of the chat
          let historyMessages = await getDocumentsWhere("historyChats", [
            { field: "phoneNumber", operator: "==", value: from },
          ]);

          if (historyMessages.length === 0) {
            historyMessages = null;
          } else {
            historyMessages = historyMessages[0].messages;
          }
          // function to convert the text to audio
          chatgptResponse = await chatgptCompletion(transcriptionResponse, historyMessages);

          const waitMesagges = [
            "Estamos procesando tu audio",
            "Estoy escuchando con atención",
            "Tu paciencia es Música para mis oídos",
          ];

          const randomIndexMsg = Math.floor(Math.random() * waitMesagges.length);
          const randomMessage = waitMesagges[randomIndexMsg];

          // this send a message to the user in WhatsApp to let them know that the transcription is being processed
          const transcription = `*Transcripción del audio:* \n\n${transcriptionResponse} \n\n_🎧 Estamos procesando tu audio_ \n_🎤 ${randomMessage}_ \nLa respuesta es:\n${chatgptResponse} \n_Tu saldo actual es ${user.Attempts}-${globalAttempts.audioAttempt} EduCoins por Audio._`;
          await sendMessage(phoneNumberId, from, transcription);

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

          // Save the message in the chat memory
          await chatMemory(from, transcriptionResponse, chatgptResponse);

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
