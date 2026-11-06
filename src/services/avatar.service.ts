import cloudinary from "../config/cloudinary";

const uploadImage = (buffer: Buffer, folder: string) => {
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error || !result) {
        reject(error ?? new Error("Image upload failed"));
        return;
      }
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
};

// "local:" ids are placeholder images from the seed and dev scripts, not Cloudinary files.
const deleteImage = async (publicId: string) => {
  if (!publicId || publicId.startsWith("local:")) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // A leftover file on Cloudinary is not worth failing the request for.
  }
};

export const uploadAvatar = (buffer: Buffer) => uploadImage(buffer, "open-margin/avatars");

export const deleteAvatar = deleteImage;

export const uploadCover = (buffer: Buffer) => uploadImage(buffer, "open-margin/covers");

export const deleteCover = deleteImage;
