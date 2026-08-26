const state = {
  sessions: [],
  currentSession: null,
  messages: []
};

const $ = (selector) => document.querySelector(selector);

function createSession() {
  const session = {
    id: Date.now(),
    title: "New session",
    messages: []
  };

  state.sessions.unshift(session);
  state.currentSession = session.id;
  state.messages = [];

  renderSessions();
  renderMessages();

  const input = $("#message");
  if (input) input.focus();
}

function getCurrentSession() {
  return state.sessions.find(
    session => session.id === state.currentSession
  );
}

function sendMessage(event) {
  if (event) event.preventDefault();

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
      text.length > 28
        ? text.substring(0, 28) + "..."
        : text;
  }

  input.value = "";

  renderSessions();
  renderMessages();

  /*
   * Backend AI akan dihubungkan di tahap berikutnya.
   * Untuk sekarang kita tampilkan status lokal.
   */

  setTimeout(() => {
    session.messages.push({
      role: "system",
      content:
        "AI backend belum terhubung. Frontend berhasil menerima pesan."
    });

    renderMessages();
  }, 400);
}

function renderSessions() {
  const container = $("#sessions");
  if (!container) return;

  container.innerHTML = "";

  state.sessions.forEach(session => {
    const item = document.createElement("button");

    item.className =
      "session" +
      (session.id === state.currentSession
        ? " active"
        : "");

    item.textContent = session.title;

    item.onclick = () => {
      state.currentSession = session.id;
      state.messages = session.messages;
      renderSessions();
      renderMessages();
    };

    container.appendChild(item);
  });
}

function renderMessages() {
  const container = $("#messages");
  if (!container) return;

  container.innerHTML = "";

  const session = getCurrentSession();

  if (!session) return;

  session.messages.forEach(message => {
    const element = document.createElement("div");

    element.className =
      "message " + message.role;

    const label =
      message.role === "user"
        ? "You"
        : "AI";

    element.innerHTML = `
      <div class="message-label">${label}</div>
      <div class="message-content"></div>
    `;

    element
      .querySelector(".message-content")
      .textContent = message.content;

    container.appendChild(element);
  });

  container.scrollTop = container.scrollHeight;
}

function toggleSidebar() {
  const sidebar = $(".sidebar");

  if (!sidebar) return;

  sidebar.classList.toggle("open");
}

function saveState() {
  localStorage.setItem(
    "opencode-web-state",
    JSON.stringify(state)
  );
}

function loadState() {
  try {
    const saved =
      localStorage.getItem("opencode-web-state");

    if (!saved) return;

    const data = JSON.parse(saved);

    state.sessions = data.sessions || [];
    state.currentSession = data.currentSession || null;

    const session = getCurrentSession();

    state.messages =
      session?.messages || [];

  } catch (error) {
    console.error(
      "Could not load saved state:",
      error
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadState();

  renderSessions();
  renderMessages();

  const input = $("#message");

  if (input) {
    input.addEventListener("keydown", event => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        const form = input.closest("form");

        if (form) {
          form.requestSubmit();
        }
      }
    });
  }

  window.addEventListener(
    "beforeunload",
    saveState
  );
});

window.createSession = createSession;
window.sendMessage = sendMessage;
window.toggleSidebar = toggleSidebar;
