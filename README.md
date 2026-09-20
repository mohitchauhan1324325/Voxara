Sure — here’s a concise **current-state README** for Voxara:

```markdown
# Voxara

Voxara is an AI-powered work assistant that turns natural-language conversations into actionable workflows.

It allows users to view, create, find, and complete work tasks through an AI agent connected to an MCP server and PostgreSQL database.

## ✨ Features

- 🤖 AI-powered task assistant
- 💬 Natural-language task management
- 📋 View current tasks
- ➕ Create new tasks
- 🔎 Find tasks by name or description
- ✅ Complete tasks
- 🔌 MCP-based tool integration
- 🗄️ PostgreSQL task storage
- 🎙️ Voice interaction through the web interface

## 🏗️ Architecture

```text
React Frontend
      ↓
Node.js / Express API
      ↓
Groq AI Agent
      ↓
MCP Client
      ↓
MCP Server (Streamable HTTP)
      ↓
PostgreSQL
```

## 🛠️ Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- Web Speech API

### Backend
- Node.js
- Express.js
- Groq SDK
- MCP
- PostgreSQL
- Zod

## 📁 Project Structure

```text
Voxara/
├── backend/
│   └── src/
│       ├── server.js
│       ├── client.js
│       ├── db.js
│       ├── agent.js
│       └── api.js
│
└── frontend/
    └── src/
        ├── App.jsx
        ├── index.css
        └── main.jsx
```

## ⚙️ Environment Variables

Create a `.env` file inside `backend/`:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=voxara
DB_PASSWORD=your_password
DB_PORT=5432

GROQ_API_KEY=your_groq_api_key
```

## 🚀 Getting Started

### 1. Start PostgreSQL

Create the database:

```sql
CREATE DATABASE voxara;
```

Create the tasks table:

```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Start MCP Server

```bash
cd backend
npm install
node src/server.js
```

MCP endpoint:

```text
http://localhost:3000/mcp
```

### 3. Start Backend API

```bash
node src/api.js
```

Backend API:

```text
http://localhost:4000
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

## 🔌 MCP Tools

Voxara currently uses MCP tools for task management:

- `get_tasks` — Retrieve the user's tasks
- `create_task` — Create a new task
- `find_task` — Find a task by name or description
- `complete_task` — Mark a task as completed

## 🎯 Hackathon

Voxara is being developed for the **Amazon Developer Hackathon — Alexa+ track**, using an MCP-based architecture to demonstrate an AI assistant capable of turning natural language into actionable workflows.

## 📌 Project Status

🚧 **Currently under development**
```