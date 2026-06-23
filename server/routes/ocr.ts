import { Router } from "express";
import multer from "multer";
import { authenticateJWT } from "../middleware/auth";
import { extractReceiptData } from "../services/ocrService";

const ALLOWED_MIMES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("UNSUPPORTED_MEDIA_TYPE"));
    }
  },
});

const router = Router();
router.use(authenticateJWT);

router.post("/receipts/ocr", (req: any, res: any, next: any) => {
  upload.single("receipt")(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File too large. Maximum size is 10 MB." });
      }
      if (err instanceof Error && err.message === "UNSUPPORTED_MEDIA_TYPE") {
        return res.status(415).json({ error: "Unsupported file type. Use JPEG, PNG, or PDF." });
      }
      return next(err);
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Use field name 'receipt'." });
    }

    extractReceiptData(req.file.buffer)
      .then((result: any) => res.json(result))
      .catch((err: any) => next(err));
  });
});

export default router;
