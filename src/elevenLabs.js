const axios = require("axios");
const fs = require("fs");
const stream = require("stream");
const util = require("util");
const ffmpeg = require("fluent-ffmpeg");

// Environment Variables
const elevenLabsToken = process.env.ELEVENLABS_TOKEN;

// Convert fs.write into Promise version to handle async/await
const pipeline = util.promisify(stream.pipeline);

const textToSpeech = async (text) => {
  const voiceId = "pNInz6obpgDQGcFmaJgB"; // Replace 'your-voice-id' with the voice ID you want to use
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
      "xi-api-key": elevenLabsToken, // Use your own Eleven Labs API key
    },
    responseType: "stream", // Important to set the response type to stream
  };

  try {
    const response = await axios.post(url, data, config);
    const timestamp = new Date().getTime();
    const elevenLabsAudioRoute = `./temp/voice_audio_${timestamp}.mp3`;
    const audioInOggFormat = `./temp/voice_audio_${timestamp}.ogg`;

    await pipeline(response.data, fs.createWriteStream(elevenLabsAudioRoute));
    console.log(`Audio guardado en: /temp/voice_audio_${timestamp}.mp3`);

    // now convert mp3 to ogg format
    await convertMp3ToOgg(`./temp/voice_audio_${timestamp}.mp3`, `./temp/voice_audio_${timestamp}.ogg`);

    // now delete mp3 file
    fs.unlinkSync(`./temp/voice_audio_${timestamp}.mp3`);

    return audioInOggFormat;
  } catch (error) {
    console.error(error);
  }
};

// Convert mp3 to ogg
function convertMp3ToOgg(source, destination) {
  return new Promise((resolve, reject) => {
    ffmpeg(source).output(destination).on("end", resolve).on("error", reject).run();
  });
}

module.exports = { textToSpeech };
