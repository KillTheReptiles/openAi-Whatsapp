const axios = require("axios");
const fs = require("fs");
const stream = require("stream");
const util = require("util");
const ffmpeg = require("fluent-ffmpeg");
const { bucket } = require("./database/storage");
require("dotenv").config();

// Environment Variables
const elevenLabsToken = process.env.ELEVENLABS_TOKEN;

console.log("TOKEN DE ELEVEN:", elevenLabsToken);

// Convert fs.write into Promise version to handle async/await
const pipeline = util.promisify(stream.pipeline);

const textToSpeech = async (text) => {
  try {
    const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Reemplaza 'tu-voice-id' con el ID de voz que desees usar
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
    const data = {
      text: text,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
      },
    };
    const config = {
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": "22dc46cb2aad6535bd8e0cf212e27d90", // Usa tu propia clave de API de Eleven Labs
      },
      responseType: "stream", // Es importante configurar el tipo de respuesta como stream
    };

    // Realiza la solicitud para obtener el audio
    const response = await axios.post(url, data, config);

    // Genera un nombre único para el archivo de audio
    const timestamp = new Date().getTime();
    const audioFilePath = `./temp/voice_audio_${timestamp}.mp3`;
    const oggFilePath = `./temp/voice_audio_${timestamp}.ogg`;

    // Guarda el audio en formato mp3
    await pipeline(response.data, fs.createWriteStream(audioFilePath));
    console.log(`Audio guardado en: ${audioFilePath}`);

    // Convierte el audio de mp3 a ogg
    await convertMp3ToOgg(audioFilePath, oggFilePath);

    // Elimina el archivo mp3
    fs.unlinkSync(audioFilePath);

    // // Lee el archivo de audio en formato ogg
    const audioData = fs.readFileSync(oggFilePath);

    // Sube el archivo de audio a Firebase Storage
    console.log("Subiendo archivo de audio a Firebase Storage...");
    const fileName = `voice_audio_${timestamp}.ogg`;
    const fileUpload = bucket.file(fileName);
    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: "audio/ogg",
      },
    });

    await new Promise((resolve, reject) => {
      stream.on("error", (err) => {
        console.error("Error al cargar el archivo en Firebase Storage:", err);
        reject(err);
      });

      stream.on("finish", async () => {
        console.log("Archivo de audio cargado en Firebase Storage con éxito.");
        // Obtiene la URL del archivo cargado
        const [url] = await fileUpload.getSignedUrl({ action: "read", expires: "01-01-2900" });
        console.log("URL del archivo de audio:", url);
        resolve(url);
      });

      stream.end(audioData);
    });

    // Elimina el archivo ogg temporal
    // fs.unlinkSync(oggFilePath);
  } catch (error) {
    console.error("Error en la función textToSpeech:", error);
    // throw error; // Lanza el error para que pueda ser manejado adecuadamente por el llamador
  }
};

// Convert mp3 to ogg
function convertMp3ToOgg(source, destination) {
  return new Promise((resolve, reject) => {
    ffmpeg(source).audioCodec("opus").output(destination).on("end", resolve).on("error", reject).run();
  });
}

module.exports = { textToSpeech };
