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

const transport = new StreamableHTTPClientTransport(
  new URL("http://localhost:3000/mcp")
);

await mcpClient.connect(transport);

console.log("Voxara AI Agent connected to MCP server!");

const toolsResult = await mcpClient.listTools();

const tools = toolsResult.tools.map((tool) => ({
  type: "function",
  function: {
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema
  }
}));

export async function processMessage(userMessage) {
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

The current user's ID is user123.

IMPORTANT RULES:

1. For viewing, listing, showing, or checking tasks:
   - Use get_tasks.
   - Do NOT modify any task.

2. For creating a task:
   - Use create_task.

3. For completing a task:
   - If the user gives a numeric task ID, use complete_task directly.
   - If the user gives a task name, title, or description:
     - Use find_task.
     - If exactly one task is found, you MUST call complete_task
       using that task's ID.
     - If multiple tasks are found, ask the user which task they mean.
     - If no task is found, tell the user the task could not be found.

4. A successful find_task is NOT the final answer when the user
   asked to complete a task.
   You MUST call complete_task after finding exactly one matching task.

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
`
    },
    {
      role: "user",
      content: userMessage
    }
  ];

  let taskData = null;

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
        tasks: taskData
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
    response: "I couldn't complete that request.",
    tasks: taskData
  };
}