import api from "./axios";

export const getTasks = async () => {
    const response = await api.get("/api/tasks");
    return response.data;
};
