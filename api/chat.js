```js
// api/chat.js
//
// Universal AI proxy for Vercel.
// Supports:
// - Google Gemini
// - OpenAI
// - OpenRouter
// - Groq
// - DeepSeek
// - Mistral
// - Together
// - Fireworks
// - Any OpenAI-compatible endpoint
//
// Request:
// POST /api/chat
//
// {
//   "message": "Hello",
//   "provider": "gemini",
//   "model": "gemini-3.6-flash",
//   "apiKey": "YOUR_KEY",
//   "endpoint": ""
// }

export default async function handler(req, res) {
  // ---------------------------------------------------------
  // CORS
  // ---------------------------------------------------------

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method Not Allowed. Use POST."
    });
  }

  try {
    // -------------------------------------------------------
    // READ REQUEST
    // -------------------------------------------------------

    const body =
      typeof req.body === "object" && req.body !== null
        ? req.body
        : {};

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const provider =
      String(body.provider || "openai")
        .trim()
        .toLowerCase();

    const apiKey =
      String(body.apiKey || "").trim();

    let model =
      String(body.model || "").trim();

    let endpoint =
      String(body.endpoint || "").trim();

    const test =
      body.test === true;

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (!message) {
      return res.status(400).json({
        ok: false,
        error: "Message kosong."
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        ok: false,
        error: "API Key belum diisi."
      });
    }

    // -------------------------------------------------------
    // PROVIDER ALIASES
    // -------------------------------------------------------

    const isGemini =
      provider === "gemini" ||
      provider === "google" ||
      provider === "google-gemini";

    const isOpenRouter =
      provider === "openrouter";

    const isOpenAI =
      provider === "openai";

    const isGroq =
      provider === "groq";

    const isDeepSeek =
      provider === "deepseek";

    const isMistral =
      provider === "mistral";

    const isTogether =
      provider === "together";

    const isFireworks =
      provider === "fireworks";

    const isCustom =
      provider === "custom";

    // -------------------------------------------------------
    // DEFAULT MODELS
    // -------------------------------------------------------

    if (!model) {
      if (isGemini) {
        model = "gemini-3.6-flash";
      } else if (isOpenRouter) {
        model = "openrouter/free";
      } else if (isOpenAI) {
        model = "gpt-4.1-mini";
      } else if (isGroq) {
        model = "llama-3.3-70b-versatile";
      } else if (isDeepSeek) {
        model = "deepseek-chat";
      } else if (isMistral) {
        model = "mistral-small-latest";
      } else {
        return res.status(400).json({
          ok: false,
          error: "Model belum diisi."
        });
      }
    }

    // -------------------------------------------------------
    // NORMALIZE GEMINI MODEL
    // -------------------------------------------------------

    if (isGemini) {
      model = model
        .replace(/^models\//i, "")
        .trim();

      // Old model migration
      if (
        !model ||
        model === "gemini-2.5-flash" ||
        model === "gemini-2.5-flash-latest"
      ) {
        model = "gemini-3.6-flash";
      }
    }

    // -------------------------------------------------------
    // GEMINI
    // -------------------------------------------------------

    if (isGemini) {
      return await handleGemini({
        req,
        res,
        message,
        apiKey,
        model,
        endpoint,
        test
      });
    }

    // -------------------------------------------------------
    // OPENAI-COMPATIBLE PROVIDERS
    // -------------------------------------------------------

    let baseEndpoint = endpoint;

    if (!baseEndpoint) {
      if (isOpenAI) {
        baseEndpoint =
          "https://api.openai.com/v1/chat/completions";
      } else if (isOpenRouter) {
        baseEndpoint =
          "https://openrouter.ai/api/v1/chat/completions";
      } else if (isGroq) {
        baseEndpoint =
          "https://api.groq.com/openai/v1/chat/completions";
      } else if (isDeepSeek) {
        baseEndpoint =
          "https://api.deepseek.com/chat/completions";
      } else if (isMistral) {
        baseEndpoint =
          "https://api.mistral.ai/v1/chat/completions";
      } else if (isTogether) {
        baseEndpoint =
          "https://api.together.xyz/v1/chat/completions";
      } else if (isFireworks) {
        baseEndpoint =
          "https://api.fireworks.ai/inference/v1/chat/completions";
      }
    }

    if (
      !baseEndpoint &&
      !isCustom
    ) {
      return res.status(400).json({
        ok: false,
        error:
          `Endpoint untuk provider "${provider}" belum tersedia.`
      });
    }

    if (isCustom && !baseEndpoint) {
      return res.status(400).json({
        ok: false,
        error:
          "Custom provider membutuhkan Endpoint."
      });
    }

    // -------------------------------------------------------
    // NORMALIZE OPENAI-COMPATIBLE ENDPOINT
    // -------------------------------------------------------

    baseEndpoint =
      normalizeChatEndpoint(baseEndpoint);

    // -------------------------------------------------------
    // REQUEST BODY
    // -------------------------------------------------------

    const payload = {
      model,
      messages: [
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7
    };

    // -------------------------------------------------------
    // HEADERS
    // -------------------------------------------------------

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    };

    // OpenRouter metadata
    if (isOpenRouter) {
      headers["HTTP-Referer"] =
        getRequestOrigin(req);

      headers["X-Title"] =
        "OpenCodeLolo.10";
    }

    // -------------------------------------------------------
    // CALL PROVIDER
    // -------------------------------------------------------

    const response = await fetch(
      baseEndpoint,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      }
    );

    const data =
      await safeJson(response);

    // -------------------------------------------------------
    // PROVIDER ERROR
    // -------------------------------------------------------

    if (!response.ok) {
      const providerMessage =
        extractProviderError(data);

      return res.status(
        normalizeStatus(response.status)
      ).json({
        ok: false,
        error:
          `${provider} API error (${response.status}): ${providerMessage}`,
        provider,
        model,
        status: response.status,
        details: data
      });
    }

    // -------------------------------------------------------
    // EXTRACT RESPONSE
    // -------------------------------------------------------

    const reply =
      extractOpenAICompatibleText(data);

    if (!reply) {
      return res.status(502).json({
        ok: false,
        error:
          "Provider berhasil merespons, tetapi tidak ada teks jawaban yang ditemukan.",
        provider,
        model,
        raw: data
      });
    }

    return res.status(200).json({
      ok: true,
      reply,
      provider,
      model,
      test,
      usage: data?.usage || null,
      id: data?.id || null
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
        "Internal Server Error",
      type:
        error?.name ||
        "Error"
    });
  }
}


// ============================================================
// GEMINI HANDLER
// ============================================================

async function handleGemini({
  req,
  res,
  message,
  apiKey,
  model,
  endpoint,
  test
}) {
  try {
    // --------------------------------------------------------
    // Normalize model
    // --------------------------------------------------------

    model = String(model || "")
      .replace(/^models\//i, "")
      .trim();

    if (
      !model ||
      model === "gemini-2.5-flash" ||
      model === "gemini-2.5-flash-latest"
    ) {
      model = "gemini-3.6-flash";
    }

    // --------------------------------------------------------
    // Default Gemini endpoint
    // --------------------------------------------------------

    let url =
      endpoint ||
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent`;

    // --------------------------------------------------------
    // If user entered a generic Google endpoint,
    // convert it into GenerateContent endpoint.
    // --------------------------------------------------------

    if (
      url.includes(
        "generativelanguage.googleapis.com"
      )
    ) {
      url =
        normalizeGeminiEndpoint(
          url,
          model
        );
    }

    // --------------------------------------------------------
    // Gemini request
    // --------------------------------------------------------

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: message
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7
      }
    };

    const response =
      await fetch(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            "x-goog-api-key":
              apiKey
          },
          body:
            JSON.stringify(payload)
        }
      );

    const data =
      await safeJson(response);

    // --------------------------------------------------------
    // Gemini API error
    // --------------------------------------------------------

    if (!response.ok) {
      const providerMessage =
        extractGeminiError(data);

      return res.status(
        normalizeStatus(response.status)
      ).json({
        ok: false,
        error:
          `Gemini API error (${response.status}): ${providerMessage}`,
        provider: "gemini",
        model,
        status: response.status,
        details: data
      });
    }

    // --------------------------------------------------------
    // Extract Gemini response
    // --------------------------------------------------------

    const reply =
      extractGeminiText(data);

    if (!reply) {
      return res.status(502).json({
        ok: false,
        error:
          "Gemini berhasil merespons, tetapi tidak ada teks jawaban.",
        provider: "gemini",
        model,
        raw: data
      });
    }

    return res.status(200).json({
      ok: true,
      reply,
      provider: "gemini",
      model,
      test,
      usage:
        data?.usageMetadata || null
    });

  } catch (error) {
    console.error(
      "GEMINI ERROR:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Gemini request failed.",
      provider: "gemini",
      model
    });
  }
}


// ============================================================
// NORMALIZE OPENAI ENDPOINT
// ============================================================

function normalizeChatEndpoint(endpoint) {
  let url =
    String(endpoint || "").trim();

  if (!url) {
    return url;
  }

  // Remove trailing slash
  url = url.replace(/\/+$/, "");

  // Already correct
  if (
    /\/chat\/completions$/i.test(url)
  ) {
    return url;
  }

  // If user entered /completions
  if (
    /\/completions$/i.test(url)
  ) {
    return url.replace(
      /\/completions$/i,
      "/chat/completions"
    );
  }

  // If user entered /v1
  if (
    /\/v1$/i.test(url)
  ) {
    return `${url}/chat/completions`;
  }

  // If user entered API root
  if (
    /\/api$/i.test(url)
  ) {
    return `${url}/chat/completions`;
  }

  // Generic endpoint
  return `${url}/chat/completions`;
}


// ============================================================
// NORMALIZE GEMINI ENDPOINT
// ============================================================

function normalizeGeminiEndpoint(
  endpoint,
  model
) {
  let url =
    String(endpoint || "").trim();

  url =
    url.replace(/\/+$/, "");

  // If endpoint already contains a model path
  if (
    /\/models\/[^/]+:generateContent$/i.test(url)
  ) {
    return url.replace(
      /\/models\/[^/]+:generateContent$/i,
      `/models/${encodeURIComponent(
        model
      )}:generateContent`
    );
  }

  // Generic Google v1/v1beta endpoint
  if (
    /generativelanguage\.googleapis\.com\/v1beta$/i.test(
      url
    )
  ) {
    return `${url}/models/${encodeURIComponent(
      model
    )}:generateContent`;
  }

  if (
    /generativelanguage\.googleapis\.com\/v1$/i.test(
      url
    )
  ) {
    return `${url}/models/${encodeURIComponent(
      model
    )}:generateContent`;
  }

  // Bare Google API domain
  if (
    /generativelanguage\.googleapis\.com$/i.test(
      url
    )
  ) {
    return `${url}/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;
  }

  return url;
}


// ============================================================
// EXTRACT GEMINI TEXT
// ============================================================

function extractGeminiText(data) {
  const candidates =
    Array.isArray(data?.candidates)
      ? data.candidates
      : [];

  const texts = [];

  for (const candidate of candidates) {
    const parts =
      Array.isArray(
        candidate?.content?.parts
      )
        ? candidate.content.parts
        : [];

    for (const part of parts) {
      if (
        typeof part?.text === "string" &&
        part.text.trim()
      ) {
        texts.push(
          part.text.trim()
        );
      }
    }
  }

  return texts.join("\n");
}


// ============================================================
// EXTRACT OPENAI-COMPATIBLE TEXT
// ============================================================

function extractOpenAICompatibleText(data) {
  // Standard OpenAI
  const standard =
    data?.choices?.[0]?.message?.content;

  if (
    typeof standard === "string" &&
    standard.trim()
  ) {
    return standard.trim();
  }

  // Some providers return array content
  if (
    Array.isArray(standard)
  ) {
    const text =
      standard
        .map((item) => {
          if (
            typeof item === "string"
          ) {
            return item;
          }

          return (
            item?.text ||
            item?.content ||
            ""
          );
        })
        .filter(Boolean)
        .join("");

    if (text.trim()) {
      return text.trim();
    }
  }

  // Some compatible APIs
  const direct =
    data?.choices?.[0]?.text;

  if (
    typeof direct === "string" &&
    direct.trim()
  ) {
    return direct.trim();
  }

  // Fallback
  const outputText =
    data?.output_text;

  if (
    typeof outputText === "string" &&
    outputText.trim()
  ) {
    return outputText.trim();
  }

  return "";
}


// ============================================================
// ERROR EXTRACTION
// ============================================================

function extractProviderError(data) {
  if (!data) {
    return "Unknown provider error.";
  }

  if (
    typeof data?.error === "string"
  ) {
    return data.error;
  }

  if (
    typeof data?.error?.message === "string"
  ) {
    return data.error.message;
  }

  if (
    typeof data?.message === "string"
  ) {
    return data.message;
  }

  if (
    typeof data?.detail === "string"
  ) {
    return data.detail;
  }

  try {
    return JSON.stringify(data);
  } catch {
    return "Unknown provider error.";
  }
}


function extractGeminiError(data) {
  if (!data) {
    return "Unknown Gemini error.";
  }

  if (
    typeof data?.error?.message === "string"
  ) {
    return data.error.message;
  }

  if (
    typeof data?.error === "string"
  ) {
    return data.error;
  }

  if (
    typeof data?.message === "string"
  ) {
    return data.message;
  }

  try {
    return JSON.stringify(data);
  } catch {
    return "Unknown Gemini error.";
  }
}


// ============================================================
// SAFE JSON
// ============================================================

async function safeJson(response) {
  const text =
    await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text
    };
  }
}


// ============================================================
// STATUS NORMALIZATION
// ============================================================

function normalizeStatus(status) {
  const code =
    Number(status);

  if (
    code >= 400 &&
    code <= 599
  ) {
    return code;
  }

  return 502;
}


// ============================================================
// REQUEST ORIGIN
// ============================================================

function getRequestOrigin(req) {
  try {
    const protocol =
      req.headers["x-forwarded-proto"] ||
      "https";

    const host =
      req.headers["x-forwarded-host"] ||
      req.headers.host ||
      "";

    if (!host) {
      return "https://opencodelolo-10.vercel.app";
    }

    return `${protocol}://${host}`;
  } catch {
    return "https://opencodelolo-10.vercel.app";
  }
}
```
