import api from "./axios";

export const sendChatMessage = async (
  message,
  conversationHistory = []
) => {
  const response = await api.post("/api/chat", {
    message,
    conversationHistory,
  });

  return response.data;
};