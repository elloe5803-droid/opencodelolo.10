(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

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
      model: "gemini-2.5-flash",
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

  const DEFAULTS = {
    provider: "openai",
    model: "gpt-4.1-mini",
    apiKey: "",
    endpoint: "",
    active: false
  };

  let settings = loadSettings();
  let messages = [];

  function loadSettings() {
    try {
      const saved = JSON.parse(
        localStorage.getItem("ocl_settings") || "{}"
      );

      return {
        ...DEFAULTS,
        ...saved
      };
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

  function saveSettings() {
    const provider =
      $("provider")?.value ||
      "openai";

    const model =
      $("model")?.value.trim() ||
      "";

    const apiKey =
      $("apiKey")?.value.trim() ||
      "";

    const endpoint =
      $("endpoint")?.value.trim() ||
      "";

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

    if (
      settings.active
    ) {
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

  function setProvider(provider) {
    const config =
      PROVIDERS[provider];

    if (!config) return;

    settings.provider =
      provider;

    const model =
      $("model")?.value.trim() ||
      "";

    if (
      !model ||
      model ===
        PROVIDERS[
          settings.provider
        ]?.model
    ) {
      if ($("model")) {
        $("model").value =
          config.model;
      }
    }

    if (
      $("endpoint") &&
      config.endpoint
    ) {
      $("endpoint").value =
        config.endpoint;
    }
  }

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

              provider:
                settings.provider,

              model:
                settings.model,

              apiKey:
                settings.apiKey,

              endpoint:
                settings.endpoint,

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

      settings.active = true;

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

              provider:
                settings.provider,

              model:
                settings.model,

              apiKey:
                settings.apiKey,

              endpoint:
                settings.endpoint
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
            value;

          if ($("model")) {
            $("model").value =
              value;
          }

          persistSettings();
        }
      );
    }
  }

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
        }
      }
    );
  }

  function init() {
    setupNavigation();
    setupChat();
    setupNewChat();
    setupSettings();
    setupTheme();
    setupKeyboardShortcuts();
    syncSettingsUI();
  }

  window.OpenCodeLolo = {
    sendMessage,
    saveSettings,
    testConnection,
    clearChat,
    showView,

    getSettings() {
      return {
        ...settings
      };
    }
  };

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
