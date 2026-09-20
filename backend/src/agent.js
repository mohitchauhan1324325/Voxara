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

Available operations:
- Get current tasks
- Create new tasks
- Complete tasks

Always use the appropriate MCP tool when the user's request requires
interacting with their tasks.

The current user's ID is user123.

IMPORTANT RULES:

1. When the user asks to view, show, list, check, or get tasks,
   use get_tasks.

2. When the user asks to create a task, use create_task.

3. Only use complete_task when the user explicitly asks to:
   - complete a task
   - mark a task as completed
   - finish a task
   - mark a task as done

4. If the user refers to a task by its name, title, or description
   instead of its numeric ID:

   - Use the find_task tool to find the matching task.
   - If exactly one task matches, use complete_task with that task's ID.
   - If multiple tasks match, ask the user which task they mean.
   - If no task matches, tell the user that the task could not be found.

5. Always include userId: "user123" when calling an MCP tool.

6. Never invent task information.

7. Never return JSON to the user.

8. Never use Markdown tables.

9. Keep responses natural.

For task lists, use simple readable text.

Example:

Here are your pending tasks:

1. Review pull request
   Priority: High
   Status: Pending

2. Update API documentation
   Priority: Medium
   Status: Pending

For task creation:

Task created successfully: Review pull request.

For task completion:

Done. Review pull request has been marked as completed.
`
    },
    {
      role: "user",
      content: userMessage
    }
  ];

  // First AI call - decide which MCP tool to use
  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages,
    tools,
    tool_choice: "auto",
    parallel_tool_calls: false
  });

  const assistantMessage = response.choices[0].message;

  // No tool required
  if (!assistantMessage.tool_calls) {
    return {
      response: assistantMessage.content,
      tasks: null
    };
  }

  messages.push(assistantMessage);

  let taskData = null;
  let lastToolResult = null;

  // Execute MCP tool
  for (const toolCall of assistantMessage.tool_calls) {

    const toolName = toolCall.function.name;

    const toolArguments = JSON.parse(
      toolCall.function.arguments
    );

    // Make sure userId is always present
    if (!toolArguments.userId) {
      toolArguments.userId = "user123";
    }

    console.log(`Calling MCP tool: ${toolName}`);
    console.log("Arguments:", toolArguments);

    const toolResult = await mcpClient.callTool({
      name: toolName,
      arguments: toolArguments
    });

    lastToolResult = toolResult;

    // Save task data for frontend
    if (toolName === "get_tasks") {
      try {
        const parsedResult = JSON.parse(
          toolResult.content[0].text
        );

        taskData = parsedResult.tasks || [];

      } catch (error) {
        console.error(
          "Failed to parse task data:",
          error
        );
      }
    }

    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(toolResult)
    });
  }

  /*
    Generate the final response WITHOUT sending
    the previous tool conversation back to Groq.

    This prevents the model from trying to call
    complete_task again.
  */

  let finalResponse;

  if (lastToolResult) {
    try {
      const result = JSON.parse(
        lastToolResult.content[0].text
      );

      if (result.message) {
        finalResponse = result.message;

        if (result.task) {
          if (result.task.title) {
            finalResponse =
              `${result.message}: ${result.task.title}`;
          }
        }
      } else if (taskData) {
        finalResponse = "Here are your tasks:";
      } else {
        finalResponse = "Done.";
      }

    } catch (error) {
      console.error(
        "Failed to parse MCP response:",
        error
      );

      finalResponse = "Done.";
    }
  }

  return {
    response: finalResponse,
    tasks: taskData
  };
}