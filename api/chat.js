export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method Not Allowed",
    });
  }

  try {
    const body = req.body || {};

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const provider =
      typeof body.provider === "string"
        ? body.provider.trim().toLowerCase()
        : "openai";

    const model =
      typeof body.model === "string"
        ? body.model.trim()
        : "";

    const apiKey =
      typeof body.apiKey === "string"
        ? body.apiKey.trim()
        : "";

    const customEndpoint =
      typeof body.endpoint === "string"
        ? body.endpoint.trim()
        : "";

    if (!message) {
      return res.status(400).json({
        ok: false,
        error: "Pesan kosong.",
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        ok: false,
        error:
          "API Key belum diisi. Buka Settings → API Key.",
      });
    }

    if (!model) {
      return res.status(400).json({
        ok: false,
        error:
          "Model belum dipilih. Buka Settings → Model.",
      });
    }

    const systemPrompt =
      "You are OpenCodeLolo.10, an expert AI coding assistant. " +
      "Help users build, debug, explain, refactor, and improve software. " +
      "Give practical, accurate, production-ready answers.";

    // =========================================================
    // GEMINI
    // Gemini tidak menggunakan /chat/completions.
    // Gemini menggunakan GenerateContent API.
    // =========================================================

    if (
      provider === "gemini" ||
      provider === "google" ||
      provider === "google-gemini"
    ) {
      let endpoint = customEndpoint;

      if (!endpoint) {
        endpoint =
          `https://generativelanguage.googleapis.com/v1beta/models/` +
          `${encodeURIComponent(model)}:generateContent`;
      }

      endpoint = endpoint.replace(/\/+$/, "");

      const response = await fetch(endpoint, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },

        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemPrompt,
              },
            ],
          },

          contents: [
            {
              role: "user",

              parts: [
                {
                  text: message,
                },
              ],
            },
          ],
        }),
      });

      const rawText = await response.text();

      let data;

      try {
        data = JSON.parse(rawText);
      } catch {
        data = {
          raw: rawText,
        };
      }

      if (!response.ok) {
        console.error(
          "GEMINI ERROR:",
          response.status,
          data
        );

        const errorMessage =
          data?.error?.message ||
          data?.error?.status ||
          data?.message ||
          data?.raw ||
          `Gemini mengembalikan HTTP ${response.status}`;

        return res.status(502).json({
          ok: false,
          error: String(errorMessage),
          status: response.status,
          provider: "gemini",
          model,
        });
      }

      const parts =
        data?.candidates?.[0]?.content?.parts;

      let reply = "";

      if (Array.isArray(parts)) {
        reply = parts
          .map((part) => {
            return part?.text || "";
          })
          .join("");
      }

      if (!reply) {
        console.error(
          "UNKNOWN GEMINI RESPONSE:",
          JSON.stringify(data)
        );

        return res.status(502).json({
          ok: false,
          error:
            "Gemini berhasil dihubungi tetapi tidak mengembalikan teks jawaban.",
          provider: "gemini",
          model,
        });
      }

      return res.status(200).json({
        ok: true,
        reply,
        provider: "gemini",
        model,

        usage:
          data?.usageMetadata || null,

        id: null,
      });
    }

    // =========================================================
    // OPENAI-COMPATIBLE PROVIDERS
    // =========================================================

    let endpoint = customEndpoint;

    if (!endpoint) {
      const endpoints = {
        openai:
          "https://api.openai.com/v1/chat/completions",

        openrouter:
          "https://openrouter.ai/api/v1/chat/completions",

        groq:
          "https://api.groq.com/openai/v1/chat/completions",

        deepseek:
          "https://api.deepseek.com/chat/completions",

        mistral:
          "https://api.mistral.ai/v1/chat/completions",

        together:
          "https://api.together.xyz/v1/chat/completions",

        fireworks:
          "https://api.fireworks.ai/inference/v1/chat/completions",
      };

      endpoint = endpoints[provider];

      if (!endpoint) {
        return res.status(400).json({
          ok: false,
          error:
            "Provider tidak dikenal. Isi Endpoint secara manual di Settings.",
        });
      }
    }

    endpoint = endpoint.replace(/\/+$/, "");

    if (!endpoint.endsWith("/chat/completions")) {
      if (
        endpoint.endsWith("/v1") ||
        endpoint.endsWith("/api/v1")
      ) {
        endpoint += "/chat/completions";
      }
    }

    const headers = {
      "Content-Type": "application/json",

      Authorization:
        `Bearer ${apiKey}`,
    };

    // OpenRouter headers
    if (provider === "openrouter") {
      headers["HTTP-Referer"] =
        "https://opencodelolo-10.vercel.app";

      headers["X-Title"] =
        "OpenCodeLolo.10";
    }

    const payload = {
      model,

      messages: [
        {
          role: "system",
          content: systemPrompt,
        },

        {
          role: "user",
          content: message,
        },
      ],

      stream: false,
    };

    const response = await fetch(endpoint, {
      method: "POST",

      headers,

      body: JSON.stringify(payload),
    });

    const rawText = await response.text();

    let data;

    try {
      data = JSON.parse(rawText);
    } catch {
      data = {
        raw: rawText,
      };
    }

    if (!response.ok) {
      console.error(
        "AI PROVIDER ERROR:",
        response.status,
        data
      );

      const providerError =
        data?.error?.message ||
        data?.error?.detail ||
        data?.message ||
        data?.detail ||
        data?.raw ||
        `Provider mengembalikan HTTP ${response.status}`;

      return res.status(502).json({
        ok: false,
        error: String(providerError),
        status: response.status,
        provider,
        model,
      });
    }

    // =========================================================
    // PARSE OPENAI-COMPATIBLE RESPONSE
    // =========================================================

    let reply =
      data?.choices?.[0]?.message?.content;

    // Beberapa provider mengembalikan content sebagai array
    if (Array.isArray(reply)) {
      reply = reply
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          return (
            item?.text ||
            item?.content ||
            ""
          );
        })
        .join("");
    }

    // Fallback
    if (
      !reply &&
      typeof data?.output_text === "string"
    ) {
      reply = data.output_text;
    }

    if (
      !reply &&
      typeof data?.response === "string"
    ) {
      reply = data.response;
    }

    if (
      !reply &&
      typeof data?.text === "string"
    ) {
      reply = data.text;
    }

    if (!reply) {
      console.error(
        "UNKNOWN AI RESPONSE:",
        JSON.stringify(data)
      );

      return res.status(502).json({
        ok: false,
        error:
          "AI berhasil dihubungi tetapi format jawabannya tidak dikenali.",

        provider,
        model,
      });
    }

    return res.status(200).json({
      ok: true,

      reply: String(reply),

      provider,

      model,

      usage:
        data?.usage || null,

      id:
        data?.id || null,
    });
  } catch (error) {
    console.error(
      "API CHAT ERROR:",
      error
    );

    return res.status(500).json({
      ok: false,

      error:
        error?.message ||
        "Terjadi kesalahan pada server.",
    });
  }
}
