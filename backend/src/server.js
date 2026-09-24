import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createServer } from "node:http";
import * as z from "zod/v4";
import { checkReminders } from "./reminder.js";
import pool from "./db.js";
import app from "./api.js";

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
        "get_notifications",
        {
            description:
                "Get the user's unread task reminders and notifications",
            inputSchema: z.object({
                userId: z.string()
            })
        },

        async ({ userId }) => {
            try {
                const result = await pool.query(
                    `
        SELECT
          n.id,
          n.task_id,
          n.message,
          n.type,
          n.is_read,
          n.created_at,
          t.title,
          t.due_date
        FROM notifications n
        LEFT JOIN tasks t
          ON n.task_id = t.id
        WHERE n.user_id = $1
        AND n.is_read = false
        ORDER BY n.created_at DESC
        `,
                    [userId]
                );

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                notifications: result.rows
                            })
                        }
                    ]
                };

            } catch (error) {
                console.error(
                    "Notification fetch error:",
                    error
                );

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: "Failed to fetch notifications"
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
        "delete_task",
        {
            description: "Delete an existing work task",
            inputSchema: z.object({
                userId: z.string(),
                taskId: z.number()
            })
        },
        async ({ userId, taskId }) => {
            try {
                const result = await pool.query(
                    `
        DELETE FROM tasks
        WHERE id = $1
        AND user_id = $2
        RETURNING *
        `,
                    [taskId, userId]
                );

                if (result.rows.length === 0) {
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                error: "Task not found"
                            })
                        }]
                    };
                }

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            message: "Task deleted successfully",
                            task: result.rows[0]
                        })
                    }]
                };
            } catch (error) {
                console.error("Database error:", error);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            error: "Failed to delete task"
                        })
                    }]
                };
            }
        }
    );

    server.registerTool(
        "delete_all_tasks",
        {
            description: "Delete all work tasks belonging to the user",
            inputSchema: z.object({
                userId: z.string()
            })
        },
        async ({ userId }) => {
            try {
                const result = await pool.query(
                    `
        DELETE FROM tasks
        WHERE user_id = $1
        RETURNING *
        `,
                    [userId]
                );

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            message: "All tasks deleted successfully",
                            deletedCount: result.rows.length,
                            tasks: result.rows
                        })
                    }]
                };
            } catch (error) {
                console.error("Database error:", error);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            error: "Failed to delete all tasks"
                        })
                    }]
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
        "update_task",
        {
            description:
                "Update an existing work task. Can change the title, priority, or due date.",
            inputSchema: z.object({
                userId: z.string(),
                taskId: z.number(),
                title: z.string().optional(),
                priority: z.enum(["low", "medium", "high"]).optional(),
                dueDate: z.string().nullable().optional()
            })
        },

        async ({ userId, taskId, title, priority, dueDate }) => {

            try {

                const result = await pool.query(
                    `
                UPDATE tasks
                SET
                    title = COALESCE($1, title),
                    priority = COALESCE($2, priority),
                    due_date = COALESCE($3, due_date)
                WHERE id = $4
                AND user_id = $5
                RETURNING *
                `,
                    [
                        title ?? null,
                        priority ?? null,
                        dueDate ?? null,
                        taskId,
                        userId
                    ]
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
                                message: "Task updated successfully",
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
                                error: "Failed to update task"
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
    if (req.url?.startsWith("/mcp")) {
        return nodeHandler(req, res);
    }

    app(req, res);
});

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
    console.log(`Voxara backend running on port ${PORT}`);

    // Check reminders immediately
    checkReminders();

    // Check every 1 minute
    setInterval(checkReminders, 60 * 1000);
});