import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only jpeg, png, webp allowed"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export default upload;