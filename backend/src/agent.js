import Groq from "groq-sdk";
import {
  Client,
  StreamableHTTPClientTransport
} from "@modelcontextprotocol/client";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const mcpClient = new Client({
  name: "voxara-agent",
  version: "1.0.0"
});

let mcpConnected = false;
let tools = [];

async function connectMCP() {
  if (mcpConnected) {
    return;
  }

  const mcpUrl =
    process.env.MCP_URL || "http://localhost:4000/mcp";

  const transport = new StreamableHTTPClientTransport(
    new URL(mcpUrl)
  );

  await mcpClient.connect(transport);

  console.log("Voxara AI Agent connected to MCP server!");

  const toolsResult = await mcpClient.listTools();

  tools = toolsResult.tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }
  }));

  mcpConnected = true;
}

export async function processMessage(userMessage) {

  await connectMCP();

  let taskData = null;
  let notificationData = null;

  const currentDateTime = new Date().toISOString();

  const messages = [
    {
      role: "system",
      content: `
You are Voxara, an AI work assistant.

You help users manage their work tasks.

Available tools:
- get_tasks
- find_task
- create_task
- complete_task
- get_notifications

The current user's ID is user123.

Current date and time: ${currentDateTime}

Use this date and time when interpreting relative dates such as:
today, tomorrow, yesterday, next week, etc.

IMPORTANT RULES:

1. For viewing, listing, showing, or checking WORK TASKS:

   - Use get_tasks.
   - Do NOT modify any task.
   - Do NOT use get_tasks for notifications or reminders.

2. For creating a task:

   - Use create_task.

3. For creating tasks with a due date or reminder time:

   - If the user provides a date or time, use create_task.
   - Pass the date/time in the dueDate field.
   - Convert natural language date/time into an ISO datetime string.
   - If no date or time is provided, use dueDate: null.

4. For completing a task:

   - If the user gives a numeric task ID, use complete_task directly.
   - If the user gives a task name, title, or description:
     - Use find_task.
     - If exactly one task is found, you MUST call complete_task
       using that task's ID.
     - If multiple tasks are found, ask the user which task they mean.
     - If no task is found, tell the user the task could not be found.

5. Never call complete_task when the user only wants to view tasks.

6. Always use userId: "user123".

7. Never invent task information.

8. Keep responses concise and natural.

9. Do not return JSON.

10. Do not use Markdown tables.

11. When the user asks for pending tasks, the final response
    should mention only pending tasks.

12. When the user asks for completed tasks, the final response
    should mention only completed tasks.

13. When the user asks for tasks based on a date or day:
    - Use get_tasks.
    - Filter tasks according to their due_date.
    - Understand natural date expressions such as:
      today, tomorrow, yesterday, Monday, Tuesday, this week,
      next week, etc.

14. When the user asks about notifications, reminders, alerts,
    or task reminders:

    - ALWAYS use get_notifications.
    - NEVER use get_tasks for these requests.

    Examples:
    - "Show my notifications"
    - "Show my reminders"
    - "Do I have any reminders?"
    - "Check my notifications"
    - "Show my task reminders"
`
    },
    {
      role: "user",
      content: userMessage
    }
  ];

  // Allow multiple rounds of tool calling
  for (let round = 0; round < 5; round++) {

    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages,
      tools,
      tool_choice: "auto",
      parallel_tool_calls: false
    });

    const assistantMessage = response.choices[0].message;

    // AI finished
    if (!assistantMessage.tool_calls?.length) {
      return {
        response: assistantMessage.content || "Done.",
        tasks: taskData,
        notifications: notificationData
      };
    }

    // Add AI tool request
    messages.push(assistantMessage);

    // Execute tools
    for (const toolCall of assistantMessage.tool_calls) {

      const toolName = toolCall.function.name;

      const toolArguments = JSON.parse(
        toolCall.function.arguments || "{}"
      );

      // Always provide userId
      if (!toolArguments.userId) {
        toolArguments.userId = "user123";
      }

      console.log(`Calling MCP tool: ${toolName}`);
      console.log("Arguments:", toolArguments);

      const toolResult = await mcpClient.callTool({
        name: toolName,
        arguments: toolArguments
      });

      console.log("MCP result:", toolResult);

      // Save task data for frontend
      try {
        const parsedResult = JSON.parse(
          toolResult.content[0].text
        );

        if (toolName === "get_tasks") {

          const allTasks = parsedResult.tasks || [];

          const lowerMessage = userMessage.toLowerCase();

          // Start with all tasks
          taskData = allTasks;

          // -------------------------
          // STATUS FILTER
          // -------------------------

          if (
            lowerMessage.includes("pending") ||
            lowerMessage.includes("incomplete")
          ) {
            taskData = taskData.filter(
              (task) => task.status === "pending"
            );
          }

          else if (
            lowerMessage.includes("completed") ||
            lowerMessage.includes("complete")
          ) {
            taskData = taskData.filter(
              (task) => task.status === "completed"
            );
          }


          // -------------------------
          // PRIORITY FILTER
          // -------------------------

          if (lowerMessage.includes("high priority")) {

            taskData = taskData.filter(
              (task) => task.priority === "high"
            );

          }

          else if (lowerMessage.includes("medium priority")) {

            taskData = taskData.filter(
              (task) => task.priority === "medium"
            );

          }

          else if (lowerMessage.includes("low priority")) {

            taskData = taskData.filter(
              (task) => task.priority === "low"
            );

          }


          // -------------------------
          // DATE FILTER
          // -------------------------

          const today = new Date();

          // Convert date to YYYY-MM-DD
          const formatDate = (date) => {
            return date.toISOString().split("T")[0];
          };


          // Today
          if (lowerMessage.includes("today")) {

            const todayDate = formatDate(today);

            taskData = taskData.filter(
              (task) => task.due_date === todayDate
            );
          }


          // Tomorrow
          else if (lowerMessage.includes("tomorrow")) {

            const tomorrow = new Date(today);

            tomorrow.setDate(
              tomorrow.getDate() + 1
            );

            const tomorrowDate = formatDate(tomorrow);

            taskData = taskData.filter(
              (task) => task.due_date === tomorrowDate
            );
          }


          // Yesterday
          else if (lowerMessage.includes("yesterday")) {

            const yesterday = new Date(today);

            yesterday.setDate(
              yesterday.getDate() - 1
            );

            const yesterdayDate = formatDate(yesterday);

            taskData = taskData.filter(
              (task) => task.due_date === yesterdayDate
            );
          }


          // Overdue
          else if (lowerMessage.includes("overdue")) {

            const todayDate = formatDate(today);

            taskData = taskData.filter(
              (task) =>
                task.due_date &&
                task.due_date < todayDate &&
                task.status === "pending"
            );
          }
        }

        if (toolName === "get_notifications") {
          notificationData = parsedResult.notifications || [];
        }

      } catch (error) {
        console.error(
          "Failed to parse MCP result:",
          error
        );
      }

      // Send tool result back to AI
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult)
      });
    }
  }

  return {
    response: assistantMessage.content || "Done.",
    tasks: taskData,
    notifications: notificationData
  };
}