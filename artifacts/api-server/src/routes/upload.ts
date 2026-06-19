import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    cb(null, `${base}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /^video\//;
    cb(null, allowed.test(file.mimetype));
  },
});

router.post("/upload-video", upload.single("video"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No video file provided or unsupported type." });
    return;
  }
  const url = `/api/admin/files/${req.file.filename}`;
  res.json({ url, filename: req.file.filename, size: req.file.size });
});

router.get("/files/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found." });
    return;
  }
  res.sendFile(filePath);
});

export default router;
