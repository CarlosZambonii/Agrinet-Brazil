const multer = require("multer");
const path = require("path");
const { randomUUID } = require("crypto");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/listings");
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = randomUUID() + ext;
    cb(null, filename);
  }
});

const allowedTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
];

const fileFilter = (req, file, cb) => {
  if (!allowedTypes.includes(file.mimetype)) {
    const err = new Error("Invalid file type");
    err.status = 400;
    return cb(err);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

module.exports = upload;
