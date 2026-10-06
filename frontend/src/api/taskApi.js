import api from "./axios";

export const getTasks = async () => {
    const response = await api.get("/api/tasks");
    return response.data;
};

export const createTask = async (taskData) => {
    const response = await api.post("/api/tasks", taskData);
    return response.data;
};