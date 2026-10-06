import express from "express";
import cors from "cors";
import { processMessage } from "./agent.js";
import pool from "./db.js";

const app = express();

app.use((req, res, next) => {
  if (req.url?.startsWith("/mcp")) {
    return next();
  }

  express.json()(req, res, next);
});

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://voxara-one.vercel.app"
  ]
}));

app.post("/api/chat", async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const result = await processMessage(
      message,
      conversationHistory
    );

    res.json(result);

  } catch (error) {
    console.error("AI Agent error:", error);

    res.status(500).json({
      error: "Failed to process message"
    });
  }
});

app.get("/api/notifications", async (req, res) => {
  try {
    const result = await pool.query(`
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
    `, ["user123"]);

    res.json({
      notifications: result.rows
    });

  } catch (error) {
    console.error("Notification API error:", error);

    res.status(500).json({
      error: "Failed to fetch notifications"
    });
  }
});


app.get("/api/tasks", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, priority, status, due_date, created_at
       FROM tasks
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      ["user123"]
    );

    res.json({
      tasks: result.rows
    });
  } catch (error) {
    console.error("Fetch tasks error:", error);

    res.status(500).json({
      error: "Failed to fetch tasks"
    });
  }
});

app.post("/api/tasks", async (req, res) => {
  try {
    const { title, priority, due_date } = req.body;

    if (!title) {
      return res.status(400).json({
        error: "Task title is required"
      });
    }

    const result = await pool.query(
      `INSERT INTO tasks
       (title, priority, status, due_date, user_id)
       VALUES ($1, $2, 'pending', $3, $4)
       RETURNING id, title, priority, status, due_date, created_at`,
      [
        title,
        priority || "medium",
        due_date || null,
        "user123"
      ]
    );

    res.status(201).json({
      task: result.rows[0]
    });

  } catch (error) {
    console.error("Create task error:", error);

    res.status(500).json({
      error: "Failed to create task"
    });
  }
});

app.patch("/api/tasks/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE tasks
       SET status = 'completed'
       WHERE id = $1
       AND user_id = $2
       RETURNING id, title, priority, status, due_date, created_at`,
      [id, "user123"]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Task not found"
      });
    }

    res.json({
      task: result.rows[0]
    });

  } catch (error) {
    console.error("Complete task error:", error);

    res.status(500).json({
      error: "Failed to complete task"
    });
  }
});

app.patch("/api/notifications/:id/read", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1
      AND user_id = $2
      `,
      [id, "user123"]
    );

    res.json({ success: true });

  } catch (error) {
    console.error("Mark notification read error:", error);

    res.status(500).json({
      error: "Failed to mark notification as read"
    });
  }
});

export default app;