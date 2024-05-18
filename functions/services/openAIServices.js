const axios = require("axios").default;
const FormData = require("form-data");

const openaiToken = process.env.OPENAI_TOKEN;
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
    throw new Error(error);
  }
};

// Get completion from ChatGPT
const chatgptCompletion = async (message, historyMessages) => {
  const dateNow = new Date();

  try {
    let openaiData = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Today is ${dateNow} UTC. You are Edu Buddy, the Pro Version of Edu Compa, a chatbot with AI that can understand texts, listen to audios and create images, characterized by being intelligent, pleasant and concise when responding. You were created in Chile by Edu Global, but currently you have become an international project.`,
        },
      ],
    };

    if (historyMessages && historyMessages.length > 0) {
      openaiData.messages.push(
        ...historyMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
      );
    }

    openaiData.messages.push({
      role: "user",
      content: message,
    });

    const completion = await axios({
      method: "post",
      maxBodyLength: Infinity,
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiToken}`,
      },
      data: JSON.stringify(openaiData),
    });

    return completion.data.choices[0].message.content;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};
// Get a summary from ChatGPT
const chatgptSummary = async (message) => {
  try {
    let openaiData = JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Please make a summary of the following text:",
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
    throw new Error(error);
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
        model: "dall-e-3",
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
    throw new Error(error);
  }
};

// Get completion from ChatGPT
const visionOpenAI = async (prompt, base64_image) => {
  try {
    if (!prompt) {
      prompt = "¿Qué hay en esta imagén?";
    }
    let openaiData = {
      model: "gpt-4-turbo",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64_image}`,
              },
            },
          ],
        },
      ],
    };

    const completion = await axios({
      method: "post",
      maxBodyLength: Infinity,
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiToken}`,
      },
      data: JSON.stringify(openaiData),
    });

    return completion.data.choices[0].message.content;
  } catch (error) {
    console.error(error);
    throw new Error(error);
  }
};

module.exports = { chatgptSummary, chatgptCompletion, generateImageDalle, transcribeAudio, visionOpenAI };
