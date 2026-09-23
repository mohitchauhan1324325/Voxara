import express from "express";
import cors from "cors";
import { processMessage } from "./agent.js";
import pool from "./db.js";

const app = express();

app.use(cors({
  origin: "http://localhost:5173"
}));

app.use(express.json());

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const result = await processMessage(message);

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


app.listen(4000, () => {
  console.log("Voxara API running on http://localhost:4000");
});