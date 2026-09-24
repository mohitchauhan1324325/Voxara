import api from "./axios";

export const getNotifications = async () => {
    const response = await api.get("/api/notifications");
    return response.data;
};

export const markNotificationReadApi = async (id) => {
    const response = await api.patch(`/api/notifications/${id}/read`);
    return response.data;
};