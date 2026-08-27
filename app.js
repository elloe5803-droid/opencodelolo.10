const state = {
  sessions: [],
  currentSession: null,
  search: ""
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
    const saved = localStorage.getItem("opencode-web-state");

    if (!saved) return;

    const data = JSON.parse(saved);

    state.sessions = Array.isArray(data.sessions)
      ? data.sessions
      : [];

    state.currentSession = data.currentSession || null;
  } catch {
    state.sessions = [];
    state.currentSession = null;
  }
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

  $("#message")?.focus();

  closeSidebar();
}

function getCurrentSession() {
  return state.sessions.find(
    session => session.id === state.currentSession
  );
}

function selectSession(id) {
  state.currentSession = id;

  saveState();
  renderSessions();
  renderMessages();

  closeSidebar();
}

function deleteSession(id) {
  const index = state.sessions.findIndex(
    session => session.id === id
  );

  if (index === -1) return;

  state.sessions.splice(index, 1);

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
    const row = document.createElement("div");

    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "4px";

    const button = document.createElement("button");

    button.className =
      "session" +
      (session.id === state.currentSession
        ? " active"
        : "");

    button.textContent = session.title;

    button.onclick = () =>
      selectSession(session.id);

    const deleteButton =
      document.createElement("button");

    deleteButton.textContent = "×";
    deleteButton.title = "Delete session";

    deleteButton.style.width = "30px";
    deleteButton.style.height = "30px";
    deleteButton.style.borderRadius = "7px";
    deleteButton.style.background = "transparent";
    deleteButton.style.color = "#777";

    deleteButton.onclick = (event) => {
      event.stopPropagation();

      if (
        confirm("Delete this session?")
      ) {
        deleteSession(session.id);
      }
    };

    row.appendChild(button);
    row.appendChild(deleteButton);

    container.appendChild(row);
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
    const element = document.createElement("div");

    element.className =
      `message ${message.role}`;

    const label = document.createElement("div");

    label.className = "message-label";

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

    element.appendChild(label);
    element.appendChild(content);

    if (message.role === "assistant") {
      const copy =
        document.createElement("button");

      copy.textContent = "Copy";
      copy.style.marginTop = "10px";
      copy.style.padding = "5px 9px";
      copy.style.borderRadius = "6px";
      copy.style.background = "#222";
      copy.style.color = "#aaa";

      copy.onclick = async () => {
        await navigator.clipboard.writeText(
          message.content
        );

        copy.textContent = "Copied";

        setTimeout(() => {
          copy.textContent = "Copy";
        }, 1200);
      };

      element.appendChild(copy);
    }

    container.appendChild(element);
  });

  container.scrollTop =
    container.scrollHeight;
}

async function sendMessage(event) {
  event?.preventDefault();

  const input = $("#message");

  if (!input) return;

  const text = input.value.trim();

  if (!text) return;

  if (!state.currentSession) {
    createSession();
  }

  const session = getCurrentSession();

  session.messages.push({
    role: "user",
    content: text
  });

  if (session.title === "New session") {
    session.title =
      text.length > 32
        ? text.substring(0, 32) + "..."
        : text;
  }

  input.value = "";

  saveState();
  renderSessions();
  renderMessages();

  const loading = {
    role: "assistant",
    content: "Thinking..."
  };

  session.messages.push(loading);

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
        "Request failed"
      );
    }

    session.messages.push({
      role: "assistant",
      content:
        data?.reply ||
        "AI tidak memberikan jawaban."
    });

  } catch (error) {
    session.messages.pop();

    session.messages.push({
      role: "assistant",
      content:
        "❌ " +
        (error.message ||
          "Gagal menghubungi AI.")
    });
  }

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

function clearSearch() {
  state.search = "";

  renderSessions();
}

function attachFile() {
  const input =
    document.createElement("input");

  input.type = "file";
  input.multiple = true;

  input.onchange = () => {
    const files =
      Array.from(input.files || []);

    if (!files.length) return;

    const message =
      $("#message");

    const names =
      files.map(file => file.name)
        .join(", ");

    message.value +=
      `\n[Attached: ${names}]`;

    message.focus();
  };

  input.click();
}

function showMoreMenu() {
  const action =
    prompt(
      "Menu:\n\n1 = New session\n2 = Clear current chat\n3 = Delete current session"
    );

  if (action === "1") {
    createSession();
  }

  if (action === "2") {
    const session =
      getCurrentSession();

    if (!session) return;

    session.messages = [];

    saveState();
    renderMessages();
  }

  if (action === "3") {
    const session =
      getCurrentSession();

    if (session) {
      deleteSession(session.id);
    }
  }
}

function openFiles() {
  alert(
    "File Explorer akan kita aktifkan pada tahap berikutnya."
  );
}

function openTerminal() {
  alert(
    "Terminal backend akan kita aktifkan pada tahap berikutnya."
  );
}

function openSettings() {
  alert(
    "Settings akan kita aktifkan pada tahap berikutnya."
  );
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

document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadState();

    renderSessions();
    renderMessages();

    const input =
      $("#message");

    if (input) {
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
    }

    document
      .querySelector(".attach-button")
      ?.addEventListener(
        "click",
        attachFile
      );

    const searchButton =
      document.querySelector(
        '[title="Search"]'
      );

    searchButton?.addEventListener(
      "click",
      searchSessions
    );

    const moreButton =
      document.querySelector(
        '[title="More"]'
      );

    moreButton?.addEventListener(
      "click",
      showMoreMenu
    );

    document
      .querySelectorAll(".footer-button")
      .forEach(button => {
        const text =
          button.textContent.trim();

        if (text.includes("Files")) {
          button.onclick = openFiles;
        }

        if (text.includes("Terminal")) {
          button.onclick = openTerminal;
        }

        if (text.includes("Settings")) {
          button.onclick = openSettings;
        }
      });
  }
);
