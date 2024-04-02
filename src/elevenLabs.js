const axios = require("axios");
const fs = require("fs");
const stream = require("stream");
const util = require("util");

// Convert fs.write into Promise version to handle async/await
const pipeline = util.promisify(stream.pipeline);

async function textToSpeech(text, voiceId) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
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
      "xi-api-key": "59c0ffeccb9862e3c079eb85173d2aa2", // Usa la clave de API desde la variable de entorno
    },
    responseType: "stream", // Para recibir los datos como un stream
  };

  try {
    const response = await axios.post(url, data, config);
    const timestamp = new Date().getTime();
    await pipeline(response.data, fs.createWriteStream(`./temp/voice_audio_${timestamp}.mp3`));
    console.log(`Audio guardado en: /temp/voice_audio_${timestamp}.mp3`);
  } catch (error) {
    console.error(error);
  }
}

textToSpeech("Hola, ¿cómo estás?", "pNInz6obpgDQGcFmaJgB"); // Reemplaza 'your-voice-id' con el id de voz que desees
