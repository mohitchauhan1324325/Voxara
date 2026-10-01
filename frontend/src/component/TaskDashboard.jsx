import { useEffect, useState } from "react";
import { getTasks } from "../api/taskApi";

const TasksDashboard = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const data = await getTasks();
                setTasks(data.tasks || []);
            } catch (err) {
                setError("Failed to load tasks.");  
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, []);

    if (loading) return <p className="p-4">Loading tasks...</p>;
    if (error) return <p className="p-4 text-red-500">{error}</p>;
    
    return (
        <div className="p-6">
            <h2 className="mb-4 text-2xl font-bold">Tasks Dashboard</h2>

            {tasks.length === 0 ? (
                <p>No tasks found.</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className="rounded-xl border border-gray-200 p-4 shadow-sm"
                        >
                            <h3 className="font-semibold">{task.title}</h3>
                            <p className="mt-2 text-sm">
                                Priority: {task.priority}
                            </p>
                            <p className="text-sm">
                                Status: {task.status}
                            </p>
                            <p className="mt-2 text-sm text-gray-500">
                                Due: {task.due_date
                                    ? new Date(task.due_date).toLocaleDateString()
                                    : "No due date"}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TasksDashboard;
