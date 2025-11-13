"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImage = uploadImage;
const cloudinary_1 = require("cloudinary");
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials are not set in the environment variables.');
}
cloudinary_1.v2.config({
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
async function uploadImage(file) {
    try {
        let uploadSource;
        if (Buffer.isBuffer(file)) {
            // Convert buffer to data URI
            uploadSource = `data:image/jpeg;base64,${file.toString('base64')}`;
        }
        else {
            uploadSource = file;
        }
        const result = await cloudinary_1.v2.uploader.upload(uploadSource, {
            folder: 'kiosk-products', // Optional: organize uploads in a specific folder
        });
        return result.secure_url;
    }
    catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload image to Cloudinary.');
    }
}
