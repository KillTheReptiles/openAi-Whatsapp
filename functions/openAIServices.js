const axios = require("axios").default;
const FormData = require("form-data");

const openaiToken = process.env.OPENAI_TOKEN;
const verifyToken = process.env.VERIFY_TOKEN;
const token = process.env.WHATSAPP_TOKEN;

// Transcribe audio using OpenAI API
const transcribeAudio = async (mediaId) => {
  try {
    const media = await axios({
      method: "GET",
      url: `https://graph.facebook.com/v17.0/${mediaId}?access_token=${token}`,
    });

    const file = await axios({
      method: "GET",
      url: media.data.url,
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const buffer = Buffer.from(file.data);

    let formData = new FormData();
    formData.append("file", buffer, {
      filename: "grabacion.ogg",
      contentType: "audio/ogg",
    });
    formData.append("model", "whisper-1");

    const openaiTranscription = await axios({
      method: "post",
      url: "https://api.openai.com/v1/audio/transcriptions",
      headers: {
        Authorization: `Bearer ${openaiToken}`,
        ...formData.getHeaders(),
      },
      maxBodyLength: Infinity,
      data: formData,
    });

    return openaiTranscription.data.text;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Get completion from ChatGPT
const chatgptCompletion = async (message) => {
  try {
    let openaiData = JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Tu eres un asistente muy útil.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const completion = await axios({
      method: "post",
      maxBodyLength: Infinity,
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiToken}`,
      },
      data: openaiData,
    });

    return completion.data.choices[0].message.content;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Generate image using DALL-E model
const generateImageDalle = async (prompt) => {
  try {
    const dalle = await axios({
      method: "POST",
      url: "https://api.openai.com/v1/images/generations",
      data: {
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "url",
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiToken}`,
      },
    });

    return dalle.data.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = { chatgptCompletion, generateImageDalle, transcribeAudio };
