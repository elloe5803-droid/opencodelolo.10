export default async function handler(req, res) {
  // Hanya menerima POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }

  try {
    // Ambil pesan dari browser
    const message = req.body?.message;

    if (
      typeof message !== "string" ||
      message.trim() === ""
    ) {
      return res.status(400).json({
        error: "Pesan kosong"
      });
    }

    // Ambil API key dari Vercel
    let apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error:
          "OPENROUTER_API_KEY belum tersedia di Vercel"
      });
    }

    // Bersihkan jika value Vercel tidak sengaja diberi
    // tanda kutip atau prefix Bearer
    apiKey = apiKey
      .trim()
      .replace(/^Bearer\s+/i, "")
      .replace(/^["']|["']$/g, "");

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENROUTER_API_KEY kosong"
      });
    }

    // Kirim ke OpenRouter
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer":
            "https://opencodelolo-10.vercel.app",
          "X-Title": "OpenCode Lolo"
        },

        body: JSON.stringify({
          model: "openrouter/free",

          messages: [
            {
              role: "system",
              content:
                "You are an expert AI coding assistant. Help the user create, debug, explain, and improve websites and code. Give practical and accurate answers."
            },
            {
              role: "user",
              content: message.trim()
            }
          ]
        })
      }
    );

    // Baca response
    const data = await response.json();

    // Kalau OpenRouter mengembalikan error
    if (!response.ok) {
      console.error(
        "OpenRouter error:",
        response.status,
        data
      );

      return res.status(502).json({
        error:
          data?.error?.message ||
          `OpenRouter error (${response.status})`
      });
    }

    // Ambil jawaban AI
    const reply =
      data?.choices?.[0]?.message?.content;

    if (!reply) {
      console.error(
        "Response OpenRouter tidak memiliki reply:",
        data
      );

      return res.status(502).json({
        error:
          "OpenRouter tidak mengembalikan jawaban AI"
      });
    }

    // Kirim jawaban ke frontend
    return res.status(200).json({
      reply
    });

  } catch (error) {
    console.error(
      "API CHAT ERROR:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Terjadi kesalahan pada server"
    });
  }
}
