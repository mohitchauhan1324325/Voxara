import { useState } from "react";

function App() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      const transcript =
        event.results[0][0].transcript;

      setMessage(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  const speakResponse = (text) => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setSpeaking(true);
    };

    utterance.onend = () => {
      setSpeaking(false);
    };

    utterance.onerror = () => {
      setSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const renderMessage = (content) => {
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const tableHeaderIndex = lines.findIndex(
      (line) =>
        line.includes("| ID |") &&
        line.includes("Title") &&
        line.includes("Priority") &&
        line.includes("Status")
    );

    // Normal AI response
    if (tableHeaderIndex === -1) {
      return content;
    }

    // Find table rows
    const tableRows = lines
      .slice(tableHeaderIndex + 2)
      .filter((line) => line.startsWith("|"));

    const tasks = tableRows.map((row) => {
      const columns = row
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);

      return {
        id: columns[0],
        title: columns[1],
        priority: columns[2],
        status: columns[3],
        dueDate: columns[4] || "—",
      };
    });

    // Text before and after table
    const beforeTable = lines.slice(0, tableHeaderIndex);
    const afterTableStart =
      tableHeaderIndex + 2 + tableRows.length;

    const afterTable = lines.slice(afterTableStart);

    return (
      <div className="space-y-4">

        {/* Text before table */}
        {beforeTable.length > 0 && (
          <div className="space-y-1">
            {beforeTable.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        )}

        {/* Task cards */}
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"
            >
              <div className="flex items-start justify-between gap-4">

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-500">
                      #{task.id}
                    </span>

                    <h3 className="font-semibold text-slate-100">
                      {task.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3">

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${task.priority?.toLowerCase() === "high"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : task.priority?.toLowerCase() === "medium"
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          : "bg-slate-700 text-slate-300"
                        }`}
                    >
                      {task.priority}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${task.status?.toLowerCase() === "completed"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}
                    >
                      {task.status}
                    </span>

                    <span className="text-xs text-slate-500">
                      Due: {task.dueDate}
                    </span>

                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* Text after table */}
        {afterTable.length > 0 && (
          <div className="space-y-1">
            {afterTable.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        )}

      </div>
    );
  };

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:4000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setNotifications(data.notifications || []);
      // Add AI response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          tasks: data.tasks,
        },
      ]);

      speakResponse(data.response);

      speakResponse(data.response);
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestion = (text) => {
    setMessage(text);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/90">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-slate-950 flex items-center justify-center font-bold text-lg">
              V
            </div>

            <div>
              <h1 className="font-bold text-lg">
                Voxara
              </h1>

              <p className="text-xs text-slate-500">
                AI Work Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Online
          </div>

          <div className="relative">
            {/* button */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-10 h-10 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition"
            >
              🔔

              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden z-50">

                <div className="px-4 py-3 border-b border-slate-700">
                  <h3 className="font-semibold text-white">
                    Notifications
                  </h3>
                </div>

                <div className="max-h-80 overflow-y-auto">

                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="px-4 py-4 border-b border-slate-800 hover:bg-slate-800/50"
                      >
                        <div className="flex gap-3">

                          <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                            🔔
                          </div>

                          <div>
                            <p className="text-sm text-slate-200">
                              {notification.message}
                            </p>

                            {notification.due_date && (
                              <p className="text-xs text-slate-500 mt-1">
                                Due:{" "}
                                {new Date(
                                  notification.due_date
                                ).toLocaleString()}
                              </p>
                            )}
                          </div>

                        </div>
                      </div>
                    ))
                  )}

                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">

        {/* Voxara Voice Status - ALWAYS VISIBLE */}
        <div className="text-center mb-8">

          {/* V Icon */}
          <div
            className={`relative mx-auto w-20 h-20 rounded-full flex items-center justify-center
        transition-all duration-500
        ${listening
                ? "bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]"
                : speaking
                  ? "bg-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.45)]"
                  : "bg-white"
              }
      `}
          >
            <span className="text-2xl font-bold text-slate-950">
              V
            </span>

            {/* Listening animation */}
            {listening && (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping" />
                <span className="absolute inset-[-8px] rounded-full border border-red-400/40 animate-pulse" />
              </>
            )}

            {/* Speaking animation */}
            {speaking && (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-pulse" />
                <span className="absolute -inset-2 rounded-full border border-emerald-400/30 animate-ping" />
              </>
            )}
          </div>

          {/* Status heading */}
          <h2 className="text-2xl font-bold mt-4 text-white">
            {listening
              ? "I'm listening..."
              : speaking
                ? "I'm speaking..."
                : "Voxara"}
          </h2>

          {/* Status subtitle */}
          <p className="text-slate-500 mt-1">
            {listening
              ? "Tell me what you need."
              : speaking
                ? "Here's what I found."
                : "Your AI work assistant"}
          </p>

        </div>

        {/* Existing chat */}
        {messages.length > 0 && (
          <div className="space-y-6 pb-32">

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === "user"
                  ? "justify-end"
                  : "justify-start"
                  }`}
              >

                {msg.role === "assistant" && (
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-white text-slate-950 flex items-center justify-center font-bold">
                    V
                  </div>
                )}

                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 leading-7 whitespace-pre-wrap ${msg.role === "user"
                    ? "bg-white text-slate-950"
                    : "bg-slate-900 border border-slate-800 text-slate-200"
                    }`}
                >
                  <div className="space-y-4">

                    <p>{msg.content}</p>

                    {msg.tasks && msg.tasks.length > 0 && (
                      <div className="space-y-3 mt-4">

                        {msg.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="rounded-xl border border-slate-700 bg-slate-950/70 p-4"
                          >
                            <div className="flex items-start gap-3">

                              <div className="w-8 h-8 shrink-0 rounded-lg bg-white text-slate-950 flex items-center justify-center text-sm font-bold">
                                {task.id}
                              </div>

                              <div className="flex-1">

                                <h3 className="font-semibold text-slate-100">
                                  {task.title}
                                </h3>

                                <div className="flex flex-wrap gap-2 mt-3">

                                  <span
                                    className={`px-2.5 py-1 rounded-full text-xs ${task.priority === "high"
                                      ? "bg-red-500/10 text-red-400"
                                      : task.priority === "medium"
                                        ? "bg-yellow-500/10 text-yellow-400"
                                        : "bg-slate-800 text-slate-400"
                                      }`}
                                  >
                                    {task.priority}
                                  </span>

                                  <span
                                    className={`px-2.5 py-1 rounded-full text-xs ${task.status === "completed"
                                      ? "bg-emerald-500/10 text-emerald-400"
                                      : "bg-blue-500/10 text-blue-400"
                                      }`}
                                  >
                                    {task.status}
                                  </span>

                                  {task.due_date && (
                                    <span className="px-2.5 py-1 rounded-full text-xs bg-slate-800 text-slate-400">
                                      Due: {task.due_date}
                                    </span>
                                  )}

                                </div>

                              </div>
                            </div>
                          </div>
                        ))}

                      </div>
                    )}

                  </div>
                </div>

              </div>
            ))}

            {/* Thinking */}
            {loading && (
              <div className="flex items-center gap-3">

                <div className="w-9 h-9 rounded-xl bg-white text-slate-950 flex items-center justify-center font-bold">
                  V
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-slate-500">
                  Voxara is thinking...
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur border-t border-slate-800">

        <div className="max-w-4xl mx-auto px-6 py-4">

          <div className="flex gap-3">

            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Ask Voxara anything about your tasks..."
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3.5 outline-none text-white placeholder:text-slate-600 focus:border-slate-600 disabled:opacity-50"
            />

            <button
              onClick={sendMessage}
              disabled={loading || !message.trim()}
              className="px-6 rounded-xl bg-white text-slate-950 font-semibold hover:bg-slate-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "..." : "Send"}
            </button>
            <button
              onClick={startListening}
              disabled={loading || listening}
              className={`px-4 rounded-xl font-semibold transition ${listening
                ? "bg-red-500 text-white"
                : "bg-slate-800 text-white hover:bg-slate-700"
                }`}
            >
              {listening ? "🔴" : "🎙️"}
            </button>

          </div>

          <p className="text-center text-xs text-slate-600 mt-3">
            Voxara can manage your tasks using AI + MCP
          </p>

        </div>

      </div>

    </div>
  );
}

export default App;