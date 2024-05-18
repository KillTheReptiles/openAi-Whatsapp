const axios = require("axios");
const { bucket } = require("../database/config");

const pexelsApiKey = process.env.PEXELS_API_KEY || "u0a7L2nyI0lx1JGsJUiJe5AUvXPp2Yaha31WspV9ki7ZOmL4EJLvkIBn";
// console.log("pexelsApiKey", pexelsApiKey);

const searchVideos = async (query) => {
  try {
    const response = await axios({
      method: "GET",
      url: `https://api.pexels.com/videos/search?query=${query}&per_page=10`,
      headers: { Authorization: `${pexelsApiKey}` },
    });
    return response.data.videos;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const searchImages = async (query) => {
  try {
    const response = await axios({
      method: "GET",
      url: `https://api.pexels.com/v1/search?locale=es-ES&per_page=200&query=${query}`,
      headers: { Authorization: `${pexelsApiKey}` },
    });
    return response.data.photos;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const saveVideoInFirebaseStorage = async (videoUrl) => {
  const timestamp = new Date().getTime();
  const response = await axios({
    url: videoUrl,
    responseType: "stream",
  });

  const file = bucket.file(`video_${timestamp}.mp4`);
  const writeStream = file.createWriteStream();

  response.data.pipe(writeStream);

  return new Promise((resolve, reject) => {
    writeStream.on("error", (error) => reject(error));
    writeStream.on("finish", async () => {
      try {
        const signedUrls = await file.getSignedUrl({
          action: "read",
          expires: "03-09-2491",
        });
        resolve(signedUrls[0]);
      } catch (error) {
        reject(error);
      }
    });
  });
};

// const videourl = saveVideoInFirebaseStorage(
//   "https://videos.pexels.com/video-files/3191251/3191251-hd_1366_720_25fps.mp4"
// );
// console.log(videourl);
module.exports = { searchImages, searchVideos, saveVideoInFirebaseStorage };
