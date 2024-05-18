const axios = require("axios").default;

const token =
  "EAANIlSPdWZAgBOyNuk3bbdrc7gaZBxDjdNQdZCSccP5OJ4yWaYPmnMuA2ZAZAIQzwsQ65a0ZB8A2sAr1dociNc17kAZBFVxPpWzr3618ZCXJTrkBPCbvRGz5aehnxPX2InVnBDZAzEb3DMmZAyZBDVp0aDx9VV2PchTyyiK0DZCVyuwx2cKMCCsKtnR7Kz78D2pDTKij";

const getImageUrl = async (mediaId) => {
  try {
    const imageLocked = await axios({
      method: "GET",
      url: `https://graph.facebook.com/v19.0/${mediaId}`,
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log(imageLocked.data);

    const imageUrl = await axios({
      method: "GET",
      url: imageLocked.data.url,
      responseType: "arraybuffer", // Set the response type to arraybuffer to get binary data
      headers: { Authorization: `Bearer ${token}` },
    });

    const base64 = Buffer.from(imageUrl.data, "binary").toString("base64");
    console.log(base64);

    return base64;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const imgUrl = getImageUrl("460950919806455");
