const state = {
  sessions: [],
  currentSession: null
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

  saveState();
  renderSessions();
  renderMessages();

  $("#message")?.focus();
}

function getCurrentSession() {
  return state.sessions.find(
    (session) => session.id === state.currentSession
  );
}

async function sendMessage(event) {
  event?.preventDefault();

  const input = $("#message");
  const text = input?.value.trim();

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
      text.length > 30
        ? text.substring(0, 30) + "..."
        : text;
  }

  input.value = "";

  renderSessions();
  renderMessages();
  saveState();

  session.messages.push({
    role: "assistant",
    content: "Thinking..."
  });

  renderMessages();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text
      })
    });

    const data = await response.json();

    session.messages.pop();

    if (!response.ok) {
      throw new Error(
        data?.error || `Request gagal (${response.status})`
      );
    }

    session.messages.push({
      role: "assistant",
      content: data?.reply || "AI tidak memberikan jawaban."
    });

  } catch (error) {
    console.error(error);

    const last =
      session.messages[session.messages.length - 1];

    if (
      last &&
      last.role === "assistant" &&
      last.content === "Thinking..."
    ) {
      session.messages.pop();
    }

    session.messages.push({
      role: "assistant",
      content: "❌ Gagal menghubungi AI.\n\n" + error.message
    });
  }

  saveState();
  renderMessages();
}

function renderSessions() {
  const container = $("#sessions");

  if (!container) return;

  container.innerHTML = "";

  state.sessions.forEach((session) => {
    const button = document.createElement("button");

    button.className =
      "session" +
      (session.id === state.currentSession
        ? " active"
        : "");

    button.textContent = session.title;

    button.onclick = () => {
      state.currentSession = session.id;

      saveState();
      renderSessions();
      renderMessages();

      $(".sidebar")?.classList.remove("open");
    };

    container.appendChild(button);
  });
}

function renderMessages() {
  const container = $("#messages");

  if (!container) return;

  container.innerHTML = "";

  const session = getCurrentSession();

  if (!session) return;

  session.messages.forEach((message) => {
    const element = document.createElement("div");

    element.className = `message ${message.role}`;

    const label = document.createElement("div");

    label.className = "message-label";
    label.textContent =
      message.role === "user" ? "You" : "AI";

    const content = document.createElement("div");

    content.className = "message-content";
    content.textContent = message.content;

    element.appendChild(label);
    element.appendChild(content);

    container.appendChild(element);
  });

  container.scrollTop = container.scrollHeight;
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

    state.sessions =
      Array.isArray(data.sessions)
        ? data.sessions
        : [];

    state.currentSession =
      data.currentSession || null;

  } catch {
    state.sessions = [];
    state.currentSession = null;
  }
}

function toggleSidebar() {
  $(".sidebar")?.classList.toggle("open");
}

document.addEventListener("DOMContentLoaded", () => {
  loadState();

  renderSessions();
  renderMessages();

  const input = $("#message");

  if (input) {
    input.addEventListener("keydown", (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        input.closest("form")?.requestSubmit();
      }
    });
  }
});

window.createSession = createSession;
window.sendMessage = sendMessage;
window.toggleSidebar = toggleSidebar;
