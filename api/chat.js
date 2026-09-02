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

    custom: {
      name: "Custom",
      model: "",
      endpoint: ""
    }
  };

  /*
   * =========================================================
   * DEFAULT SETTINGS
   * =========================================================
   */

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
   * LOAD SETTINGS
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
       * Upgrade old Gemini configuration.
       */

      if (
        merged.provider === "gemini" ||
        merged.provider === "google" ||
        merged.provider === "google-gemini"
      ) {
        const oldModel = String(
          merged.model || ""
        ).trim();

        const normalized = normalizeGeminiModel(
          oldModel
        );

        if (
          !normalized ||
          normalized === "gemini-2.5-flash" ||
          normalized === "gemini-2.5-flash-latest"
        ) {
          merged.model = "gemini-3.6-flash";
        } else {
          merged.model = normalized;
        }

        /*
         * Gemini endpoint should normally be empty.
         * Backend generates the correct endpoint.
         */
        if (
          merged.endpoint &&
          merged.endpoint.includes(
            "generativelanguage.googleapis.com"
          )
        ) {
          merged.endpoint = "";
        }
      }

      return merged;
    } catch (error) {
      console.error(
        "LOAD SETTINGS ERROR:",
        error
      );

      return {
        ...DEFAULTS
      };
    }
  }

  /*
   * =========================================================
   * SAVE SETTINGS
   * =========================================================
   */

  function persistSettings() {
    try {
      localStorage.setItem(
        "ocl_settings",
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error(
        "SAVE SETTINGS ERROR:",
        error
      );
    }
  }

  /*
   * =========================================================
   * SETTINGS UI
   * =========================================================
   */

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
   * NAVIGATION
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
   * CHAT
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
    addMessage(
      "ai",
      text
    );
  }

  /*
   * =========================================================
   * SAVE SETTINGS
   * =========================================================
   */

  function saveSettings() {
    let provider =
      $("provider")?.value ||
      "openai";

    let model =
      $("model")?.value.trim() ||
      "";

    const apiKey =
      $("apiKey")?.value.trim() ||
      "";

    let endpoint =
      $("endpoint")?.value.trim() ||
      "";

    /*
     * Normalize Gemini model immediately.
     */

    model =
      normalizeModel(
        provider,
        model
      );

    /*
     * Gemini should use backend-generated
     * GenerateContent endpoint.
     */

    if (
      provider === "gemini" ||
      provider === "google" ||
      provider === "google-gemini"
    ) {
      endpoint = "";

      if (
        !model ||
        model === "gemini-2.5-flash" ||
        model === "gemini-2.5-flash-latest"
      ) {
        model =
          "gemini-3.6-flash";
      }
    }

    settings = {
      ...settings,
      provider,
      model,
      apiKey,
      endpoint,
      active:
        Boolean(apiKey && model)
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
   * PROVIDER
   * =========================================================
   */

  function setProvider(provider) {
    const config =
      PROVIDERS[provider];

    if (!config) return;

    const previousProvider =
      settings.provider;

    settings.provider =
      provider;

    const current =
      $("model")
        ?.value
        .trim() || "";

    const previousModel =
      PROVIDERS[
        previousProvider
      ]?.model || "";

    if (
      !current ||
      current === previousModel
    ) {
      if ($("model")) {
        $("model").value =
          config.model;
      }
    }

    if (
      provider === "gemini" ||
      provider === "google" ||
      provider === "google-gemini"
    ) {
      if ($("model")) {
        $("model").value =
          normalizeGeminiModel(
            $("model").value
          ) || "gemini-3.6-flash";
      }

      if ($("endpoint")) {
        $("endpoint").value = "";
      }
    } else if (
      $("endpoint") &&
      config.endpoint
    ) {
      $("endpoint").value =
        config.endpoint;
    }
  }

  /*
   * =========================================================
   * TEST CONNECTION
   * =========================================================
   */

  async function testConnection() {
    const apiKey =
      $("apiKey")?.value.trim() ||
      settings.apiKey;

    const provider =
      $("provider")?.value ||
      settings.provider;

    let model =
      $("model")?.value.trim() ||
      settings.model;

    let endpoint =
      $("endpoint")?.value.trim() ||
      settings.endpoint;

    model =
      normalizeModel(
        provider,
        model
      );

    if (!apiKey) {
      showView("settings");

      alert(
        "Masukkan API Key terlebih dahulu."
      );

      return;
    }

    if (!model) {
      showView("settings");

      alert(
        "Masukkan Model terlebih dahulu."
      );

      return;
    }

    if (
      provider === "gemini" ||
      provider === "google" ||
      provider === "google-gemini"
    ) {
      model =
        normalizeGeminiModel(
          model
        );

      endpoint = "";
    }

    const button =
      $("saveSettings");

    if (button) {
      button.disabled = true;
      button.textContent =
        "Testing…";
    }

    try {
      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              message:
                "Reply with exactly: CONNECTION_OK",

              provider,

              model,

              apiKey,

              endpoint,

              test: true
            })
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        data.ok === false
      ) {
        throw new Error(
          data.error ||
          `Connection failed (${response.status})`
        );
      }

      settings = {
        ...settings,
        provider,
        model,
        apiKey,
        endpoint,
        active: true
      };

      persistSettings();
      syncSettingsUI();

      alert(
        `Connection berhasil.\n\n${
          PROVIDERS[provider]?.name ||
          provider
        } · ${model}`
      );
    } catch (error) {
      console.error(
        "CONNECTION TEST ERROR:",
        error
      );

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

    const provider =
      settings.provider ||
      "openai";

    let model =
      settings.model ||
      "";

    let endpoint =
      settings.endpoint ||
      "";

    model =
      normalizeModel(
        provider,
        model
      );

    if (!settings.apiKey) {
      showView("settings");

      alert(
        "AI belum aktif.\n\nMasukkan API Key di Settings lalu Save Settings."
      );

      return;
    }

    if (!model) {
      showView("settings");

      alert(
        "Model belum dipilih."
      );

      return;
    }

    /*
     * Gemini endpoint is generated
     * by backend.
     */

    if (
      provider === "gemini" ||
      provider === "google" ||
      provider === "google-gemini"
    ) {
      model =
        normalizeGeminiModel(
          model
        );

      endpoint = "";
    }

    settings.active = true;
    settings.model = model;
    settings.endpoint = endpoint;

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
      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              message,

              provider,

              model,

              apiKey:
                settings.apiKey,

              endpoint
            })
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

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

      const reply =
        data.reply ||
        data.message ||
        data.content;

      if (!reply) {
        throw new Error(
          "Backend tidak mengembalikan reply."
        );
      }

      if (pending) {
        pending.textContent =
          String(reply);
      }
    } catch (error) {
      console.error(
        "SEND MESSAGE ERROR:",
        error
      );

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
   * NAVIGATION EVENTS
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
   * CHAT EVENTS
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
   * SETTINGS EVENTS
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

          if (
            !current ||
            current === previous
          ) {
            $("model").value =
              config.model;
          }

          /*
           * Gemini migration.
           */

          if (
            selected === "gemini" ||
            selected === "google" ||
            selected === "google-gemini"
          ) {
            $("model").value =
              normalizeGeminiModel(
                $("model").value
              ) ||
              "gemini-3.6-flash";

            if ($("endpoint")) {
              $("endpoint").value =
                "";
            }
          }

          settings.provider =
            selected;
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
        /*
         * Cmd/Ctrl + K
         * Focus prompt.
         */

        if (
          (event.metaKey ||
            event.ctrlKey) &&
          event.key.toLowerCase() ===
            "k"
        ) {
          event.preventDefault();

          $("prompt")?.focus();
        }

        /*
         * Escape
         * Clear prompt.
         */

        if (
          event.key === "Escape" &&
          document.activeElement ===
            $("prompt")
        ) {
          $("prompt").value = "";
        }
      }
    );
  }

  /*
   * =========================================================
   * INITIALIZE
   * =========================================================
   */

  function init() {
    /*
     * Persist migrated settings.
     */
    persistSettings();

    syncSettingsUI();

    setupNavigation();

    setupChat();

    setupNewChat();

    setupSettings();

    setupTheme();

    setupKeyboardShortcuts();

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
