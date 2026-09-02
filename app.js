```js
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  /*
   * =========================================================
   * PROVIDERS
   * =========================================================
   */

  const PROVIDERS = {
    openai: {
      name: "OpenAI",
      model: "gpt-4.1-mini",
      endpoint: ""
    },

    openrouter: {
      name: "OpenRouter",
      model: "openrouter/free",
      endpoint: ""
    },

    gemini: {
      name: "Google Gemini",
      model: "gemini-3.6-flash",
      endpoint: ""
    },

    groq: {
      name: "Groq",
      model: "llama-3.3-70b-versatile",
      endpoint: ""
    },

    deepseek: {
      name: "DeepSeek",
      model: "deepseek-chat",
      endpoint: ""
    },

    mistral: {
      name: "Mistral",
      model: "mistral-small-latest",
      endpoint: ""
    },

    together: {
      name: "Together AI",
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      endpoint: ""
    },

    fireworks: {
      name: "Fireworks AI",
      model: "accounts/fireworks/models/llama-v3p1-70b-instruct",
      endpoint: ""
    },

    custom: {
      name: "Custom",
      model: "",
      endpoint: ""
    }
  };

  const DEFAULTS = {
    provider: "openai",
    model: "gpt-4.1-mini",
    apiKey: "",
    endpoint: "",
    active: false
  };

  let settings = loadSettings();
  let messages = [];


  /*
   * =========================================================
   * MODEL NORMALIZATION
   * =========================================================
   */

  function normalizeGeminiModel(model) {
    let value = String(model || "").trim();

    value = value.replace(/^models\//i, "");

    if (
      !value ||
      value === "gemini-2.5-flash" ||
      value === "gemini-2.5-flash-latest"
    ) {
      return "gemini-3.6-flash";
    }

    return value;
  }

  function normalizeModel(provider, model) {
    const value = String(model || "").trim();

    if (
      provider === "gemini" ||
      provider === "google" ||
      provider === "google-gemini"
    ) {
      return normalizeGeminiModel(value);
    }

    return value;
  }


  /*
   * =========================================================
   * SETTINGS
   * =========================================================
   */

  function loadSettings() {
    try {
      const saved = JSON.parse(
        localStorage.getItem("ocl_settings") || "{}"
      );

      const merged = {
        ...DEFAULTS,
        ...saved
      };

      /*
       * Migrate old Gemini model.
       */
      if (
        merged.provider === "gemini" &&
        (
          merged.model === "gemini-2.5-flash" ||
          merged.model === "gemini-2.5-flash-latest" ||
          merged.model === "models/gemini-2.5-flash"
        )
      ) {
        merged.model = "gemini-3.6-flash";
      }

      /*
       * Remove old "models/" prefix.
       */
      if (merged.provider === "gemini") {
        merged.model = normalizeGeminiModel(
          merged.model
        );
      }

      /*
       * Google Gemini should use backend default
       * when endpoint is empty.
       */
      if (
        merged.provider === "gemini" &&
        merged.endpoint &&
        merged.endpoint.includes(
          "gemini-2.5-flash"
        )
      ) {
        merged.endpoint = "";
      }

      return merged;

    } catch {
      return {
        ...DEFAULTS
      };
    }
  }


  function persistSettings() {
    localStorage.setItem(
      "ocl_settings",
      JSON.stringify(settings)
    );
  }


  function syncSettingsUI() {
    if (!$("provider")) return;

    $("provider").value =
      settings.provider || "openai";

    $("model").value =
      settings.model || "";

    $("apiKey").value =
      settings.apiKey || "";

    $("endpoint").value =
      settings.endpoint || "";

    updateQuickModel();
    updateConnectionStatus();
  }


  function updateQuickModel() {
    const select = $("modelQuick");

    if (!select) return;

    select.innerHTML = "";

    const option =
      document.createElement("option");

    option.value =
      settings.model || "";

    option.textContent =
      settings.model ||
      "No model selected";

    select.appendChild(option);
  }


  function updateConnectionStatus() {
    const button =
      $("saveSettings");

    if (!button) return;

    if (
      settings.active &&
      settings.apiKey &&
      settings.model
    ) {
      button.textContent =
        "Settings Saved · AI Active";
    } else {
      button.textContent =
        "Save Settings";
    }
  }


  /*
   * =========================================================
   * VIEW / NAVIGATION
   * =========================================================
   */

  function showView(name) {
    document
      .querySelectorAll(".view")
      .forEach((view) => {
        view.classList.remove("active");
      });

    const target =
      $("view-" + name);

    if (target) {
      target.classList.add("active");
    }

    document
      .querySelectorAll("[data-view]")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.view === name
        );
      });

    const title =
      name.charAt(0).toUpperCase() +
      name.slice(1);

    if ($("viewTitle")) {
      $("viewTitle").textContent =
        title;
    }
  }


  /*
   * =========================================================
   * CHAT UI
   * =========================================================
   */

  function clearChat() {
    messages = [];

    const box =
      $("messages");

    if (!box) return;

    box.innerHTML = `
      <div class="messages-inner">
        <div class="empty" id="empty">
          <div class="empty-content">
            <div class="empty-logo">O</div>

            <h1>OpenCodeLolo.10</h1>

            <p>
              Your AI coding workspace.
              Ask a question, build something,
              or start a new project.
            </p>
          </div>
        </div>
      </div>
    `;
  }


  function addMessage(role, text) {
    const box =
      $("messages");

    if (!box) return null;

    let inner =
      box.querySelector(
        ".messages-inner"
      );

    if (!inner) {
      inner =
        document.createElement("div");

      inner.className =
        "messages-inner";

      box.appendChild(inner);
    }

    const empty =
      inner.querySelector("#empty");

    if (empty) {
      empty.remove();
    }

    const element =
      document.createElement("div");

    element.className =
      "msg " + role;

    element.textContent =
      text;

    inner.appendChild(element);

    box.scrollTop =
      box.scrollHeight;

    messages.push({
      role,
      content: text
    });

    return element;
  }


  function addSystemNotice(text) {
    addMessage("ai", text);
  }


  /*
   * =========================================================
   * PROVIDER
   * =========================================================
   */

  function setProvider(provider) {
    const config =
      PROVIDERS[provider];

    if (!config) return;

    const previousProvider =
      settings.provider;

    const currentModel =
      $("model")?.value.trim() || "";

    const previousModel =
      PROVIDERS[
        previousProvider
      ]?.model || "";

    settings.provider =
      provider;

    /*
     * Only replace model when user was
     * using the previous provider's default.
     */
    if (
      !currentModel ||
      currentModel === previousModel
    ) {
      if ($("model")) {
        $("model").value =
          config.model;
      }

      settings.model =
        config.model;
    }

    /*
     * Provider-specific endpoint.
     */
    if (
      $("endpoint") &&
      config.endpoint
    ) {
      $("endpoint").value =
        config.endpoint;

      settings.endpoint =
        config.endpoint;
    }

    /*
     * Gemini normalization.
     */
    if (provider === "gemini") {
      settings.model =
        normalizeGeminiModel(
          $("model")?.value || ""
        );

      if ($("model")) {
        $("model").value =
          settings.model;
      }

      /*
       * Let backend generate the official
       * Gemini endpoint automatically.
       */
      if ($("endpoint")) {
        $("endpoint").value = "";
      }

      settings.endpoint = "";
    }
  }


  /*
   * =========================================================
   * SAVE SETTINGS
   * =========================================================
   */

  function saveSettings() {
    const provider =
      $("provider")?.value ||
      "openai";

    let model =
      $("model")?.value.trim() ||
      "";

    const apiKey =
      $("apiKey")?.value.trim() ||
      "";

    const endpoint =
      $("endpoint")?.value.trim() ||
      "";

    model =
      normalizeModel(
        provider,
        model
      );

    settings = {
      ...settings,

      provider,

      model,

      apiKey,

      endpoint,

      active:
        Boolean(
          apiKey &&
          model
        )
    };

    persistSettings();

    syncSettingsUI();

    showView("chat");

    if (settings.active) {
      addSystemNotice(
        `AI aktif: ${
          PROVIDERS[provider]?.name ||
          provider
        } / ${model}`
      );
    } else {
      addSystemNotice(
        "API belum aktif. Masukkan API Key dan Model di Settings."
      );
    }
  }


  /*
   * =========================================================
   * BUILD BACKEND REQUEST
   * =========================================================
   */

  function buildRequestBody(
    message,
    test = false
  ) {
    const provider =
      String(
        settings.provider ||
        "openai"
      ).trim().toLowerCase();

    const model =
      normalizeModel(
        provider,
        settings.model
      );

    let endpoint =
      String(
        settings.endpoint || ""
      ).trim();

    /*
     * Gemini:
     * Backend handles the official endpoint.
     */
    if (provider === "gemini") {
      endpoint = "";
    }

    return {
      message: String(message).trim(),

      provider,

      model,

      apiKey:
        String(
          settings.apiKey || ""
        ).trim(),

      endpoint,

      test
    };
  }


  /*
   * =========================================================
   * API REQUEST
   * =========================================================
   */

  async function requestAI(
    message,
    test = false
  ) {
    const payload =
      buildRequestBody(
        message,
        test
      );

    const response =
      await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
            "Accept":
              "application/json"
          },

          body:
            JSON.stringify(
              payload
            )
        }
      );

    const raw =
      await response.text();

    let data = {};

    try {
      data =
        raw
          ? JSON.parse(raw)
          : {};
    } catch {
      throw new Error(
        `Server mengembalikan response yang bukan JSON (${response.status}).`
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        `Server error (${response.status})`
      );
    }

    if (
      data.ok === false
    ) {
      throw new Error(
        data.error ||
        "AI request ditolak."
      );
    }

    return data;
  }


  /*
   * =========================================================
   * TEST CONNECTION
   * =========================================================
   */

  async function testConnection() {
    if (!settings.apiKey) {
      showView("settings");

      alert(
        "Masukkan API Key terlebih dahulu."
      );

      return;
    }

    if (!settings.model) {
      showView("settings");

      alert(
        "Masukkan Model terlebih dahulu."
      );

      return;
    }

    /*
     * Normalize old saved Gemini model.
     */
    settings.model =
      normalizeModel(
        settings.provider,
        settings.model
      );

    const button =
      $("saveSettings");

    if (button) {
      button.disabled = true;
      button.textContent =
        "Testing…";
    }

    try {
      const data =
        await requestAI(
          "Reply with exactly: CONNECTION_OK",
          true
        );

      settings.active = true;

      /*
       * Backend returns normalized model.
       */
      if (data.model) {
        settings.model =
          normalizeModel(
            settings.provider,
            data.model
          );
      }

      persistSettings();
      syncSettingsUI();

      alert(
        `Connection berhasil.\n\n${
          PROVIDERS[
            settings.provider
          ]?.name ||
          settings.provider
        } · ${
          settings.model
        }`
      );

    } catch (error) {
      alert(
        "Connection gagal:\n\n" +
        (
          error.message ||
          "Unknown error"
        )
      );

    } finally {
      if (button) {
        button.disabled =
          false;

        updateConnectionStatus();
      }
    }
  }


  /*
   * =========================================================
   * SEND MESSAGE
   * =========================================================
   */

  async function sendMessage() {
    const input =
      $("prompt");

    if (!input) return;

    const message =
      input.value.trim();

    if (!message) return;

    if (!settings.apiKey) {
      showView("settings");

      alert(
        "AI belum aktif.\n\nMasukkan API Key di Settings lalu Save Settings."
      );

      return;
    }

    if (!settings.model) {
      showView("settings");

      alert(
        "Model belum dipilih."
      );

      return;
    }

    /*
     * Always normalize before request.
     */
    settings.model =
      normalizeModel(
        settings.provider,
        settings.model
      );

    settings.active = true;

    persistSettings();

    input.value = "";

    input.style.height =
      "auto";

    addMessage(
      "user",
      message
    );

    const pending =
      addMessage(
        "ai",
        "Thinking…"
      );

    try {
      const data =
        await requestAI(
          message,
          false
        );

      const reply =
        data.reply ||
        data.message ||
        data.content;

      if (!reply) {
        throw new Error(
          "Backend tidak mengembalikan reply."
        );
      }

      /*
       * Keep frontend model synchronized
       * with backend normalized model.
       */
      if (data.model) {
        settings.model =
          normalizeModel(
            settings.provider,
            data.model
          );

        persistSettings();
        updateQuickModel();
      }

      if (pending) {
        pending.textContent =
          reply;
      }

    } catch (error) {
      if (pending) {
        pending.textContent =
          "❌ " +
          (
            error.message ||
            "Terjadi kesalahan saat menghubungi AI."
          );
      }
    }
  }


  /*
   * =========================================================
   * NAVIGATION
   * =========================================================
   */

  function setupNavigation() {
    document
      .querySelectorAll(
        "[data-view]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            showView(
              button.dataset.view
            );
          }
        );
      });
  }


  /*
   * =========================================================
   * CHAT
   * =========================================================
   */

  function setupChat() {
    const send =
      $("send");

    const input =
      $("prompt");

    if (send) {
      send.addEventListener(
        "click",
        sendMessage
      );
    }

    if (input) {
      input.addEventListener(
        "keydown",
        (event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey
          ) {
            event.preventDefault();

            sendMessage();
          }
        }
      );

      input.addEventListener(
        "input",
        () => {
          input.style.height =
            "auto";

          input.style.height =
            Math.min(
              input.scrollHeight,
              220
            ) + "px";
        }
      );
    }
  }


  /*
   * =========================================================
   * NEW CHAT
   * =========================================================
   */

  function setupNewChat() {
    const button =
      $("newChat");

    if (!button) return;

    button.addEventListener(
      "click",
      () => {
        clearChat();

        showView("chat");

        $("prompt")?.focus();
      }
    );
  }


  /*
   * =========================================================
   * SETTINGS UI
   * =========================================================
   */

  function setupSettings() {
    const save =
      $("saveSettings");

    if (save) {
      save.addEventListener(
        "click",
        saveSettings
      );
    }

    const provider =
      $("provider");

    if (provider) {
      provider.addEventListener(
        "change",
        () => {
          const selected =
            provider.value;

          const config =
            PROVIDERS[selected];

          if (!config) return;

          const current =
            $("model")
              ?.value
              .trim() || "";

          const previous =
            PROVIDERS[
              settings.provider
            ]?.model || "";

          settings.provider =
            selected;

          if (
            !current ||
            current === previous
          ) {
            $("model").value =
              config.model;
          }

          if (
            selected ===
            "gemini"
          ) {
            $("model").value =
              normalizeGeminiModel(
                $("model").value
              );

            $("endpoint").value =
              "";

          }

          settings.model =
            normalizeModel(
              selected,
              $("model").value
            );

          settings.endpoint =
            selected === "gemini"
              ? ""
              : (
                  $("endpoint")
                    ?.value
                    .trim() || ""
                );
        }
      );
    }

    const quick =
      $("modelQuick");

    if (quick) {
      quick.addEventListener(
        "change",
        () => {
          const value =
            quick.value;

          if (!value) return;

          settings.model =
            normalizeModel(
              settings.provider,
              value
            );

          if ($("model")) {
            $("model").value =
              settings.model;
          }

          persistSettings();
        }
      );
    }
  }


  /*
   * =========================================================
   * THEME
   * =========================================================
   */

  function setupTheme() {
    const button =
      $("themeBtn");

    if (!button) return;

    button.addEventListener(
      "click",
      () => {
        const light =
          document.body.dataset.theme !==
          "light";

        document.body.dataset.theme =
          light
            ? "light"
            : "dark";

        if (light) {
          document.documentElement.style.setProperty(
            "--bg",
            "#f7f7f7"
          );

          document.documentElement.style.setProperty(
            "--sidebar",
            "#eeeeee"
          );

          document.documentElement.style.setProperty(
            "--text",
            "#171717"
          );
        } else {
          document.documentElement.style.setProperty(
            "--bg",
            "#0b0b0b"
          );

          document.documentElement.style.setProperty(
            "--sidebar",
            "#101010"
          );

          document.documentElement.style.setProperty(
            "--text",
            "#f1f1f1"
          );
        }
      }
    );
  }


  /*
   * =========================================================
   * KEYBOARD SHORTCUTS
   * =========================================================
   */

  function setupKeyboardShortcuts() {
    document.addEventListener(
      "keydown",
      (event) => {
        if (
          (event.ctrlKey ||
            event.metaKey) &&
          event.key.toLowerCase() ===
            "k"
        ) {
          event.preventDefault();

          $("prompt")?.focus();
        }

        if (
          (event.ctrlKey ||
            event.metaKey) &&
          event.key.toLowerCase() ===
            "n"
        ) {
          event.preventDefault();

          clearChat();
          showView("chat");

          $("prompt")?.focus();
        }
      }
    );
  }


  /*
   * =========================================================
   * INIT
   * =========================================================
   */

  function init() {
    /*
     * Normalize old localStorage data.
     */
    settings.provider =
      settings.provider ||
      "openai";

    settings.model =
      normalizeModel(
        settings.provider,
        settings.model
      );

    /*
     * Gemini must not keep an old
     * hardcoded endpoint.
     */
    if (
      settings.provider ===
      "gemini"
    ) {
      settings.endpoint = "";
    }

    persistSettings();

    setupNavigation();
    setupChat();
    setupNewChat();
    setupSettings();
    setupTheme();
    setupKeyboardShortcuts();

    syncSettingsUI();

    showView("chat");
  }


  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
```
