```javascript
"use strict";

/*
 * OPENCODELO.10
 *
 * Frontend:
 * index.html -> app.js -> /api/chat
 *
 * Settings:
 * provider
 * model
 * apiKey
 * endpoint
 *
 * API key berasal dari Settings.
 * Tidak ditanam langsung di source code.
 */

const OpenCodeLolo = (() => {

  const SETTINGS_KEY =
    "opencodelo.settings.v2";

  const HISTORY_KEY =
    "opencodelo.history.v2";

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

  const PROVIDERS = {

    gemini: {

      name: "Google Gemini",

      model:
        "gemini-2.5-flash",

      endpoint:
        "https://generativelanguage.googleapis.com/v1beta"

    },

    openai: {

      name: "OpenAI",

      model:
        "gpt-5",

      endpoint:
        "https://api.openai.com/v1/chat/completions"

    },

    deepseek: {

      name: "DeepSeek",

      model:
        "deepseek-chat",

      endpoint:
        "https://api.deepseek.com/chat/completions"

    },

    openrouter: {

      name: "OpenRouter",

      model:
        "openrouter/free",

      endpoint:
        "https://openrouter.ai/api/v1/chat/completions"

    }

  };

  const $ = selector =>
    document.querySelector(selector);

  /* =========================
     STORAGE
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
        "Settings load error:",
        error
      );

    }

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
        "Settings save error:",
        error
      );

    }

    updateStatus();

  }

  function loadHistory() {

    try {

      const history =
        JSON.parse(
          localStorage.getItem(
            HISTORY_KEY
          ) || "[]"
        );

      if (
        Array.isArray(history)
      ) {

        state.messages =
          history;

      }

    } catch (error) {

      console.warn(
        "History load error:",
        error
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
        "History save error:",
        error
      );

    }

  }

  /* =========================
     SETTINGS
  ========================= */

  function openSettings() {

    fillSettingsForm();

    $("#settings-overlay")
      ?.classList.add("open");

  }

  function closeSettings() {

    $("#settings-overlay")
      ?.classList.remove("open");

  }

  function fillSettingsForm() {

    const settings =
      state.settings;

    const provider =
      $("#provider-select");

    const model =
      $("#model-input");

    const key =
      $("#api-key-input");

    const endpoint =
      $("#endpoint-input");

    if (provider)
      provider.value =
        settings.provider;

    if (model)
      model.value =
        settings.model;

    if (key)
      key.value =
        settings.apiKey;

    if (endpoint)
      endpoint.value =
        settings.endpoint;

  }

  function providerChanged() {

    const provider =
      $("#provider-select")
        ?.value;

    const info =
      PROVIDERS[provider];

    if (!info)
      return;

    const model =
      $("#model-input");

    const endpoint =
      $("#endpoint-input");

    if (model) {

      model.value =
        info.model;

    }

    if (endpoint) {

      endpoint.value =
        info.endpoint;

    }

    setSettingsStatus(
      `${info.name} dipilih.`
    );

  }

  function saveSettingsFromUI() {

    const provider =
      $("#provider-select")
        ?.value ||
      "gemini";

    const model =
      $("#model-input")
        ?.value
        .trim() ||
      PROVIDERS[provider]?.model ||
      "";

    const apiKey =
      $("#api-key-input")
        ?.value
        .trim() ||
      "";

    const endpoint =
      $("#endpoint-input")
        ?.value
        .trim() ||
      "";

    saveSettings({

      provider,

      model,

      apiKey,

      endpoint

    });

    updateComposerModel();

    setSettingsStatus(
      "Settings berhasil disimpan."
    );

    toast(
      "AI settings saved"
    );

  }

  function toggleKey() {

    const input =
      $("#api-key-input");

    const button =
      $("#show-key-button");

    if (!input)
      return;

    if (
      input.type ===
      "password"
    ) {

      input.type =
        "text";

      if (button)
        button.textContent =
          "Hide";

    } else {

      input.type =
        "password";

      if (button)
        button.textContent =
          "Show";

    }

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
        ? "#b66"
        : "#666";

  }

  /* =========================
     STATUS
  ========================= */

  function updateStatus(
    connected = false
  ) {

    const settings =
      state.settings;

    const provider =
      PROVIDERS[
        settings.provider
      ];

    const dot =
      $("#connection-dot");

    const text =
      $("#connection-text");

    const modelStatus =
      $("#model-status");

    if (dot) {

      dot.classList.toggle(
        "online",
        connected ||
        Boolean(
          settings.apiKey
        )
      );

    }

    if (text) {

      text.textContent =
        settings.apiKey
          ? `${provider?.name || settings.provider} configured`
          : "Configure AI";

    }

    if (modelStatus) {

      modelStatus.textContent =
        settings.apiKey
          ? `${settings.provider} · ${settings.model}`
          : "Configure AI";

    }

  }

  /* =========================
     CHAT
  ========================= */

  async function sendCurrentInput() {

    const input =
      $("#message-input");

    if (!input)
      return;

    const message =
      input.value.trim();

    if (!message) {

      toast(
        "Tulis pesan terlebih dahulu."
      );

      return;

    }

    input.value = "";

    input.style.height =
      "auto";

    await sendMessage(
      message
    );

  }

  async function sendMessage(
    message
  ) {

    if (state.busy)
      return;

    message =
      String(
        message || ""
      ).trim();

    if (!message)
      return;

    /*
     * Kalau belum punya API key,
     * arahkan ke Settings.
     */

    if (
      !state.settings.apiKey
    ) {

      addMessage(
        "assistant",
        "⚠️ API key belum dikonfigurasi. Buka Settings → pilih provider → tempel API key → Save Settings."
      );

      openSettings();

      return;

    }

    addMessage(
      "user",
      message
    );

    setBusy(true);

    try {

      const settings =
        state.settings;

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
          `Response server tidak valid (${response.status}).`
        );

      }

      if (!response.ok) {

        throw new Error(

          data?.error ||
          data?.message ||
          `Request gagal (${response.status})`

        );

      }

      const reply =
        data?.reply ??
        data?.message ??
        data?.choices?.[0]
          ?.message
          ?.content;

      if (
        typeof reply !==
        "string" ||
        !reply.trim()
      ) {

        throw new Error(
          "Backend tidak memberikan jawaban AI."
        );

      }

      addMessage(
        "assistant",
        reply
      );

      updateStatus(true);

    } catch (error) {

      console.error(
        "CHAT ERROR:",
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

  function addMessage(
    role,
    content
  ) {

    state.messages.push({

      role,

      content,

      time:
        Date.now()

    });

    saveHistory();

    renderMessages();

  }

  function renderMessages() {

    const container =
      $("#messages");

    if (!container)
      return;

    if (
      state.messages.length === 0
    ) {

      container.innerHTML =
        getWelcomeHTML();

      bindSuggestions();

      return;

    }

    container.innerHTML = "";

    for (
      const message
      of state.messages
    ) {

      const element =
        document.createElement(
          "div"
        );

      element.className =
        `message ${message.role}`;

      const roleName =
        message.role ===
        "user"
          ? "You"
          : "OPENCODELO.10";

      element.innerHTML = `

        <div class="message-role">
          ${escapeHTML(roleName)}
        </div>

        <div class="message-content">
          ${escapeHTML(message.content)}
        </div>

      `;

      container.appendChild(
        element
      );

    }

    requestAnimationFrame(
      () => {

        container.scrollTop =
          container.scrollHeight;

      }
    );

  }

  function getWelcomeHTML() {

    return `

      <div class="welcome">

        <div class="welcome-mark">
          O10
        </div>

        <h1>
          What are you building?
        </h1>

        <p>
          Code. Debug. Explore. Ship.
        </p>

        <div class="suggestions">

          <button
            class="suggestion"
            data-suggestion="Build a complete modern responsive website from scratch."
            type="button"
          >

            <div class="suggestion-title">
              Build a website
            </div>

            <div class="suggestion-desc">
              Start a complete project from an idea.
            </div>

          </button>

          <button
            class="suggestion"
            data-suggestion="Analyze my project and find bugs, broken logic, and possible improvements."
            type="button"
          >

            <div class="suggestion-title">
              Analyze project
            </div>

            <div class="suggestion-desc">
              Find problems and improvements.
            </div>

          </button>

          <button
            class="suggestion"
            data-suggestion="Create a clean professional UI for my application."
            type="button"
          >

            <div class="suggestion-title">
              Design UI
            </div>

            <div class="suggestion-desc">
              Create a cleaner professional interface.
            </div>

          </button>

          <button
            class="suggestion"
            data-suggestion="Explain how I should structure this application and its files."
            type="button"
          >

            <div class="suggestion-title">
              Structure project
            </div>

            <div class="suggestion-desc">
              Plan architecture and files.
            </div>

          </button>

        </div>

      </div>

    `;

  }

  function bindSuggestions() {

    document
      .querySelectorAll(
        "[data-suggestion]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              const input =
                $("#message-input");

              if (!input)
                return;

              input.value =
                button.dataset
                  .suggestion;

              input.focus();

              input.dispatchEvent(
                new Event(
                  "input"
                )
              );

            }
          );

        }
      );

  }

  /* =========================
     CONNECTION
  ========================= */

  async function testConnection() {

    saveSettingsFromUI();

    const settings =
      state.settings;

    if (
      !settings.apiKey
    ) {

      setSettingsStatus(
        "API key belum diisi.",
        true
      );

      return;

    }

    setSettingsStatus(
      "Menghubungkan ke AI..."
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
                  "Reply with exactly CONNECTION_OK",

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
          `Server response invalid (${response.status})`
        );

      }

      if (!response.ok) {

        throw new Error(
          data?.error ||
          `HTTP ${response.status}`
        );

      }

      if (
        !data?.reply
      ) {

        throw new Error(
          "Tidak ada jawaban dari provider."
        );

      }

      setSettingsStatus(
        "✓ Connection berhasil."
      );

      updateStatus(true);

      toast(
        "AI connection OK"
      );

    } catch (error) {

      console.error(
        "CONNECTION ERROR:",
        error
      );

      setSettingsStatus(
        `✕ ${error.message}`,
        true
      );

      updateStatus(false);

    }

  }

  /* =========================
     FILES
  ========================= */

  function openUpload() {

    $("#file-input")
      ?.click();

  }

  function handleFiles(
    fileList
  ) {

    const files =
      Array.from(
        fileList || []
      );

    for (
      const file
      of files
    ) {

      const isText =
        file.type.startsWith(
          "text/"
        ) ||
        /\.(html?|css|js|jsx|ts|tsx|json|md|txt|py|java|php|go|rs|c|cpp|h|sql|xml|yaml|yml)$/i
          .test(
            file.name
          );

      if (!isText) {

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
          `${file.name} ditambahkan`
        );

        continue;

      }

      const reader =
        new FileReader();

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
          `${file.name} ditambahkan`
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

      };

      reader.readAsText(
        file
      );

    }

  }

  /* =========================
     WORKSPACE
  ========================= */

  function openView(
    view
  ) {

    state.currentView =
      view;

    document
      .querySelectorAll(
        "[data-view]"
      )
      .forEach(
        button => {

          button.classList.toggle(
            "active",
            button.dataset.view ===
              view
          );

        }
      );

    if (
      view === "chat"
    ) {

      closeWorkspace();

      $("#top-title")
        .textContent =
        "Chat";

      return;

    }

    openWorkspace(
      view
    );

  }

  function openWorkspace(
    view
  ) {

    const workspace =
      $("#workspace");

    const title =
      $("#workspace-title");

    const body =
      $("#workspace-body");

    if (
      !workspace ||
      !title ||
      !body
    )
      return;

    const names = {

      files:
        "Files",

      editor:
        "Editor",

      terminal:
        "Terminal",

      git:
        "Git",

      search:
        "Search",

      history:
        "History"

    };

    title.textContent =
      names[view] ||
      "Workspace";

    body.innerHTML = "";

    if (
      view === "files"
    ) {

      renderFiles(
        body
      );

    } else if (
      view === "editor"
    ) {

      renderEditor(
        body
      );

    } else if (
      view === "terminal"
    ) {

      renderTerminal(
        body
      );

    } else if (
      view === "git"
    ) {

      renderGit(
        body
      );

    } else if (
      view === "search"
    ) {

      renderSearch(
        body
      );

    } else if (
      view === "history"
    ) {

      renderHistory(
        body
      );

    }

    workspace.classList.add(
      "open"
    );

  }

  function closeWorkspace() {

    $("#workspace")
      ?.classList.remove(
        "open"
      );

  }

  /* =========================
     FILE VIEW
  ========================= */

  function renderFiles(
    body
  ) {

    if (
      state.files.length === 0
    ) {

      body.innerHTML = `

        <div style="
          max-width:600px;
          margin:60px auto;
          text-align:center;
          color:#555;
          font-size:10px;
        ">

          <div style="
            font-size:25px;
            margin-bottom:12px;
          ">
            ▤
          </div>

          No files uploaded.

          <br><br>

          <button
            id="workspace-upload"
            class="small-button"
          >
            Upload Files
          </button>

        </div>

      `;

    } else {

      body.innerHTML = `

        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:14px;
        ">

          <span style="
            color:#555;
            font-size:9px;
          ">
            ${state.files.length} file(s)
          </span>

          <button
            id="workspace-upload"
            class="small-button"
          >
            Upload
          </button>

        </div>

        <div id="file-list"></div>

      `;

      const list =
        $("#file-list");

      state.files.forEach(
        (file, index) => {

          const row =
            document.createElement(
              "div"
            );

          row.style.cssText = `

            display:flex;
            align-items:center;
            gap:10px;
            padding:11px;
            border:1px solid #171717;
            border-radius:5px;
            margin-bottom:5px;
            background:#0b0b0b;

          `;

          row.innerHTML = `

            <span style="
              color:#555;
            ">
              ▤
            </span>

            <span style="
              flex:1;
              color:#aaa;
              font-size:10px;
            ">
              ${escapeHTML(
                file.name
              )}
            </span>

            <span style="
              color:#444;
              font-size:8px;
            ">
              ${formatBytes(
                file.size
              )}
            </span>

            <button
              class="small-button"
              data-remove="${index}"
            >
              Remove
            </button>

          `;

          list.appendChild(
            row
          );

        }
      );

      list
        .querySelectorAll(
          "[data-remove]"
        )
        .forEach(
          button => {

            button.addEventListener(
              "click",
              () => {

                state.files.splice(
                  Number(
                    button.dataset.remove
                  ),
                  1
                );

                renderFiles(
                  body
                );

              }
            );

          }
        );

    }

    body
      .querySelector(
        "#workspace-upload"
      )
      ?.addEventListener(
        "click",
        openUpload
      );

  }

  /* =========================
     EDITOR
  ========================= */

  function renderEditor(
    body
  ) {

    body.innerHTML = `

      <div style="
        max-width:850px;
        margin:auto;
      ">

        <div style="
          margin-bottom:12px;
          color:#555;
          font-size:9px;
        ">
          Editor
        </div>

        <textarea
          id="code-editor"
          style="
            width:100%;
            height:500px;
            resize:vertical;
            padding:14px;
            border:1px solid #222;
            border-radius:6px;
            outline:0;
            background:#080808;
            color:#aaa;
            font:11px/1.7 monospace;
          "
          placeholder="// Open a file from your workspace..."
        ></textarea>

      </div>

    `;

  }

  /* =========================
     TERMINAL
  ========================= */

  function renderTerminal(
    body
  ) {

    body.innerHTML = `

      <div style="
        max-width:900px;
        margin:auto;
      ">

        <div style="
          margin-bottom:10px;
          color:#555;
          font-size:9px;
        ">
          Terminal
        </div>

        <div style="
          border:1px solid #202020;
          border-radius:6px;
          overflow:hidden;
          background:#060606;
        ">

          <pre
            id="terminal-output"
            style="
              height:350px;
              overflow:auto;
              margin:0;
              padding:14px;
              color:#777;
              font:10px/1.6 monospace;
              white-space:pre-wrap;
            "
          >OPENCODELO terminal

Backend terminal belum dikonfigurasi.
</pre>

          <div style="
            display:flex;
            border-top:1px solid #181818;
          ">

            <span style="
              padding:10px;
              color:#555;
              font:10px monospace;
            ">
              $
            </span>

            <input
              id="terminal-input"
              style="
                flex:1;
                border:0;
                outline:0;
                background:#060606;
                color:#aaa;
                font:10px monospace;
              "
              placeholder="Command..."
              autocomplete="off"
            >

          </div>

        </div>

      </div>

    `;

    const input =
      $("#terminal-input");

    const output =
      $("#terminal-output");

    input?.addEventListener(
      "keydown",
      async event => {

        if (
          event.key !==
          "Enter"
        )
          return;

        const command =
          input.value.trim();

        if (!command)
          return;

        input.value = "";

        output.textContent +=
          `\n$ ${command}\n`;

        try {

          const response =
            await fetch(
              "/api/terminal",
              {

                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify({
                    command
                  })

              }
            );

          const data =
            await response.json();

          if (!response.ok) {

            throw new Error(
              data?.error ||
              `HTTP ${response.status}`
            );

          }

          output.textContent +=
            data?.output ||
            data?.stdout ||
            "(no output)\n";

        } catch (error) {

          output.textContent +=
            `Error: ${error.message}\n`;

        }

        output.scrollTop =
          output.scrollHeight;

      }
    );

    input?.focus();

  }

  /* =========================
     GIT
  ========================= */

  function renderGit(
    body
  ) {

    body.innerHTML = `

      <div style="
        max-width:700px;
        margin:60px auto;
        text-align:center;
        color:#555;
        font-size:10px;
      ">

        <div style="
          font-size:25px;
          margin-bottom:12px;
        ">
          ⑂
        </div>

        <div style="
          color:#888;
          margin-bottom:7px;
        ">
          Git Workspace
        </div>

        Git backend belum dikonfigurasi.

      </div>

    `;

  }

  /* =========================
     SEARCH
  ========================= */

  function renderSearch(
    body
  ) {

    body.innerHTML = `

      <div style="
        max-width:800px;
        margin:auto;
      ">

        <input
          id="search-input"
          class="field"
          placeholder="Search workspace files..."
          autocomplete="off"
        >

        <div
          id="search-results"
          style="
            margin-top:12px;
            color:#555;
            font-size:9px;
          "
        >
          Search uploaded files.
        </div>

      </div>

    `;

    const input =
      $("#search-input");

    const results =
      $("#search-results");

    input?.addEventListener(
      "input",
      () => {

        const query =
          input.value
            .trim()
            .toLowerCase();

        if (!query) {

          results.textContent =
            "Search uploaded files.";

          return;

        }

        const matches =
          state.files.filter(
            file =>
              file.name
                .toLowerCase()
                .includes(query)
          );

        results.innerHTML =
          matches.length

            ? matches
                .map(
                  file =>
                    `<div style="
                      padding:9px;
                      border-bottom:1px solid #171717;
                    ">${escapeHTML(
                      file.name
                    )}</div>`
                )
                .join("")

            : "No matching files.";

      }
    );

    input?.focus();

  }

  /* =========================
     HISTORY
  ========================= */

  function renderHistory(
    body
  ) {

    if (
      state.messages.length === 0
    ) {

      body.innerHTML = `

        <div style="
          padding:60px;
          text-align:center;
          color:#555;
          font-size:10px;
        ">
          No chat history.
        </div>

      `;

      return;

    }

    body.innerHTML = `

      <div style="
        max-width:850px;
        margin:auto;
      ">

        ${state.messages
          .map(
            message => `

              <div style="
                padding:10px;
                margin-bottom:5px;
                border:1px solid #181818;
                border-radius:5px;
                background:#0b0b0b;
              ">

                <div style="
                  margin-bottom:5px;
                  color:#555;
                  font-size:8px;
                  text-transform:uppercase;
                ">
                  ${escapeHTML(
                    message.role
                  )}
                </div>

                <div style="
                  color:#999;
                  font-size:10px;
                  white-space:pre-wrap;
                ">
                  ${escapeHTML(
                    message.content
                  )}
                </div>

              </div>

            `
          )
          .join("")}

      </div>

    `;

  }

  /* =========================
     NEW CHAT
  ========================= */

  function newChat() {

    if (state.busy) {

      toast(
        "Tunggu AI selesai."
      );

      return;

    }

    state.messages = [];

    saveHistory();

    renderMessages();

    openView(
      "chat"
    );

    toast(
      "New chat"
    );

  }

  /* =========================
     COMPOSER MODEL
  ========================= */

  function updateComposerModel() {

    const select =
      $("#composer-model");

    if (!select)
      return;

    select.innerHTML = "";

    const option =
      document.createElement(
        "option"
      );

    option.value =
      state.settings.model;

    option.textContent =
      state.settings.model
        ? `${state.settings.provider} · ${state.settings.model}`
        : "Current model";

    select.appendChild(
      option
    );

  }

  /* =========================
     BUSY
  ========================= */

  function setBusy(
    value
  ) {

    state.busy =
      Boolean(value);

    const button =
      $("#send-button");

    const input =
      $("#message-input");

    if (button) {

      button.disabled =
        state.busy;

    }

    if (input) {

      input.disabled =
        state.busy;

    }

    if (
      state.busy
    ) {

      $("#model-status")
        .textContent =
        "Thinking...";

    } else {

      updateStatus();

    }

  }

  /* =========================
     TEXT HELPERS
  ========================= */

  function escapeHTML(
    value
  ) {

    return String(
      value
    )

      .replaceAll(
        "&",
        "&amp;"
      )

      .replaceAll(
        "<",
        "&lt;"
      )

      .replaceAll(
        ">",
        "&gt;"
      )

      .replaceAll(
        '"',
        "&quot;"
      )

      .replaceAll(
        "'",
        "&#039;"
      );

  }

  function formatBytes(
    bytes
  ) {

    if (
      !Number.isFinite(
        bytes
      )
    )
      return "";

    if (
      bytes < 1024
    )
      return `${bytes} B`;

    if (
      bytes < 1024 * 1024
    )
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;

  }

  function toast(
    message
  ) {

    console.log(
      "[OPENCODELO]",
      message
    );

    /*
     * Small native notification.
     */

    let element =
      $("#lolo-toast");

    if (!element) {

      element =
        document.createElement(
          "div"
        );

      element.id =
        "lolo-toast";

      element.style.cssText = `

        position:fixed;
        right:18px;
        bottom:18px;
        z-index:10000;
        max-width:320px;
        padding:10px 13px;
        border:1px solid #292929;
        border-radius:6px;
        background:#111;
        color:#aaa;
        font-size:9px;
        box-shadow:0 15px 40px rgba(0,0,0,.5);
        transition:opacity .2s;

      `;

      document.body.appendChild(
        element
      );

    }

    element.textContent =
      message;

    element.style.opacity =
      "1";

    clearTimeout(
      element._timer
    );

    element._timer =
      setTimeout(
        () => {

          element.style.opacity =
            "0";

        },
        2600
      );

  }

  /* =========================
     EVENTS
  ========================= */

  function bindEvents() {

    $("#send-button")
      ?.addEventListener(
        "click",
        sendCurrentInput
      );

    $("#message-input")
      ?.addEventListener(
        "keydown",
        event => {

          if (
            event.key ===
              "Enter" &&
            !event.shiftKey
          ) {

            event.preventDefault();

            sendCurrentInput();

          }

        }
      );

    $("#message-input")
      ?.addEventListener(
        "input",
        event => {

          event.target.style.height =
            "auto";

          event.target.style.height =
            `${Math.min(
              event.target.scrollHeight,
              180
            )}px`;

        }
      );

    $("#settings-button")
      ?.addEventListener(
        "click",
        openSettings
      );

    $("#top-settings")
      ?.addEventListener(
        "click",
        openSettings
      );

    $("#settings-close")
      ?.addEventListener(
        "click",
        closeSettings
      );

    $("#settings-overlay")
      ?.addEventListener(
        "click",
        event => {

          if (
            event.target ===
            $("#settings-overlay")
          ) {

            closeSettings();

          }

        }
      );

    $("#provider-select")
      ?.addEventListener(
        "change",
        providerChanged
      );

    $("#show-key-button")
      ?.addEventListener(
        "click",
        toggleKey
      );

    $("#save-settings")
      ?.addEventListener(
        "click",
        saveSettingsFromUI
      );

    $("#test-connection")
      ?.addEventListener(
        "click",
        testConnection
      );

    $("#new-chat-button")
      ?.addEventListener(
        "click",
        newChat
      );

    $("#upload-button")
      ?.addEventListener(
        "click",
        openUpload
      );

    $("#history-button")
      ?.addEventListener(
        "click",
        () =>
          openWorkspace(
            "history"
          )
      );

    $("#workspace-close")
      ?.addEventListener(
        "click",
        closeWorkspace
      );

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

  /* =========================
     INIT
  ========================= */

  function init() {

    loadSettings();

    loadHistory();

    bindEvents();

    updateComposerModel();

    updateStatus();

    renderMessages();

    console.log(
      "OPENCODELO.10 initialized."
    );

  }

  return {

    init,

    sendMessage,

    sendCurrentInput,

    openSettings,

    closeSettings,

    testConnection,

    saveSettings:
      saveSettingsFromUI,

    openView,

    newChat,

    upload:
      openUpload,

    getSettings:
      () =>
        ({
          ...state.settings
        })

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
