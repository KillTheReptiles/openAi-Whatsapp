const axios = require("axios").default;

// Environment Variables
const token = process.env.WHATSAPP_TOKEN;

// Send text message to whatsapp
const sendMessage = async (phoneNumberId, to, text) => {
  try {
    axios({
      method: "POST",
      url: `https://graph.facebook.com/v19.0/${phoneNumberId}/messages?access_token=${token}`,
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

const getImageUrl = async (mediaId) => {
  try {
    const imageLocked = await axios({
      method: "GET",
      url: `https://graph.facebook.com/v19.0/${mediaId}`,
      headers: { Authorization: `Bearer ${token}` },
    });

    const imageUrl = await axios({
      method: "GET",
      url: imageLocked.data.url,
      responseType: "arraybuffer", // this is to get binary data
      headers: { Authorization: `Bearer ${token}` },
    });

    const base64 = Buffer.from(imageUrl.data, "binary").toString("base64");

    return base64;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Send video message to whatsapp
const sendVideo = async (phoneNumberId, to, videoUrl) => {
  try {
    const videoResponseWtp = await axios({
      method: "POST",
      url: `https://graph.facebook.com/v19.0/${phoneNumberId}/messages?access_token=${token}`,
      data: {
        messaging_product: "whatsapp",
        to,
        type: "video",
        video: { link: videoUrl },
      },
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const sendAudio = async (phoneNumberId, to, audioUrl) => {
  try {
    const response = await axios({
      method: "POST",
      url: `https://graph.facebook.com/v19.0/${phoneNumberId}/messages?access_token=${token}`,
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "audio",
        audio: { link: audioUrl },
      },
      headers: { "Content-Type": "application/json" },
    });

    if (response.status === 200) {
      console.log("Audio sent to whatsapp");
      return true;
    } else {
      console.log("Audio not sent to whatsapp");
      return false;
    }
  } catch (error) {
    console.error("sendAudio error", error);
    return false;
  }
};

// Send image message to whatsapp
const sendImage = async (phoneNumberId, to, imageUrl) => {
  try {
    axios({
      method: "POST",
      url: `https://graph.facebook.com/v19.0/${phoneNumberId}/messages?access_token=${token}`,
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

const welcomeMessage = async (phoneNumberId, to) => {
  try {
    axios({
      method: "POST",
      url: `https://graph.facebook.com/v19.0/${phoneNumberId}/messages?access_token=${token}`,
      data: {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name: "hello_world", language: { code: "en_us" } },
      },
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = { sendMessage, sendImage, sendVideo, sendAudio, welcomeMessage, getImageUrl };
