import { useEffect, useState } from "react";
import { getTasks, createTask, completeTask } from "../api/taskApi";

const TasksDashboard = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [creating, setCreating] = useState(false);

    const [showCreateForm, setShowCreateForm] = useState(false);

    const [newTask, setNewTask] = useState({
        title: "",
        priority: "medium",
        due_date: ""
    });

    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter(
        (task) => task.status === "pending"
    ).length;
    const completedTasks = tasks.filter(
        (task) => task.status === "completed"
    ).length;

    const fetchTasks = async () => {
        try {
            setError("");

            const data = await getTasks();
            setTasks(data.tasks || []);
        } catch (err) {
            setError("Failed to load tasks.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const handleCreateTask = async () => {
        if (!newTask.title.trim()) {
            return;
        }

        try {
            setCreating(true);

            await createTask({
                title: newTask.title.trim(),
                priority: newTask.priority,
                due_date: newTask.due_date || null
            });

            await fetchTasks();

            setNewTask({
                title: "",
                priority: "medium",
                due_date: ""
            });

            setShowCreateForm(false);

        } catch (err) {
            console.error("Create task error:", err);
            setError("Failed to create task.");
        } finally {
            setCreating(false);
        }
    };

    const handleCompleteTask = async (taskId) => {
        try {
            await completeTask(taskId);
            await fetchTasks();
        } catch (err) {
            console.error("Complete task error:", err);
            setError("Failed to complete task.");
        }
    };


    if (loading) return <p className="p-4">Loading tasks...</p>;

    return (
        <div className="p-6">

            {showCreateForm && (
                <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <h3 className="mb-4 text-lg font-semibold text-white">
                        Create New Task
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-3">

                        {/* Title */}
                        <input
                            type="text"
                            placeholder="Task title"
                            value={newTask.title}
                            onChange={(e) =>
                                setNewTask({
                                    ...newTask,
                                    title: e.target.value
                                })
                            }
                            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-500"
                        />

                        {/* Priority */}
                        <select
                            value={newTask.priority}
                            onChange={(e) =>
                                setNewTask({
                                    ...newTask,
                                    priority: e.target.value
                                })
                            }
                            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>

                        {/* Due Date */}
                        <input
                            type="date"
                            value={newTask.due_date}
                            onChange={(e) =>
                                setNewTask({
                                    ...newTask,
                                    due_date: e.target.value
                                })
                            }
                            onClick={(e) => e.currentTarget.showPicker()}
                            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="mt-4 flex gap-3">
                        <button
                            onClick={handleCreateTask}
                            disabled={creating}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {creating ? "Creating..." : "Create Task"}
                        </button>

                        <button
                            onClick={() => setShowCreateForm(false)}
                            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">
                        Tasks Dashboard
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                        Manage and track your tasks
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                    >
                        + Create Task
                    </button>

                    <button
                        onClick={fetchTasks}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <p className="text-sm text-slate-400">Total Tasks</p>
                    <p className="mt-2 text-3xl font-bold text-white">
                        {totalTasks}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <p className="text-sm text-slate-400">Pending</p>
                    <p className="mt-2 text-3xl font-bold text-yellow-400">
                        {pendingTasks}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <p className="text-sm text-slate-400">Completed</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-400">
                        {completedTasks}
                    </p>
                </div>
            </div>

            {tasks.length === 0 ? (
                <p>No tasks found.</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm"
                        >
                            <h3 className="font-semibold text-white">{task.title}</h3>
                            <p className="mt-2 text-sm text-slate-400">
                                Priority: {task.priority}
                            </p>
                            <p className="text-sm text-slate-400">
                                Status: {task.status}
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                Due: {task.due_date
                                    ? new Date(task.due_date).toLocaleDateString()
                                    : "No due date"}
                            </p>
                            {task.status === "pending" && (
                                <button
                                    onClick={() => handleCompleteTask(task.id)}
                                    className="mt-4 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
                                >
                                    Mark as Completed
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TasksDashboard;
