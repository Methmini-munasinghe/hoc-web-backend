import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
import multer from "multer";


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage — file stays in buffer, we upload manually to Cloudinary
const storage = multer.memoryStorage();
export const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error("Only jpg, png, webp images are allowed"));
        }
        cb(null, true);
    },
});
// Helper to upload a buffer to Cloudinary
export const uploadToCloudinary = (buffer, folder = "products") => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                allowed_formats: ["jpg", "jpeg", "png", "webp"],
                transformation: [
                    { width: 1000, height: 1000, crop: "limit" },
                    { quality: "auto" },
                    { fetch_format: "auto" }
                ],
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};

// Helper to delete image from Cloudinary
export const extractPublicId = (url) => {
    const parts = url.split("/");
    const filename = parts[parts.length - 1].split(".")[0];
    const folder = parts[parts.length - 2];
    return `${folder}/${filename}`;
};

export const deleteFromCloudinary = async (url) => {
    const publicId = extractPublicId(url);
    return cloudinary.uploader.destroy(publicId);
};

export default cloudinary;