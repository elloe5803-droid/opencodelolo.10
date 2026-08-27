export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const message = req.body?.message;

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY;

    if (
      !apiKey ||
      typeof apiKey !== "string" ||
      !apiKey.trim()
    ) {
      console.error(
        "OPENROUTER_API_KEY tidak tersedia"
      );

      return res.status(500).json({
        error:
          "OPENROUTER_API_KEY belum tersedia di Vercel"
      });
    }

    const upstream =
      await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",

          headers: {
            "Authorization":
              "Bearer " + apiKey.trim(),

            "Content-Type":
              "application/json",

            "HTTP-Referer":
              "https://opencodelolo-10.vercel.app",

            "X-Title":
              "OpenCode Lolo"
          },

          body: JSON.stringify({
            model: "openrouter/free",

            messages: [
              {
                role: "system",
                content:
                  "You are a helpful coding assistant. Help with programming, debugging, web development, and code."
              },
              {
                role: "user",
                content: message.trim()
              }
            ]
          })
        }
      );

    const data =
      await upstream.json();

    console.log(
      "OpenRouter status:",
      upstream.status
    );

    if (!upstream.ok) {
      console.error(
        "OpenRouter error:",
        data
      );

      return res.status(502).json({
        error:
          data?.error?.message ||
          "OpenRouter request failed"
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content;

    if (!reply) {
      console.error(
        "OpenRouter response:",
        data
      );

      return res.status(502).json({
        error:
          "AI tidak mengembalikan jawaban"
      });
    }

    return res.status(200).json({
      reply
    });

  } catch (error) {
    console.error(
      "CHAT ERROR:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Internal server error"
    });
  }
}
