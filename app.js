/* =========================================================
   OpenCode Lolo - app.js
   Frontend controller
   ========================================================= */

(() => {
  "use strict";

  const STORAGE_KEY = "opencode-lolo";

  const DEFAULT_STATE = {
    provider: "openai",
    apiKey: "",
    model: "gpt-4o-mini",
    temperature: 0.2,
    systemPrompt:
      "You are an expert coding assistant. Help the user write, debug, explain and improve code.",
    enterToSend: true,
    theme: "dark",
    compactMode: false,
    conversations: [],
    currentConversation: null
  };

  const PROVIDERS = {
    openai: {
      name: "OpenAI",
      endpoint: "https://api.openai.com/v1/chat/completions",
      models: [
        "gpt-4o-mini",
        "gpt-4o",
        "gpt-4.1-mini",
        "gpt-4.1"
      ]
    },

    gemini: {
      name: "Google Gemini",
      models: [
        "gemini-2.0-flash",
        "gemini-2.5-flash"
      ]
    },

    openrouter: {
      name: "OpenRouter",
      endpoint:
        "https://openrouter.ai/api/v1/chat/completions",
      models: [
        "openrouter/free"
      ]
    }
  };

  let state = loadState();

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return structuredClone(DEFAULT_STATE);
      }

      return {
        ...structuredClone(DEFAULT_STATE),
        ...JSON.parse(saved)
      };
    } catch {
      return structuredClone(DEFAULT_STATE);
    }
  }

  function saveState() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  }

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return [...root.querySelectorAll(selector)];
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function uuid() {
    if (crypto?.randomUUID) {
      return crypto.randomUUID();
    }

    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2)
    );
  }

  function toast(message) {
    let element = $("#lolo-toast");

    if (!element) {
      element = document.createElement("div");
      element.id = "lolo-toast";

      element.style.cssText = `
        position:fixed;
        left:50%;
        bottom:24px;
        transform:translateX(-50%);
        z-index:100000;
        padding:11px 16px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:10px;
        background:#18181b;
        color:#fff;
        font:14px system-ui,sans-serif;
        box-shadow:0 15px 45px rgba(0,0,0,.35);
        max-width:90vw;
      `;

      document.body.appendChild(element);
    }

    element.textContent = message;
    element.hidden = false;

    clearTimeout(element._timer);

    element._timer = setTimeout(() => {
      element.hidden = true;
    }, 2600);
  }

  function injectStyles() {
    if ($("#lolo-runtime-styles")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "lolo-runtime-styles";

    style.textContent = `
      body.lolo-dark {
        color-scheme:dark;
      }

      body.lolo-light {
        color-scheme:light;
      }

      .lolo-modal {
        position:fixed;
        inset:0;
        z-index:99990;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:14px;
      }

      .lolo-backdrop {
        position:absolute;
        inset:0;
        background:rgba(0,0,0,.65);
        backdrop-filter:blur(5px);
      }

      .lolo-dialog {
        position:relative;
        width:min(720px,100%);
        max-height:92vh;
        overflow:auto;
        border:1px solid #3f3f46;
        border-radius:14px;
        background:#18181b;
        color:#fafafa;
        box-shadow:0 25px 80px rgba(0,0,0,.5);
      }

      .lolo-dialog-header {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:14px 16px;
        border-bottom:1px solid #27272a;
        position:sticky;
        top:0;
        z-index:2;
        background:#18181b;
      }

      .lolo-dialog-header button {
        border:0;
        background:transparent;
        color:#a1a1aa;
        font-size:25px;
        cursor:pointer;
      }

      .lolo-dialog-body {
        padding:16px;
      }

      .lolo-dialog-actions {
        display:flex;
        justify-content:flex-end;
        gap:8px;
        padding:12px 16px;
        border-top:1px solid #27272a;
      }

      .lolo-btn {
        border:1px solid #3f3f46;
        border-radius:8px;
        padding:9px 13px;
        background:#27272a;
        color:#fff;
        cursor:pointer;
      }

      .lolo-btn:hover {
        background:#3f3f46;
      }

      .lolo-btn.primary {
        background:#fafafa;
        color:#18181b;
      }

      .lolo-input,
      .lolo-select,
      .lolo-textarea {
        width:100%;
        box-sizing:border-box;
        border:1px solid #3f3f46;
        border-radius:8px;
        background:#09090b;
        color:#fafafa;
        padding:10px;
        outline:none;
        font:inherit;
      }

      .lolo-textarea {
        min-height:120px;
        resize:vertical;
      }

      .lolo-field {
        display:flex;
        flex-direction:column;
        gap:7px;
        margin-bottom:15px;
      }

      .lolo-field label {
        font-size:13px;
        font-weight:600;
      }

      .lolo-field small {
        color:#a1a1aa;
      }

      .lolo-setting-row {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:20px;
        padding:14px 0;
        border-bottom:1px solid #27272a;
      }

      .lolo-setting-row span {
        display:flex;
        flex-direction:column;
        gap:4px;
      }

      .lolo-setting-row small {
        color:#a1a1aa;
      }

      .lolo-menu {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
      }

      .lolo-menu button {
        min-height:85px;
        border:1px solid #3f3f46;
        border-radius:10px;
        background:#18181b;
        color:#fff;
        cursor:pointer;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:7px;
        font-size:20px;
      }

      .lolo-menu button span {
        font-size:13px;
      }

      .lolo-file-list,
      .lolo-history-list {
        display:flex;
        flex-direction:column;
        gap:5px;
      }

      .lolo-file,
      .lolo-history {
        width:100%;
        display:flex;
        align-items:center;
        gap:10px;
        padding:10px;
        border:0;
        border-radius:8px;
        background:transparent;
        color:#e4e4e7;
        text-align:left;
        cursor:pointer;
      }

      .lolo-file:hover,
      .lolo-history:hover {
        background:#27272a;
      }

      .lolo-terminal {
        background:#09090b;
        border:1px solid #27272a;
        border-radius:9px;
        overflow:hidden;
      }

      .lolo-terminal-output {
        min-height:42vh;
        max-height:55vh;
        overflow:auto;
        padding:14px;
        color:#d4d4d8;
        white-space:pre-wrap;
        font:13px/1.6 monospace;
      }

      .lolo-terminal-input {
        display:flex;
        align-items:center;
        gap:8px;
        padding:10px;
        border-top:1px solid #27272a;
      }

      .lolo-terminal-input input {
        flex:1;
        min-width:0;
        border:0;
        outline:0;
        background:transparent;
        color:#fff;
        font:13px monospace;
      }

      .lolo-code-editor {
        width:100%;
        min-height:60vh;
        box-sizing:border-box;
        resize:vertical;
        border:1px solid #27272a;
        border-radius:9px;
        padding:14px;
        background:#09090b;
        color:#e4e4e7;
        font:13px/1.6 monospace;
        outline:0;
      }

      .lolo-search-results {
        max-height:55vh;
        overflow:auto;
      }

      .lolo-search-result {
        padding:11px;
        border-bottom:1px solid #27272a;
        cursor:pointer;
      }

      .lolo-search-result:hover {
        background:#27272a;
      }

      body.lolo-compact .message,
      body.lolo-compact .chat-message {
        margin-top:4px !important;
        margin-bottom:4px !important;
      }

      @media(max-width:600px) {
        .lolo-modal {
          padding:7px;
          align-items:flex-end;
        }

        .lolo-dialog {
          max-height:95vh;
          border-radius:14px 14px 8px 8px;
        }

        .lolo-menu {
          grid-template-columns:1fr 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function applySettings() {
    document.body.classList.toggle(
      "lolo-dark",
      state.theme === "dark"
    );

    document.body.classList.toggle(
      "lolo-light",
      state.theme === "light"
    );

    document.body.classList.toggle(
      "lolo-compact",
      state.compactMode
    );
  }

  function createModal(
    title,
    body,
    actions = ""
  ) {
    closeModal();

    const modal = document.createElement("div");

    modal.className = "lolo-modal";

    modal.innerHTML = `
      <div class="lolo-backdrop"></div>

      <div class="lolo-dialog">
        <div class="lolo-dialog-header">
          <strong>${escapeHTML(title)}</strong>

          <button
            type="button"
            data-close-modal
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div class="lolo-dialog-body">
          ${body}
        </div>

        ${
          actions
            ? `
              <div class="lolo-dialog-actions">
                ${actions}
              </div>
            `
            : ""
        }
      </div>
    `;

    document.body.appendChild(modal);

    modal
      .querySelector("[data-close-modal]")
      ?.addEventListener(
        "click",
        closeModal
      );

    modal
      .querySelector(".lolo-backdrop")
      ?.addEventListener(
        "click",
        closeModal
      );

    return modal;
  }

  function closeModal() {
    $(".lolo-modal")?.remove();
  }

  /* =========================================================
     CHAT
     ========================================================= */

  function findChatInput() {
    return (
      $("#message-input") ||
      $("#chat-input") ||
      $("textarea[name='message']") ||
      $("textarea")
    );
  }

  function findMessagesContainer() {
    return (
      $("#messages") ||
      $("#chat-messages") ||
      $(".messages") ||
      $(".chat-messages")
    );
  }

  function renderMessage(role, content) {
    const container =
      findMessagesContainer();

    if (!container) {
      return;
    }

    const message = document.createElement("div");

    message.className =
      role === "user"
        ? "message user-message chat-message"
        : "message assistant-message chat-message";

    message.dataset.role = role;

    message.innerHTML = `
      <div class="message-role">
        ${role === "user" ? "You" : "AI"}
      </div>

      <div class="message-content">
        ${escapeHTML(content)}
      </div>
    `;

    container.appendChild(message);

    container.scrollTop =
      container.scrollHeight;
  }

  function clearRenderedChat() {
    const container =
      findMessagesContainer();

    if (container) {
      container.innerHTML = "";
    }
  }

  function getConversation() {
    if (!state.currentConversation) {
      const conversation = {
        id: uuid(),
        title: "New Chat",
        createdAt: Date.now(),
        messages: []
      };

      state.conversations.unshift(
        conversation
      );

      state.currentConversation =
        conversation.id;

      saveState();
    }

    return state.conversations.find(
      (conversation) =>
        conversation.id ===
        state.currentConversation
    );
  }

  function addConversationMessage(
    role,
    content
  ) {
    const conversation =
      getConversation();

    conversation.messages.push({
      role,
      content,
      timestamp: Date.now()
    });

    if (
      conversation.title === "New Chat" &&
      role === "user"
    ) {
      conversation.title =
        content.slice(0, 45);
    }

    saveState();
  }

  function renderCurrentConversation() {
    clearRenderedChat();

    const conversation =
      getConversation();

    for (const message of conversation.messages) {
      renderMessage(
        message.role,
        message.content
      );
    }
  }

  async function sendMessage() {
    const input = findChatInput();

    if (!input) {
      toast("Input chat tidak ditemukan");
      return;
    }

    const message =
      input.value.trim();

    if (!message) {
      return;
    }

    if (!state.apiKey) {
      toast(
        "Masukkan API key di Settings terlebih dahulu."
      );

      showSettings();

      return;
    }

    input.value = "";

    renderMessage("user", message);

    addConversationMessage(
      "user",
      message
    );

    const loading = document.createElement(
      "div"
    );

    loading.className =
      "message assistant-message chat-message";

    loading.innerHTML = `
      <div class="message-role">AI</div>
      <div class="message-content">
        Thinking…
      </div>
    `;

    const container =
      findMessagesContainer();

    container?.appendChild(loading);

    if (container) {
      container.scrollTop =
        container.scrollHeight;
    }

    try {
      const reply =
        await requestAI(message);

      loading.remove();

      renderMessage(
        "assistant",
        reply
      );

      addConversationMessage(
        "assistant",
        reply
      );

    } catch (error) {
      loading.remove();

      const message =
        error?.message ||
        "AI request failed";

      renderMessage(
        "assistant",
        `❌ ${message}`
      );

      toast(message);
    }
  }

  async function requestAI(message) {
    const provider =
      PROVIDERS[state.provider];

    if (!provider) {
      throw new Error(
        "Provider tidak dikenal"
      );
    }

    const conversation =
      getConversation();

    const messages = [
      {
        role: "system",
        content: state.systemPrompt
      },

      ...conversation.messages.map(
        (item) => ({
          role: item.role,
          content: item.content
        })
      )
    ];

    /*
      Gemini memakai endpoint berbeda.
    */

    if (state.provider === "gemini") {
      return requestGemini(
        message,
        messages
      );
    }

    const response =
      await fetch(provider.endpoint, {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${state.apiKey}`
        },

        body: JSON.stringify({
          model: state.model,
          messages,
          temperature:
            Number(state.temperature)
        })
      });

    const data =
      await response.json()
        .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        `Provider error ${response.status}`
      );
    }

    const reply =
      data?.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error(
        "Provider tidak mengembalikan jawaban."
      );
    }

    return reply;
  }

  async function requestGemini(
    message,
    messages
  ) {
    const contents = messages
      .filter(
        (item) =>
          item.role !== "system"
      )
      .map((item) => ({
        role:
          item.role === "assistant"
            ? "model"
            : "user",

        parts: [
          {
            text: item.content
          }
        ]
      }));

    const systemInstruction =
      state.systemPrompt
        ? {
            parts: [
              {
                text: state.systemPrompt
              }
            ]
          }
        : undefined;

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        state.model
      )}:generateContent?key=${encodeURIComponent(
        state.apiKey
      )}`;

    const response =
      await fetch(url, {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          systemInstruction,
          contents,

          generationConfig: {
            temperature:
              Number(state.temperature)
          }
        })
      });

    const data =
      await response.json()
        .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        `Gemini error ${response.status}`
      );
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("") ||
      "";

    if (!reply) {
      throw new Error(
        "Gemini tidak mengembalikan jawaban."
      );
    }

    return reply;
  }

  /* =========================================================
     SETTINGS
     ========================================================= */

  function showSettings() {
    const provider =
      PROVIDERS[state.provider];

    const models =
      provider?.models || [];

    const modal = createModal(
      "Settings",

      `
        <div class="lolo-field">
          <label>AI Provider</label>

          <select
            id="lolo-provider"
            class="lolo-select"
          >
            <option value="openai">
              OpenAI
            </option>

            <option value="gemini">
              Google Gemini
            </option>

            <option value="openrouter">
              OpenRouter
            </option>
          </select>
        </div>

        <div class="lolo-field">
          <label>API Key</label>

          <input
            id="lolo-api-key"
            class="lolo-input"
            type="password"
            autocomplete="off"
            placeholder="Masukkan API key milik kamu"
          />

          <small>
            Key disimpan di browser perangkat ini.
          </small>
        </div>

        <div class="lolo-field">
          <label>Model</label>

          <select
            id="lolo-model"
            class="lolo-select"
          ></select>
        </div>

        <div class="lolo-field">
          <label>Temperature</label>

          <input
            id="lolo-temperature"
            class="lolo-input"
            type="number"
            min="0"
            max="2"
            step="0.1"
          />
        </div>

        <div class="lolo-field">
          <label>System Prompt</label>

          <textarea
            id="lolo-system-prompt"
            class="lolo-textarea"
          ></textarea>
        </div>

        <label class="lolo-setting-row">
          <span>
            <b>Enter to send</b>
            <small>
              Enter mengirim pesan.
            </small>
          </span>

          <input
            id="lolo-enter"
            type="checkbox"
          />
        </label>

        <label class="lolo-setting-row">
          <span>
            <b>Compact mode</b>
            <small>
              Tampilan lebih padat.
            </small>
          </span>

          <input
            id="lolo-compact"
            type="checkbox"
          />
        </label>

        <label class="lolo-setting-row">
          <span>
            <b>Dark mode</b>
            <small>
              Gunakan tema gelap.
            </small>
          </span>

          <input
            id="lolo-dark"
            type="checkbox"
          />
        </label>
      `,

      `
        <button
          id="lolo-test-provider"
          class="lolo-btn"
          type="button"
        >
          Test Connection
        </button>

        <button
          id="lolo-save-settings"
          class="lolo-btn primary"
          type="button"
        >
          Save
        </button>
      `
    );

    const providerSelect =
      $("#lolo-provider", modal);

    const apiKey =
      $("#lolo-api-key", modal);

    const modelSelect =
      $("#lolo-model", modal);

    const temperature =
      $("#lolo-temperature", modal);

    const systemPrompt =
      $("#lolo-system-prompt", modal);

    const enter =
      $("#lolo-enter", modal);

    const compact =
      $("#lolo-compact", modal);

    const dark =
      $("#lolo-dark", modal);

    providerSelect.value =
      state.provider;

    apiKey.value =
      state.apiKey;

    temperature.value =
      state.temperature;

    systemPrompt.value =
      state.systemPrompt;

    enter.checked =
      state.enterToSend;

    compact.checked =
      state.compactMode;

    dark.checked =
      state.theme === "dark";

    function updateModels() {
      const selected =
        PROVIDERS[
          providerSelect.value
        ];

      modelSelect.innerHTML =
        (selected?.models || [])
          .map(
            (model) => `
              <option value="${escapeHTML(
                model
              )}">
                ${escapeHTML(model)}
              </option>
            `
          )
          .join("");

      if (
        selected?.models.includes(
          state.model
        )
      ) {
        modelSelect.value =
          state.model;
      }
    }

    updateModels();

    providerSelect.addEventListener(
      "change",
      () => {
        const selected =
          PROVIDERS[
            providerSelect.value
          ];

        state.provider =
          providerSelect.value;

        state.model =
          selected?.models?.[0] ||
          "";

        updateModels();
      }
    );

    $("#lolo-save-settings", modal)
      .addEventListener(
        "click",
        () => {
          state.provider =
            providerSelect.value;

          state.apiKey =
            apiKey.value.trim();

          state.model =
            modelSelect.value;

          state.temperature =
            Math.max(
              0,
              Math.min(
                2,
                Number(
                  temperature.value
                ) || 0.2
              )
            );

          state.systemPrompt =
            systemPrompt.value.trim();

          state.enterToSend =
            enter.checked;

          state.compactMode =
            compact.checked;

          state.theme =
            dark.checked
              ? "dark"
              : "light";

          saveState();
          applySettings();

          closeModal();

          toast(
            "Settings berhasil disimpan."
          );
        }
      );

    $("#lolo-test-provider", modal)
      .addEventListener(
        "click",
        async (event) => {
          const button =
            event.currentTarget;

          if (!apiKey.value.trim()) {
            toast(
              "Masukkan API key terlebih dahulu."
            );

            return;
          }

          button.disabled = true;
          button.textContent =
            "Testing…";

          try {
            const oldProvider =
              state.provider;

            const oldKey =
              state.apiKey;

            const oldModel =
              state.model;

            state.provider =
              providerSelect.value;

            state.apiKey =
              apiKey.value.trim();

            state.model =
              modelSelect.value;

            const reply =
              await requestAI(
                "Reply only with: CONNECTION_OK"
              );

            toast(
              reply.includes(
                "CONNECTION_OK"
              )
                ? "Connection berhasil."
                : "Provider merespons."
            );

            state.provider =
              oldProvider;

            state.apiKey =
              oldKey;

            state.model =
              oldModel;

          } catch (error) {
            toast(
              error?.message ||
              "Connection gagal."
            );
          } finally {
            button.disabled = false;
            button.textContent =
              "Test Connection";
          }
        }
      );
  }

  /* =========================================================
     MENU
     ========================================================= */

  function showMenu() {
    const modal = createModal(
      "OpenCode Lolo",

      `
        <div class="lolo-menu">

          <button
            type="button"
            data-menu="new-chat"
          >
            ➕
            <span>New Chat</span>
          </button>

          <button
            type="button"
            data-menu="history"
          >
            🕘
            <span>History</span>
          </button>

          <button
            type="button"
            data-menu="files"
          >
            📁
            <span>Files</span>
          </button>

          <button
            type="button"
            data-menu="terminal"
          >
            ⌘
            <span>Terminal</span>
          </button>

          <button
            type="button"
            data-menu="search"
          >
            🔎
            <span>Search</span>
          </button>

          <button
            type="button"
            data-menu="upload"
          >
            📎
            <span>Upload</span>
          </button>

          <button
            type="button"
            data-menu="settings"
          >
            ⚙️
            <span>Settings</span>
          </button>

          <button
            type="button"
            data-menu="clear"
          >
            🗑️
            <span>Clear Chat</span>
          </button>

        </div>
      `
    );

    $$("[data-menu]", modal)
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const action =
              button.dataset.menu;

            closeModal();

            if (
              action === "new-chat"
            ) {
              newChat();
            }

            if (
              action === "history"
            ) {
              showHistory();
            }

            if (
              action === "files"
            ) {
              loadFiles();
            }

            if (
              action === "terminal"
            ) {
              showTerminal();
            }

            if (
              action === "search"
            ) {
              showSearch();
            }

            if (
              action === "upload"
            ) {
              uploadFile();
            }

            if (
              action === "settings"
            ) {
              showSettings();
            }

            if (
              action === "clear"
            ) {
              clearChat();
            }
          }
        );
      });
  }

  /* =========================================================
     HISTORY
     ========================================================= */

  function newChat() {
    const conversation = {
      id: uuid(),
      title: "New Chat",
      createdAt: Date.now(),
      messages: []
    };

    state.conversations.unshift(
      conversation
    );

    state.currentConversation =
      conversation.id;

    saveState();
    clearRenderedChat();

    toast("Chat baru dibuat.");
  }

  function showHistory() {
    const conversations =
      state.conversations;

    const body = `
      <div class="lolo-history-list">

        ${
          conversations.length
            ? conversations
                .map(
                  (conversation) => `
                    <button
                      class="lolo-history"
                      data-conversation="${escapeHTML(
                        conversation.id
                      )}"
                      type="button"
                    >
                      <span>💬</span>

                      <span>
                        ${escapeHTML(
                          conversation.title
                        )}
                      </span>
                    </button>
                  `
                )
                .join("")
            : `
              <div style="opacity:.6">
                Belum ada history.
              </div>
            `
        }

      </div>
    `;

    const modal =
      createModal(
        "Chat History",
        body
      );

    $$(
      "[data-conversation]",
      modal
    ).forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          state.currentConversation =
            button.dataset.conversation;

          saveState();
          closeModal();

          renderCurrentConversation();
        }
      );
    });
  }

  function clearChat() {
    const conversation =
      getConversation();

    conversation.messages = [];

    saveState();
    clearRenderedChat();

    toast("Chat dibersihkan.");
  }

  /* =========================================================
     FILES
     ========================================================= */

  async function loadFiles() {
    try {
      const response =
        await fetch("/api/files");

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Gagal mengambil file."
        );
      }

      const files =
        Array.isArray(data.files)
          ? data.files
          : [];

      showFiles(files);

    } catch (error) {
      toast(
        error?.message ||
        "API Files belum tersedia."
      );
    }
  }

  function showFiles(files) {
    const body = `
      <div class="lolo-file-list">

        ${
          files.length
            ? files
                .map(
                  (file) => `
                    <button
                      class="lolo-file"
                      data-file="${escapeHTML(
                        file
                      )}"
                      type="button"
                    >
                      📄
                      <span>
                        ${escapeHTML(file)}
                      </span>
                    </button>
                  `
                )
                .join("")
            : `
              <div style="opacity:.6">
                Tidak ada file yang dikembalikan API.
              </div>
            `
        }

      </div>
    `;

    const modal =
      createModal(
        "Project Files",
        body
      );

    $$("[data-file]", modal)
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            openFile(
              button.dataset.file
            );
          }
        );
      });
  }

  async function openFile(filename) {
    try {
      const response =
        await fetch(
          `/api/file?file=${encodeURIComponent(
            filename
          )}`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Gagal membuka file."
        );
      }

      showEditor(
        filename,
        data.content || ""
      );

    } catch (error) {
      toast(
        error?.message ||
        "File API belum tersedia."
      );
    }
  }

  function showEditor(
    filename,
    content
  ) {
    const modal =
      createModal(
        filename,

        `
          <textarea
            id="lolo-editor"
            class="lolo-code-editor"
            spellcheck="false"
          >${escapeHTML(
            content
          )}</textarea>
        `,

        `
          <button
            id="lolo-copy-code"
            class="lolo-btn"
            type="button"
          >
            Copy
          </button>

          <button
            id="lolo-save-file"
            class="lolo-btn primary"
            type="button"
          >
            Save
          </button>
        `
      );

    $("#lolo-copy-code", modal)
      .addEventListener(
        "click",
        async () => {
          try {
            await navigator.clipboard.writeText(
              $("#lolo-editor", modal)
                .value
            );

            toast(
              "Kode berhasil disalin."
            );
          } catch {
            toast(
              "Clipboard tidak tersedia."
            );
          }
        }
      );

    $("#lolo-save-file", modal)
      .addEventListener(
        "click",
        () => {
          toast(
            "Editor siap. Endpoint penyimpanan file perlu dibuat di backend."
          );
        }
      );
  }

  /* =========================================================
     SEARCH
     ========================================================= */

  function showSearch() {
    const modal =
      createModal(
        "Search",

        `
          <div class="lolo-field">
            <input
              id="lolo-search"
              class="lolo-input"
              placeholder="Cari percakapan..."
              autocomplete="off"
            />
          </div>

          <div
            id="lolo-search-results"
            class="lolo-search-results"
          ></div>
        `
      );

    const input =
      $("#lolo-search", modal);

    const results =
      $("#lolo-search-results", modal);

    function search() {
      const query =
        input.value
          .trim()
          .toLowerCase();

      const found = [];

      for (
        const conversation
        of state.conversations
      ) {
        for (
          const message
          of conversation.messages
        ) {
          if (
            message.content
              .toLowerCase()
              .includes(query)
          ) {
            found.push({
              conversation,
              message
            });
          }
        }
      }

      results.innerHTML =
        found.length
          ? found
              .slice(0, 50)
              .map(
                (item) => `
                  <div
                    class="lolo-search-result"
                    data-search-conversation="${escapeHTML(
                      item.conversation.id
                    )}"
                  >
                    <b>
                      ${escapeHTML(
                        item.conversation.title
                      )}
                    </b>

                    <div style="margin-top:5px;opacity:.7">
                      ${escapeHTML(
                        item.message.content.slice(
                          0,
                          180
                        )
                      )}
                    </div>
                  </div>
                `
              )
              .join("")
          : `
            <div style="opacity:.6">
              ${query ? "Tidak ditemukan." : "Ketik untuk mencari."}
            </div>
          `;

      $$(
        "[data-search-conversation]",
        modal
      ).forEach((element) => {
        element.addEventListener(
          "click",
          () => {
            state.currentConversation =
              element.dataset.searchConversation;

            saveState();
            closeModal();

            renderCurrentConversation();
          }
        );
      });
    }

    input.addEventListener(
      "input",
      search
    );

    setTimeout(
      () => input.focus(),
      50
    );
  }

  /* =========================================================
     UPLOAD
     ========================================================= */

  function uploadFile() {
    const input =
      document.createElement("input");

    input.type = "file";
    input.multiple = true;

    input.addEventListener(
      "change",
      async () => {
        const files =
          [...input.files];

        if (!files.length) {
          return;
        }

        for (const file of files) {
          try {
            const text =
              await file.text();

            addConversationMessage(
              "user",
              `File uploaded: ${file.name}\n\n${text}`
            );

            renderMessage(
              "user",
              `📎 ${file.name}`
            );

          } catch {
            toast(
              `Gagal membaca ${file.name}`
            );
          }
        }

        toast(
          `${files.length} file dibaca.`
        );
      }
    );

    input.click();
  }

  /* =========================================================
     TERMINAL
     ========================================================= */

  function showTerminal() {
    const modal =
      createModal(
        "Terminal",

        `
          <div class="lolo-terminal">

            <div
              id="lolo-terminal-output"
              class="lolo-terminal-output"
            >OpenCode Lolo Web Terminal

Ketik "help" untuk melihat command.
</div>

            <div class="lolo-terminal-input">
              <span>›</span>

              <input
                id="lolo-terminal-command"
                autocomplete="off"
                spellcheck="false"
                placeholder="command..."
              />
            </div>

          </div>
        `
      );

    const output =
      $("#lolo-terminal-output", modal);

    const input =
      $("#lolo-terminal-command", modal);

    function write(text) {
      output.textContent +=
        `\n${text}`;

      output.scrollTop =
        output.scrollHeight;
    }

    input.addEventListener(
      "keydown",
      async (event) => {
        if (
          event.key !== "Enter"
        ) {
          return;
        }

        const command =
          input.value.trim();

        if (!command) {
          return;
        }

        input.value = "";

        write(`$ ${command}`);

        await executeTerminalCommand(
          command,
          write
        );
      }
    );

    setTimeout(
      () => input.focus(),
      50
    );
  }

  async function executeTerminalCommand(
    command,
    write
  ) {
    const parts =
      command.split(/\s+/);

    const cmd =
      parts[0].toLowerCase();

    if (cmd === "help") {
      write(
        [
          "Available:",
          "  help",
          "  clear",
          "  pwd",
          "  date",
          "  files"
        ].join("\n")
      );

      return;
    }

    if (cmd === "clear") {
      const output =
        $("#lolo-terminal-output");

      if (output) {
        output.textContent = "";
      }

      return;
    }

    if (cmd === "pwd") {
      write("/");
      return;
    }

    if (cmd === "date") {
      write(
        new Date().toString()
      );

      return;
    }

    if (cmd === "files") {
      try {
        const response =
          await fetch("/api/files");

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
            "Files API error"
          );
        }

        write(
          Array.isArray(data.files)
            ? data.files.join("\n")
            : "Tidak ada file."
        );

      } catch (error) {
        write(
          `ERROR: ${
            error?.message ||
            "Files API belum tersedia"
          }`
        );
      }

      return;
    }

    write(
      `Command "${cmd}" belum tersedia.`
    );
  }

  /* =========================================================
     EVENT BINDING
     ========================================================= */

  function bindEvents() {
    document.addEventListener(
      "click",
      (event) => {
        const target =
          event.target.closest(
            "[data-action]"
          );

        if (!target) {
          return;
        }

        const action =
          target.dataset.action;

        if (
          action === "send"
        ) {
          event.preventDefault();
          sendMessage();
        }

        if (
          action === "settings"
        ) {
          event.preventDefault();
          showSettings();
        }

        if (
          action === "terminal"
        ) {
          event.preventDefault();
          showTerminal();
        }

        if (
          action === "files"
        ) {
          event.preventDefault();
          loadFiles();
        }

        if (
          action === "menu"
        ) {
          event.preventDefault();
          showMenu();
        }

        if (
          action === "history"
        ) {
          event.preventDefault();
          showHistory();
        }

        if (
          action === "new-chat"
        ) {
          event.preventDefault();
          newChat();
        }
      }
    );

    document.addEventListener(
      "keydown",
      (event) => {
        const input =
          event.target.closest(
            "#message-input, #chat-input, textarea[name='message']"
          );

        if (!input) {
          return;
        }

        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          state.enterToSend
        ) {
          event.preventDefault();
          sendMessage();
        }
      }
    );
  }

  /* =========================================================
     INITIALIZATION
     ========================================================= */

  function init() {
    injectStyles();
    applySettings();
    bindEvents();

    /*
      Pastikan selalu ada conversation.
    */
    getConversation();

    /*
      Jika history tersedia,
      tampilkan chat terakhir.
    */
    renderCurrentConversation();
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

  /*
    Expose beberapa fungsi supaya
    HTML lama tetap bisa memanggilnya.
  */
  window.OpenCodeLolo = {
    sendMessage,
    showSettings,
    showTerminal,
    loadFiles,
    showHistory,
    showMenu,
    newChat,
    clearChat,
    uploadFile
  };
})();
