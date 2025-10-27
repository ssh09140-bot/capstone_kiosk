import { v2 as cloudinary } from 'cloudinary';

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  throw new Error('Cloudinary credentials are not set in the environment variables.');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads an image file or buffer to Cloudinary.
 * @param file The path to the image file or the image buffer to upload.
 * @returns The secure URL of the uploaded image.
 * @throws Error if the upload fails.
 */
export async function uploadImage(file: string | Buffer): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: 'kiosk-products', // Optional: organize uploads in a specific folder
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary.');
  }
}
