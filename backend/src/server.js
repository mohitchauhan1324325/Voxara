import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createServer } from "node:http";
import * as z from "zod/v4";
import pool from "./db.js";

const handler = createMcpHandler(() => {
    const server = new McpServer({
        name: "studyflow",
        version: "1.0.0"
    });

    server.registerTool(
        "get_tasks",
        {
            description: "Get the user's current work tasks",
            inputSchema: z.object({
                userId: z.string()
            })
        },
        async ({ userId }) => {

            try {
                const result = await pool.query(
                    `SELECT *
         FROM tasks
         WHERE user_id = $1
         ORDER BY created_at DESC`,
                    [userId]
                );

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                userId,
                                tasks: result.rows
                            })
                        }
                    ]
                };

            } catch (error) {

                console.error("Database error:", error);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: "Failed to fetch tasks"
                            })
                        }
                    ]
                };
            }
        }
    );

    server.registerTool(
        "find_task",
        {
            description:
                "Find a specific task by its title or keywords. Use this when the user refers to a task by its name instead of its ID.",

            inputSchema: z.object({
                userId: z.string(),
                query: z.string()
            })
        },

        async ({ userId, query }) => {

            try {

                const result = await pool.query(
                    `SELECT *
   FROM tasks
   WHERE user_id = $1
   AND (
     title ILIKE '%' || $2 || '%'
     OR to_tsvector('simple', title)
        @@ plainto_tsquery('simple', $2)
   )
   ORDER BY created_at DESC`,
                    [userId, query]
                );

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                tasks: result.rows
                            })
                        }
                    ]
                };

            } catch (error) {

                console.error("Database error:", error);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: "Failed to find task"
                            })
                        }
                    ]
                };
            }
        }
    );

    server.registerTool(
        "create_task",
        {
            description: "Create a new work task for the user",
            inputSchema: z.object({
                userId: z.string(),
                title: z.string(),
                priority: z.enum(["low", "medium", "high"]),
                dueDate: z.string().nullable().optional()
            })
        },
        async ({ userId, title, priority, dueDate }) => {

            try {
                const result = await pool.query(
                    `INSERT INTO tasks
         (user_id, title, priority, status, due_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
                    [
                        userId,
                        title,
                        priority,
                        "pending",
                        dueDate || null
                    ]
                );

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                message: "Task created successfully",
                                task: result.rows[0]
                            })
                        }
                    ]
                };

            } catch (error) {

                console.error("Database error:", error);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: "Failed to create task"
                            })
                        }
                    ]
                };
            }
        }
    );

    server.registerTool(
        "complete_task",
        {
            description: "Mark a work task as completed",
            inputSchema: z.object({
                userId: z.string(),
                taskId: z.number()
            })
        },
        async ({ userId, taskId }) => {
            try {
                const result = await pool.query(
                    `UPDATE tasks
         SET status = 'completed'
         WHERE id = $1
         AND user_id = $2
         RETURNING *`,
                    [taskId, userId]
                );

                if (result.rows.length === 0) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    error: "Task not found"
                                })
                            }
                        ]
                    };
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                message: "Task completed successfully",
                                task: result.rows[0]
                            })
                        }
                    ]
                };
            } catch (error) {
                console.error("Database error:", error);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: "Failed to complete task"
                            })
                        }
                    ]
                };
            }
        }
    );

    return server;
});

const nodeHandler = toNodeHandler(handler);

const httpServer = createServer((req, res) => {
    nodeHandler(req, res);
});

httpServer.listen(3000, () => {
    console.log("StudyFlow MCP server running");
    console.log("MCP endpoint: http://localhost:3000/mcp");
});