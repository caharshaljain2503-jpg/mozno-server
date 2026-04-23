import ImageKit from "imagekit";
import { config } from "dotenv";

config();

const hasImageKitConfig =
  !!process.env.IMAGEKIT_PUBLIC_KEY &&
  !!process.env.IMAGEKIT_PRIVATE_KEY &&
  !!process.env.IMAGEKIT_URL_ENDPOINT;

const imagekit = hasImageKitConfig
  ? new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    })
  : {
      upload: async () => {
        throw new Error(
          "ImageKit credentials are missing. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT in .env",
        );
      },
      url: () => "",
    };

export default imagekit;
