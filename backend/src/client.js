import {
    Client,
    StreamableHTTPClientTransport
} from "@modelcontextprotocol/client";

const client = new Client({
    name: "studyflow-test-client",
    version: "1.0.0"
});

const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:3000/mcp")
);

await client.connect(transport);

console.log("Connected to MCP server!");

const result = await client.callTool({
  name: "complete_task",
  arguments: {
    userId: "user123",
    taskId: 4
  }
});

console.log("\nComplete task result:");
console.log(result);