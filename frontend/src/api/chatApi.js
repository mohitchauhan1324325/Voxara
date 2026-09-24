import api from "./axios";

export const sendChatMessage = async (message) => {
    const response = await api.post("/api/chat", {
        message,
    });

    return response.data;
};