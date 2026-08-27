export default function handler(req, res) {
  const files = [
    "index.html",
    "app.js",
    "manifest.json",
    "api/chat.js",
    "api/files.js"
  ];

  res.status(200).json({
    files
  });
}
