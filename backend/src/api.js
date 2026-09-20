import express from "express";
import cors from "cors";
import { processMessage } from "./agent.js";

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

app.listen(4000, () => {
  console.log("Voxara API running on http://localhost:4000");
});