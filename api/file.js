import fs from "fs";
import path from "path";

export default function handler(req, res) {
  const file = req.query.file;

  if (!file || typeof file !== "string") {
    return res.status(400).json({
      error: "File is required"
    });
  }

  const allowedFiles = [
    "index.html",
    "app.js",
    "manifest.json",
    "api/chat.js",
    "api/files.js",
    "api/file.js"
  ];

  if (!allowedFiles.includes(file)) {
    return res.status(403).json({
      error: "File tidak diizinkan"
    });
  }

  try {
    const filePath = path.join(process.cwd(), file);
    const content = fs.readFileSync(filePath, "utf8");

    return res.status(200).json({
      file,
      content
    });

  } catch (error) {
    return res.status(404).json({
      error: "File tidak ditemukan"
    });
  }
}
