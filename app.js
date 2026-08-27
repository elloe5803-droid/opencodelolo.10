const state = {
  sessions: [],
  currentSession: null,
  search: "",
  busy: false
};

const $ = (selector) => document.querySelector(selector);

function saveState() {
  localStorage.setItem(
    "opencode-web-state",
    JSON.stringify(state)
  );
}

function loadState() {
  try {
    const saved = localStorage.getItem(
      "opencode-web-state"
    );

    if (!saved) return;

    const data = JSON.parse(saved);

    state.sessions = Array.isArray(data.sessions)
      ? data.sessions
      : [];

    state.currentSession =
      data.currentSession || null;
  } catch {
    state.sessions = [];
    state.currentSession = null;
  }
}

function getCurrentSession() {
  return state.sessions.find(
    session => session.id === state.currentSession
  );
}

function createSession() {
  const session = {
    id: Date.now(),
    title: "New session",
    messages: []
  };

  state.sessions.unshift(session);
  state.currentSession = session.id;

  saveState();
  renderSessions();
  renderMessages();

  const input = $("#message");

  if (input) {
    input.focus();
  }

  closeSidebar();
}

function selectSession(id) {
  state.currentSession = id;

  saveState();
  renderSessions();
  renderMessages();

  closeSidebar();
}

function deleteSession(id) {
  state.sessions = state.sessions.filter(
    session => session.id !== id
  );

  if (state.currentSession === id) {
    state.currentSession =
      state.sessions[0]?.id || null;
  }

  saveState();
  renderSessions();
  renderMessages();
}

function renderSessions() {
  const container = $("#sessions");

  if (!container) return;

  container.innerHTML = "";

  const sessions = state.sessions.filter(session =>
    session.title
      .toLowerCase()
      .includes(state.search.toLowerCase())
  );

  sessions.forEach(session => {
    const button = document.createElement("button");

    button.className =
      "session" +
      (
        session.id === state.currentSession
          ? " active"
          : ""
      );

    button.textContent = session.title;

    button.onclick = () => {
      selectSession(session.id);
    };

    container.appendChild(button);
  });
}

function renderMessages() {
  const container = $("#messages");

  if (!container) return;

  const session = getCurrentSession();

  container.innerHTML = "";

  if (!session || session.messages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-logo">O</div>

        <h1>What do you want to build?</h1>

        <p>
          Ask the coding assistant to create,
          explain, debug, or improve your code.
        </p>
      </div>
    `;

    return;
  }

  session.messages.forEach(message => {
    const wrapper =
      document.createElement("div");

    wrapper.className =
      "message " + message.role;

    const label =
      document.createElement("div");

    label.className =
      "message-label";

    label.textContent =
      message.role === "user"
        ? "You"
        : "AI";

    const content =
      document.createElement("div");

    content.className =
      "message-content";

    content.textContent =
      message.content;

    wrapper.appendChild(label);
    wrapper.appendChild(content);

    if (message.role === "assistant") {
      const copy =
        document.createElement("button");

      copy.textContent = "Copy";

      copy.style.marginTop = "10px";
      copy.style.padding = "6px 10px";
      copy.style.borderRadius = "6px";
      copy.style.background = "#222";
      copy.style.color = "#aaa";

      copy.onclick = async () => {
        try {
          await navigator.clipboard.writeText(
            message.content
          );

          copy.textContent = "Copied";

          setTimeout(() => {
            copy.textContent = "Copy";
          }, 1000);
        } catch {
          alert("Clipboard tidak tersedia.");
        }
      };

      wrapper.appendChild(copy);
    }

    container.appendChild(wrapper);
  });

  container.scrollTop =
    container.scrollHeight;
}

async function sendMessage(event) {
  if (event) {
    event.preventDefault();
  }

  if (state.busy) return;

  const input = $("#message");

  if (!input) return;

  const text = input.value.trim();

  if (!text) return;

  if (!state.currentSession) {
    createSession();
  }

  const session = getCurrentSession();

  if (!session) return;

  session.messages.push({
    role: "user",
    content: text
  });

  if (session.title === "New session") {
    session.title =
      text.length > 35
        ? text.substring(0, 35) + "..."
        : text;
  }

  input.value = "";

  state.busy = true;

  saveState();
  renderSessions();
  renderMessages();

  session.messages.push({
    role: "assistant",
    content: "Thinking..."
  });

  renderMessages();

  try {
    const response = await fetch(
      "/api/chat",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          message: text
        })
      }
    );

    const data =
      await response.json();

    session.messages.pop();

    if (!response.ok) {
      throw new Error(
        data?.error ||
        "AI request failed"
      );
    }

    session.messages.push({
      role: "assistant",
      content:
        data?.reply ||
        "AI tidak mengembalikan jawaban."
    });

  } catch (error) {
    session.messages.pop();

    session.messages.push({
      role: "assistant",
      content:
        "❌ " +
        (
          error.message ||
          "Gagal menghubungi AI."
        )
    });
  }

  state.busy = false;

  saveState();
  renderMessages();
}

function searchSessions() {
  const query =
    prompt("Search sessions:");

  if (query === null) return;

  state.search = query;

  renderSessions();
}

function attachFile() {
  const picker =
    document.createElement("input");

  picker.type = "file";
  picker.multiple = true;

  picker.onchange = () => {
    const files =
      Array.from(picker.files || []);

    if (!files.length) return;

    const input = $("#message");

    if (!input) return;

    const names =
      files.map(file => file.name);

    input.value +=
      "\n[Attached: " +
      names.join(", ") +
      "]";

    input.focus();
  };

  picker.click();
}

async function openFiles() {
  try {
    const response =
      await fetch("/api/files");

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
        "Gagal membaca files"
      );
    }

    const files =
      data.files || [];

    if (!files.length) {
      alert("Tidak ada file.");
      return;
    }

    alert(
      "PROJECT FILES\n\n" +
      files
        .map(file => "📄 " + file)
        .join("\n")
    );

  } catch (error) {
    alert(
      "File Explorer error:\n" +
      error.message
    );
  }
}

function openTerminal() {
  alert(
    "Terminal belum diaktifkan.\n" +
    "Kita perlu backend untuk menjalankan command."
  );
}

function openSettings() {
  alert(
    "Settings akan kita buat setelah workspace selesai."
  );
}

function showMoreMenu() {
  const session =
    getCurrentSession();

  const choice =
    prompt(
      "MENU\n\n" +
      "1 - New session\n" +
      "2 - Clear chat\n" +
      "3 - Delete session\n" +
      "4 - Search sessions"
    );

  if (choice === "1") {
    createSession();
  }

  if (choice === "2" && session) {
    session.messages = [];

    saveState();
    renderMessages();
  }

  if (choice === "3" && session) {
    deleteSession(session.id);
  }

  if (choice === "4") {
    searchSessions();
  }
}

function toggleSidebar() {
  const sidebar =
    $(".sidebar");

  if (sidebar) {
    sidebar.classList.toggle("open");
  }
}

function closeSidebar() {
  const sidebar =
    $(".sidebar");

  if (sidebar) {
    sidebar.classList.remove("open");
  }
}

function setupButtons() {
  const newButton =
    document.querySelector(
      ".new-session"
    );

  if (newButton) {
    newButton.onclick =
      createSession;
  }

  const attachButton =
    document.querySelector(
      ".attach-button"
    );

  if (attachButton) {
    attachButton.onclick =
      attachFile;
  }

  const searchButton =
    document.querySelector(
      '[title="Search"]'
    );

  if (searchButton) {
    searchButton.onclick =
      searchSessions;
  }

  const moreButton =
    document.querySelector(
      '[title="More"]'
    );

  if (moreButton) {
    moreButton.onclick =
      showMoreMenu;
  }

  document
    .querySelectorAll(".footer-button")
    .forEach(button => {

      const text =
        button.textContent
          .trim()
          .toLowerCase();

      if (text.includes("files")) {
        button.onclick =
          openFiles;
      }

      if (text.includes("terminal")) {
        button.onclick =
          openTerminal;
      }

      if (text.includes("settings")) {
        button.onclick =
          openSettings;
      }
    });
}

function setupInput() {
  const input = $("#message");

  if (!input) return;

  input.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        input
          .closest("form")
          ?.requestSubmit();
      }
    }
  );

  input.addEventListener(
    "input",
    () => {
      input.style.height = "auto";

      input.style.height =
        Math.min(
          input.scrollHeight,
          180
        ) + "px";
    }
  );
}

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadState();

    renderSessions();
    renderMessages();

    setupButtons();
    setupInput();
  }
);
