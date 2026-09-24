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