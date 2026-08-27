// api/chat.js

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

    /*
     * Endpoint default.
     *
     * User tetap bisa memasukkan endpoint sendiri
     * dari Settings jika provider menggunakan endpoint
     * OpenAI-compatible.
     */
    let endpoint = customEndpoint;

    if (!endpoint) {
      if (provider === "openai") {
        endpoint =
          "https://api.openai.com/v1/chat/completions";
      } else if (provider === "openrouter") {
        endpoint =
          "https://openrouter.ai/api/v1/chat/completions";
      } else if (provider === "groq") {
        endpoint =
          "https://api.groq.com/openai/v1/chat/completions";
      } else if (provider === "deepseek") {
        endpoint =
          "https://api.deepseek.com/chat/completions";
      } else if (provider === "mistral") {
        endpoint =
          "https://api.mistral.ai/v1/chat/completions";
      } else if (provider === "together") {
        endpoint =
          "https://api.together.xyz/v1/chat/completions";
      } else if (provider === "fireworks") {
        endpoint =
          "https://api.fireworks.ai/inference/v1/chat/completions";
      } else {
        return res.status(400).json({
          ok: false,
          error:
            "Provider tidak dikenal. Isi Endpoint secara manual di Settings.",
        });
      }
    }

    /*
     * Bersihkan endpoint supaya tidak terjadi:
     * https://.../chat/completions/chat/completions
     */
    endpoint = endpoint.replace(/\/+$/, "");

    /*
     * Kalau user memasukkan base URL OpenAI-compatible,
     * otomatis tambahkan /chat/completions.
     */
    const looksLikeChatEndpoint =
      endpoint.endsWith("/chat/completions");

    if (!looksLikeChatEndpoint) {
      if (
        endpoint.endsWith("/v1") ||
        endpoint.endsWith("/api/v1")
      ) {
        endpoint += "/chat/completions";
      }
    }

    /*
     * Header umum OpenAI-compatible API.
     */
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    /*
     * Header tambahan OpenRouter.
     */
    if (provider === "openrouter") {
      headers["HTTP-Referer"] =
        "https://opencodelolo-10.vercel.app";

      headers["X-Title"] = "OpenCodeLolo.10";
    }

    const payload = {
      model,
      messages: [
        {
          role: "system",
          content:
            "You are OpenCodeLolo.10, an expert AI coding assistant. Help users build, debug, explain, refactor, and improve software. Give practical, accurate, production-ready answers.",
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

    /*
     * Format response yang umum dipakai:
     *
     * OpenAI
     * OpenRouter
     * Groq
     * DeepSeek
     * Mistral
     * Together
     * Fireworks
     */
    let reply =
      data?.choices?.[0]?.message?.content;

    /*
     * Beberapa provider bisa mengembalikan
     * content sebagai array.
     */
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

    /*
     * Fallback untuk response sederhana.
     */
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
        raw:
          typeof data === "object"
            ? JSON.stringify(data)
            : String(data),
      });
    }

    return res.status(200).json({
      ok: true,
      reply: String(reply),
      provider,
      model,

      usage: data?.usage || null,

      id: data?.id || null,
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
