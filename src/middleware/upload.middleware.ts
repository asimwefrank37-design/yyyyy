import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { errorResponse } from "../utils/response.helper";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// One image in one form-data field. label is used in error messages, e.g. "Avatar".
const singleImage = (field: string, label: string, maxMb: number) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (!IMAGE_TYPES.has(file.mimetype)) {
        callback(new Error(`${label} must be a JPEG, PNG, or WebP image`));
        return;
      }
      callback(null, true);
    },
  });

  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(field)(req, res, (error: unknown) => {
      if (!error) {
        next();
        return;
      }

      const tooLarge = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
      const message = tooLarge
        ? `${label} must be ${maxMb} MB or smaller`
        : error instanceof Error
          ? error.message
          : `Could not read the ${label.toLowerCase()}`;

      res.status(400).json(errorResponse(message));
    });
  };
};

export const uploadAvatar = singleImage("avatar", "Avatar", 2);

export const uploadCover = singleImage("cover", "Cover image", 5);
