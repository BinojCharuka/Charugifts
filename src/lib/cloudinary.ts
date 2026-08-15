import { v2 as cloudinary } from "cloudinary";

const rawUrl = process.env.CLOUDINARY_URL || "";
// Programmatically clean any `<` or `>` characters from the URL
const cleanUrl = rawUrl.replace(/[<>]/g, "");

if (cleanUrl.startsWith("cloudinary://")) {
  const parts = cleanUrl.substring(13).split("@");
  if (parts.length === 2) {
    const creds = parts[0].split(":");
    const cloudName = parts[1];
    const apiKey = creds[0];
    const apiSecret = creds[1];

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }
}

export { cloudinary };
