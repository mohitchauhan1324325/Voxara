
import api from "./axios";
import { v4 as uuidv4 } from "uuid";

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const sendChatMessage = async (
  message,
  conversationHistory = [],
  idempotencyKey = uuidv4()
) => {
  const payload = {
    message,
    conversationHistory,
    idempotencyKey,
  };

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await api.post("/api/chat", payload);
      return response.data;
    } catch (error) {
      const status = error.response?.status;

      // Retry network failures, timeouts, and server errors.
      const retryable =
        !error.response ||
        error.code === "ECONNABORTED" ||
        status >= 500;

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      // Wait 1 second, then 2 seconds before retrying.
      await delay(attempt * 1000);
    }
  }
};
