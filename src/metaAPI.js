const axios = require("axios").default;

// Environment Variables
const token = process.env.WHATSAPP_TOKEN;

// Send text message to whatsapp
const sendMessage = async (phoneNumberId, to, text) => {
  try {
    axios({
      method: "POST",
      url: `https://graph.facebook.com/v12.0/${phoneNumberId}/messages?access_token=${token}`,
      data: {
        messaging_product: "whatsapp",
        to,
        text: { body: text },
      },
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// send audio message to whatsapp
const sendAudio = async (phoneNumberId, to, audioUrl) => {
  try {
    axios({
      method: "POST",
      url: `https://graph.facebook.com/v12.0/${phoneNumberId}/messages?access_token=${token}`,
      data: {
        messaging_product: "whatsapp",
        to,
        attachment: {
          type: "audio",
          payload: {
            url: audioUrl,
          },
        },
      },
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Send image message to whatsapp
const sendImage = (phoneNumberId, to, imageUrl) => {
  try {
    axios({
      method: "POST",
      url: `https://graph.facebook.com/v17.0/${phoneNumberId}/messages?access_token=${token}`,
      data: {
        messaging_product: "whatsapp",
        to,
        type: "image",
        image: { link: imageUrl },
      },
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = { sendMessage, sendImage, sendAudio };
