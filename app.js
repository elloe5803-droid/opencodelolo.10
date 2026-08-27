```javascript
"use strict";

/*
 * OPENCODELO.10
 * app.js
 *
 * Settings:
 * - Provider
 * - Model
 * - API Key
 * - Endpoint
 *
 * Frontend -> /api/chat
 *
 * Request:
 * {
 *   message,
 *   provider,
 *   model,
 *   apiKey,
 *   endpoint,
 *   files
 * }
 */

const OpenCodeLolo = (() => {

  const SETTINGS_KEY = "opencodelo.settings";
  const HISTORY_KEY = "opencodelo.history";

  const state = {
    busy: false,
    messages: [],
    files: [],
    currentView: "chat",

    settings: {
      provider: "gemini",
      model: "gemini-2.5-flash",
      apiKey: "",
      endpoint: ""
    }
  };

  /* =========================
     DOM
  ========================= */

  const $ = selector =>
    document.querySelector(selector);

  /* =========================
     SETTINGS
  ========================= */

  function loadSettings() {

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(
            SETTINGS_KEY
          ) || "null"
        );

      if (
        saved &&
        typeof saved === "object"
      ) {

        state.settings = {
          ...state.settings,
          ...saved
        };

      }

    } catch (error) {

      console.warn(
        "Settings load failed:",
        error
      );

    }

    return state.settings;
  }

  function saveSettings(settings) {

    state.settings = {
      ...state.settings,
      ...settings
    };

    try {

      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(
          state.settings
        )
      );

    } catch (error) {

      console.warn(
        "Settings save failed:",
        error
      );

    }

    updateProviderUI();
  }

  function getSettings() {

    loadSettings();

    return {
      provider:
        state.settings.provider ||
        "gemini",

      model:
        state.settings.model ||
        "gemini-2.5-flash",

      apiKey:
        state.settings.apiKey ||
        "",

      endpoint:
        state.settings.endpoint ||
        ""
    };
  }

  /* =========================
     PROVIDERS
  ========================= */

  const PROVIDERS = {

    gemini: {
      name: "Google Gemini",
      defaultModel:
        "gemini-2.5-flash",
      endpoint:
        "https://generativelanguage.googleapis.com/v1beta/models"
    },

    openai: {
      name: "OpenAI",
      defaultModel:
        "gpt-5",
      endpoint:
        "https://api.openai.com/v1/chat/completions"
    },

    deepseek: {
      name: "DeepSeek",
      defaultModel:
        "deepseek-chat",
      endpoint:
        "https://api.deepseek.com/chat/completions"
    },

    openrouter: {
      name: "OpenRouter",
      defaultModel:
        "openrouter/free",
      endpoint:
        "https://openrouter.ai/api/v1/chat/completions"
    }

  };

  function getProvider() {

    const settings =
      getSettings();

    return (
      PROVIDERS[
        settings.provider
      ]
      ? settings.provider
      : "gemini"
    );
  }

  function getProviderInfo() {

    return PROVIDERS[
      getProvider()
    ];
  }

  function updateProviderUI() {

    const settings =
      getSettings();

    const provider =
      $("#provider-select");

    const model =
      $("#model-select");

    const apiKey =
      $("#api-key-input");

    const endpoint =
      $("#endpoint-input");

    if (provider)
      provider.value =
        settings.provider;

    if (model)
      model.value =
        settings.model;

    if (apiKey)
      apiKey.value =
        settings.apiKey;

    if (endpoint)
      endpoint.value =
        settings.endpoint;

    const name =
      $("#provider-name");

    if (name) {

      name.textContent =
        getProviderInfo()?.name ||
        settings.provider;
    }

  }

  /* =========================
     SETTINGS UI
  ========================= */

  function openSettings() {

    const settings =
      getSettings();

    const overlay =
      $("#settings-overlay");

    if (!overlay) {

      createSettingsOverlay();

    }

    $("#settings-overlay")
      ?.classList.add("open");

    updateProviderUI();
  }

  function createSettingsOverlay() {

    const overlay =
      document.createElement("div");

    overlay.id =
      "settings-overlay";

    overlay.className =
      "overlay";

    overlay.innerHTML = `

      <div class="settings-panel">

        <div class="settings-header">

          <div>

            <div class="settings-title">
              Settings
            </div>

            <div class="settings-subtitle">
              OPENCODELO.10 AI Configuration
            </div>

          </div>

          <button
            id="settings-close"
            class="icon-button"
            type="button"
          >
            ×
          </button>

        </div>

        <div class="settings-body">

          <div class="setting-group">

            <label>
              Provider
            </label>

            <select
              id="provider-select"
              class="field"
            >

              <option value="gemini">
                Google Gemini
              </option>

              <option value="openai">
                OpenAI
              </option>

              <option value="deepseek">
                DeepSeek
              </option>

              <option value="openrouter">
                OpenRouter
              </option>

            </select>

          </div>

          <div class="setting-group">

            <label>
              Model
            </label>

            <input
              id="model-select"
              class="field"
              type="text"
              placeholder="gemini-2.5-flash"
              autocomplete="off"
            >

            <div class="setting-hint">
              Isi nama model sesuai provider.
            </div>

          </div>

          <div class="setting-group">

            <label>
              API Key
            </label>

            <div class="secret-field">

              <input
                id="api-key-input"
                class="field"
                type="password"
                placeholder="Masukkan API key..."
                autocomplete="off"
              >

              <button
                id="toggle-api-key"
                class="button"
                type="button"
              >
                Show
              </button>

            </div>

            <div class="setting-hint">
              Key disimpan secara lokal di browser.
            </div>

          </div>

          <div class="setting-group">

            <label>
              Endpoint
            </label>

            <input
              id="endpoint-input"
              class="field"
              type="url"
              placeholder="Default endpoint provider"
              autocomplete="off"
            >

            <div class="setting-hint">
              Kosongkan jika backend menggunakan
              endpoint default.
            </div>

          </div>

          <div class="settings-actions">

            <button
              id="settings-test"
              class="button"
              type="button"
            >
              Test Connection
            </button>

            <button
              id="settings-save"
              class="button primary"
              type="button"
            >
              Save Settings
            </button>

          </div>

          <div
            id="settings-status"
            class="settings-status"
          >
            Ready
          </div>

        </div>

      </div>
    `;

    document.body.appendChild(
      overlay
    );

    injectSettingsCSS();

    $("#settings-close")
      ?.addEventListener(
        "click",
        closeSettings
      );

    overlay.addEventListener(
      "click",
      event => {

        if (
          event.target === overlay
        ) {

          closeSettings();

        }

      }
    );

    $("#provider-select")
      ?.addEventListener(
        "change",
        onProviderChange
      );

    $("#toggle-api-key")
      ?.addEventListener(
        "click",
        toggleApiKey
      );

    $("#settings-save")
      ?.addEventListener(
        "click",
        saveSettingsFromUI
      );

    $("#settings-test")
      ?.addEventListener(
        "click",
        testConnection
      );

  }

  function injectSettingsCSS() {

    if (
      document.getElementById(
        "opencodelo-settings-css"
      )
    )
      return;

    const style =
      document.createElement("style");

    style.id =
      "opencodelo-settings-css";

    style.textContent = `

      #settings-overlay {
        position:fixed;
        inset:0;
        z-index:9999;
        display:none;
        align-items:center;
        justify-content:center;
        background:rgba(0,0,0,.72);
        backdrop-filter:blur(8px);
      }

      #settings-overlay.open {
        display:flex;
      }

      .settings-panel {
        width:min(520px, calc(100vw - 30px));
        max-height:calc(100vh - 30px);
        overflow:auto;
        background:#0d0d0d;
        border:1px solid #262626;
        border-radius:10px;
        box-shadow:0 25px 80px rgba(0,0,0,.65);
        color:#ddd;
      }

      .settings-header {
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:18px;
        border-bottom:1px solid #202020;
      }

      .settings-title {
        font-size:15px;
        font-weight:600;
      }

      .settings-subtitle {
        margin-top:4px;
        color:#666;
        font-size:10px;
      }

      .settings-body {
        padding:18px;
      }

      .setting-group {
        margin-bottom:18px;
      }

      .setting-group label {
        display:block;
        margin-bottom:7px;
        color:#aaa;
        font-size:10px;
      }

      .field {
        width:100%;
        min-height:36px;
        box-sizing:border-box;
        padding:0 10px;
        border:1px solid #292929;
        border-radius:5px;
        outline:none;
        background:#090909;
        color:#ddd;
        font-size:11px;
      }

      .field:focus {
        border-color:#444;
      }

      .secret-field {
        display:flex;
        gap:7px;
      }

      .secret-field .field {
        flex:1;
      }

      .button {
        min-height:34px;
        padding:0 12px;
        border:1px solid #292929;
        border-radius:5px;
        background:#111;
        color:#aaa;
        cursor:pointer;
        font-size:10px;
      }

      .button:hover {
        background:#181818;
        color:#ddd;
      }

      .button.primary {
        border-color:#ddd;
        background:#ddd;
        color:#080808;
      }

      .button.primary:hover {
        background:#fff;
      }

      .icon-button {
        width:30px;
        height:30px;
        border:0;
        background:transparent;
        color:#666;
        cursor:pointer;
        font-size:20px;
      }

      .settings-actions {
        display:flex;
        justify-content:flex-end;
        gap:8px;
        margin-top:22px;
      }

      .settings-status {
        margin-top:12px;
        padding:9px;
        border:1px solid #1c1c1c;
        border-radius:5px;
        color:#666;
        font-size:10px;
      }

      .setting-hint {
        margin-top:6px;
        color:#4e4e4e;
        font-size:9px;
        line-height:1.5;
      }

    `;

    document.head.appendChild(
      style
    );

  }

  function closeSettings() {

    $("#settings-overlay")
      ?.classList.remove("open");

  }

  function onProviderChange(event) {

    const provider =
      event.target.value;

    const info =
      PROVIDERS[provider];

    if (!info)
      return;

    const model =
      $("#model-select");

    const endpoint =
      $("#endpoint-input");

    if (
      model &&
      (
        !model.value.trim() ||
        Object.values(
          PROVIDERS
        ).some(
          p =>
            p.defaultModel ===
            model.value.trim()
        )
      )
    ) {

      model.value =
        info.defaultModel;

    }

    if (
      endpoint &&
      !endpoint.value.trim()
    ) {

      endpoint.value =
        info.endpoint;

    }

  }

  function toggleApiKey() {

    const input =
      $("#api-key-input");

    const button =
      $("#toggle-api-key");

    if (!input)
      return;

    if (
      input.type === "password"
    ) {

      input.type = "text";

      if (button)
        button.textContent =
          "Hide";

    } else {

      input.type = "password";

      if (button)
        button.textContent =
          "Show";

    }

  }

  function saveSettingsFromUI() {

    const provider =
      $("#provider-select")?.value ||
      "gemini";

    const model =
      $("#model-select")?.value.trim() ||
      PROVIDERS[
        provider
      ]?.defaultModel ||
      "";

    const apiKey =
      $("#api-key-input")?.value.trim() ||
      "";

    const endpoint =
      $("#endpoint-input")?.value.trim() ||
      "";

    saveSettings({
      provider,
      model,
      apiKey,
      endpoint
    });

    setSettingsStatus(
      "Settings saved."
    );

    toast(
      "AI settings saved"
    );

  }

  function setSettingsStatus(
    message,
    error = false
  ) {

    const element =
      $("#settings-status");

    if (!element)
      return;

    element.textContent =
      message;

    element.style.color =
      error
        ? "#d66"
        : "#777";

  }

  /* =========================
     CHAT
  ========================= */

  async function sendCurrentInput() {

    const input =
      $("#message-input");

    if (!input)
      return;

    await sendMessage(
      input.value
    );

  }

  async function sendMessage(message) {

    if (state.busy)
      return;

    message =
      String(message || "")
        .trim();

    if (!message) {

      toast(
        "Pesan masih kosong."
      );

      return;
    }

    const settings =
      getSettings();

    addMessage(
      "user",
      message
    );

    const input =
      $("#message-input");

    if (input) {

      input.value = "";

      input.style.height =
        "auto";
    }

    setBusy(true);

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

            body:
              JSON.stringify({

                message,

                provider:
                  settings.provider,

                model:
                  settings.model,

                apiKey:
                  settings.apiKey,

                endpoint:
                  settings.endpoint,

                files:
                  state.files.map(
                    file => ({
                      name:
                        file.name,
                      type:
                        file.type,
                      size:
                        file.size,
                      content:
                        file.content || ""
                    })
                  )

              })
          }
        );

      let data;

      try {

        data =
          await response.json();

      } catch {

        throw new Error(
          `Server mengembalikan response tidak valid (${response.status}).`
        );

      }

      if (!response.ok) {

        throw new Error(
          data?.error ||
          data?.message ||
          `HTTP ${response.status}`
        );

      }

      const reply =
        data?.reply ??
        data?.message ??
        data?.choices?.[0]
          ?.message
          ?.content;

      if (
        typeof reply !== "string" ||
        !reply.trim()
      ) {

        throw new Error(
          "Backend tidak mengembalikan jawaban AI."
        );

      }

      addMessage(
        "assistant",
        reply
      );

    } catch (error) {

      console.error(
        "AI error:",
        error
      );

      addMessage(
        "assistant",
        `❌ ${error.message}`
      );

      toast(
        error.message
      );

    } finally {

      setBusy(false);

    }

  }

  /* =========================
     TEST CONNECTION
  ========================= */

  async function testConnection() {

    /*
     * Simpan konfigurasi terbaru
     * terlebih dahulu supaya test
     * menggunakan nilai di Settings.
     */

    saveSettingsFromUI();

    const settings =
      getSettings();

    setSettingsStatus(
      "Testing connection..."
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

            body:
              JSON.stringify({

                message:
                  "Reply with exactly: CONNECTION_OK",

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

      let data;

      try {

        data =
          await response.json();

      } catch {

        throw new Error(
          `Invalid server response (${response.status})`
        );

      }

      if (!response.ok) {

        throw new Error(
          data?.error ||
          `HTTP ${response.status}`
        );

      }

      if (!data?.reply) {

        throw new Error(
          "AI tidak mengembalikan response."
        );

      }

      setSettingsStatus(
        `${settings.provider} connection OK`
      );

      toast(
        "AI connection OK"
      );

    } catch (error) {

      setSettingsStatus(
        `Connection failed: ${error.message}`,
        true
      );

      toast(
        `Connection failed`
      );

    }

  }

  /* =========================
     MESSAGES
  ========================= */

  function addMessage(
    role,
    content
  ) {

    state.messages.push({
      role,
      content,
      time: Date.now()
    });

    saveHistory();

    /*
     * Jika index.html mempunyai
     * fungsi UI sendiri.
     */

    if (
      window.LoloUI &&
      typeof window.LoloUI.addMessage ===
        "function"
    ) {

      window.LoloUI.addMessage(
        role,
        content
      );

    }

  }

  function saveHistory() {

    try {

      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(
          state.messages.slice(-100)
        )
      );

    } catch (error) {

      console.warn(
        "History save failed:",
        error
      );

    }

  }

  function loadHistory() {

    try {

      const data =
        JSON.parse(
          localStorage.getItem(
            HISTORY_KEY
          ) || "[]"
        );

      if (
        Array.isArray(data)
      ) {

        state.messages =
          data;

      }

    } catch (error) {

      console.warn(
        "History load failed:",
        error
      );

    }

  }

  /* =========================
     UI
  ========================= */

  function setBusy(value) {

    state.busy =
      Boolean(value);

    const button =
      $("#send-button");

    const input =
      $("#message-input");

    if (button)
      button.disabled =
        state.busy;

    if (input)
      input.disabled =
        state.busy;

    const status =
      $("#model-status");

    if (status) {

      status.textContent =
        state.busy
          ? "Thinking..."
          : `${getProvider()} · ${getSettings().model}`;

    }

  }

  function toast(message) {

    if (
      window.LoloUI &&
      typeof window.LoloUI.toast ===
        "function"
    ) {

      window.LoloUI.toast(
        message
      );

      return;
    }

    console.log(
      "[OPENCODELO]",
      message
    );

  }

  /* =========================
     FILES
  ========================= */

  function handleFiles(
    fileList
  ) {

    [
      ...fileList
    ].forEach(
      file => {

        const reader =
          new FileReader();

        const textFile =
          file.type.startsWith(
            "text/"
          ) ||
          /\.(js|jsx|ts|tsx|html|css|json|md|txt|py|java|php|go|rs|c|cpp|h|sql|xml|yaml|yml)$/i
            .test(
              file.name
            );

        if (!textFile) {

          state.files.push({
            name:
              file.name,
            type:
              file.type,
            size:
              file.size,
            content:
              ""
          });

          toast(
            `${file.name} added`
          );

          return;

        }

        reader.onload = () => {

          state.files.push({
            name:
              file.name,
            type:
              file.type,
            size:
              file.size,
            content:
              String(
                reader.result || ""
              )
          });

          toast(
            `${file.name} added`
          );

        };

        reader.onerror = () => {

          state.files.push({
            name:
              file.name,
            type:
              file.type,
            size:
              file.size,
            content:
              ""
          });

          toast(
            `${file.name} added`
          );

        };

        reader.readAsText(
          file
        );

      }
    );

  }

  /* =========================
     NAVIGATION
  ========================= */

  function openView(view) {

    state.currentView =
      view;

    document
      .querySelectorAll(
        "[data-view]"
      )
      .forEach(
        element => {

          element.classList.toggle(
            "active",
            element.dataset.view ===
              view
          );

        }
      );

    const title =
      $("#top-title");

    const names = {
      chat: "Chat",
      files: "Files",
      editor: "Editor",
      terminal: "Terminal",
      git: "Git",
      search: "Search"
    };

    if (title)
      title.textContent =
        names[view] ||
        view;

  }

  /* =========================
     INIT
  ========================= */

  function bindEvents() {

    /*
     * Send button
     */

    $("#send-button")
      ?.addEventListener(
        "click",
        sendCurrentInput
      );

    /*
     * Enter = send
     * Shift + Enter = newline
     */

    $("#message-input")
      ?.addEventListener(
        "keydown",
        event => {

          if (
            event.key === "Enter" &&
            !event.shiftKey
          ) {

            event.preventDefault();

            sendCurrentInput();

          }

        }
      );

    /*
     * File input
     */

    $("#file-input")
      ?.addEventListener(
        "change",
        event => {

          handleFiles(
            event.target.files
          );

          event.target.value =
            "";

        }
      );

    /*
     * Settings buttons
     */

    $("#settings-button")
      ?.addEventListener(
        "click",
        openSettings
      );

    $("#open-settings")
      ?.addEventListener(
        "click",
        openSettings
      );

    /*
     * Generic view buttons
     */

    document
      .querySelectorAll(
        "[data-view]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              openView(
                button.dataset.view
              );

            }
          );

        }
      );

  }

  function init() {

    loadSettings();

    loadHistory();

    bindEvents();

    /*
     * Create Settings only when
     * user opens it.
     */

    updateProviderUI();

    console.log(
      "OPENCODELO.10 ready",
      getSettings()
    );

  }

  return {

    init,

    sendMessage,

    sendCurrentInput,

    openSettings,

    saveSettings:
      saveSettingsFromUI,

    testConnection,

    newChat() {

      state.messages = [];

      saveHistory();

      toast(
        "New chat"
      );

    },

    upload() {

      $("#file-input")
        ?.click();

    },

    openView,

    getSettings,

    getProvider

  };

})();

window.OpenCodeLolo =
  OpenCodeLolo;

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      OpenCodeLolo.init();

    }
  );

} else {

  OpenCodeLolo.init();

}
```
