
import { App } from "@modelcontextprotocol/ext-apps";

const status = document.getElementById("status");
const tasksContainer = document.getElementById("tasks");

const app = new App({
  name: "Voxara Tasks",
  version: "1.0.0",
});

const userId = "user123";

app.onteardown = async () => ({});

function parseResult(result) {
  if (result.isError) {
    throw new Error("Tool call failed");
  }

  const text = result.content?.find(
    (item) => item.type === "text"
  )?.text;

  if (text) {
    const data = JSON.parse(text);

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  }

  return result.structuredContent || {};
}

async function callTool(name, args) {
  const result = await app.callServerTool({
    name,
    arguments: args,
  });

  return parseResult(result);
}


function renderTasks(tasks) {
  tasksContainer.replaceChildren();

  if (!tasks.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No tasks found. Create your first task!";
    tasksContainer.appendChild(empty);
    return;
  }

  for (const task of tasks) {
    const card = document.createElement("article");
    card.className = "task-card";

    const content = document.createElement("div");

    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title || "Untitled task";

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const priority = document.createElement("span");
    const priorityValue = task.priority || "medium";
    priority.className = `badge priority-${priorityValue}`;
    priority.textContent = `${priorityValue} priority`;

    const taskStatus = document.createElement("span");
    taskStatus.className = "badge";
    taskStatus.textContent = task.status || "pending";

    if (task.status === "completed") {
      taskStatus.classList.add("status-completed");
    }

    meta.append(priority, taskStatus);
    content.append(title, meta);
    card.appendChild(content);

    if (task.status !== "completed") {
      const button = document.createElement("button");
      button.className = "complete-btn";
      button.textContent = "Complete task";

      button.addEventListener("click", async () => {
        button.disabled = true;
        status.textContent = "Completing task...";

        try {
          await callTool("complete_task", {
            userId,
            taskId: Number(task.id),
          });

          await loadTasks();
        } catch (error) {
          status.textContent = `Error: ${error.message}`;
          button.disabled = false;
        }
      });

      card.appendChild(button);
    }

    tasksContainer.appendChild(card);
  }
}

async function loadTasks() {
  status.textContent = "Loading tasks...";

  try {
    const data = await callTool("get_tasks", { userId });
    const tasks = data.tasks || [];

    renderTasks(tasks);
    status.textContent = `${tasks.length} tasks found`;
  } catch (error) {
    status.textContent = `Error loading tasks: ${error.message}`;
  }
}

document.getElementById("create-task-form").addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const titleInput = document.getElementById("task-title");
    const priorityInput = document.getElementById("task-priority");
    const submitButton = document.getElementById("create-task-button");

    const title = titleInput.value.trim();
    if (!title) return;

    submitButton.disabled = true;
    status.textContent = "Creating task...";

    try {
      await callTool("create_task", {
        userId,
        title,
        priority: priorityInput.value,
        idempotencyKey: crypto.randomUUID(),
      });

      titleInput.value = "";
      await loadTasks();
    } catch (error) {
      status.textContent = `Error creating task: ${error.message}`;
    } finally {
      submitButton.disabled = false;
    }
  }
);

app.onerror = (error) => {
  status.textContent = `MCP error: ${error.message}`;
};

app.connect()
  .then(loadTasks)
  .catch((error) => {
    status.textContent = `Connection failed: ${error.message}`;
  });
