# Ai_agent 🤖

A real-time, collaborative, AI-powered IDE built for modern development workflows. This project integrates cutting-edge technologies like **WebContainer API**, **Socket.io**, and **Generative AI** to provide a seamless coding experience directly in the browser.

## 🌟 Key Features

### 1. 🎨 Immersive Global Theme Synchronization
The entire IDE UI synchronizes with your chosen editor theme. Experience a cohesive environment whether you prefer a dark, light, or vibrant aesthetic.
- **Supported Themes**: VS Dark (Default), VS Light, Monokai, and GitHub Dark.
- **Dynamic Styling**: All UI components (Activity Bar, Sidebar, Explorer, Tabs, Chat, and Status Bar) adjust their colors dynamically for perfect visibility.

### 2. ⚙️ Personalized Editor Settings
Tailor your development environment with persistence across sessions.
- **Font Size**: Adjustable font size for the editor.
- **Word Wrap**: Toggle word wrapping for better code readability.
- **Theme Persistence**: Settings are saved locally so they stay with you.

### 3. 🤖 AI-Powered Assistant
Integrated AI models to help you code, debug, and explain complex logic.
- **Multi-Model Support**: Switch between specialized AI models like **Gemini** and **Groq**.
- **Context-Aware**: The AI understands your project structure and the files you are working on.

### 4. ⚡ Real-time Collaboration
Collaborate with team members in real-time.
- **Team Chat**: Dedicated channel for team communication.
- **Shared Codebase**: See changes and edits as they happen.
- **Presence Indicators**: Know who else is working on the project.

### 5. 🏗️ Browser-Based Execution (WebContainer)
Run your Node.js and static projects directly in the browser without any local setup.
- **Integrated Terminal**: Execute commands like `npm install` and `npm run dev`.
- **Live Preview**: See your changes in real-time with an integrated preview panel.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React, Vite, Tailwind CSS, Framer Motion, Highlight.js, Markdown-to-JSX |
| **Backend** | Node.js, Express, Socket.io, Mongoose (MongoDB), Redis (ioredis) |
| **AI Integration** | Google Generative AI (Gemini), Groq SDK |
| **Deployment** | WebContainer API for browser-side execution |
| **Real-time** | Socket.io for bidirectional communication |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)
- [Redis](https://redis.io/) (for real-time features)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Sagararora90/Ai_agent.git
   cd Ai_agent
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory with the following variables:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GEMINI_API_KEY=your_google_ai_key
   GROQ_API_KEY=your_groq_api_key
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```
   Start the backend:
   ```bash
   npm run dev
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   ```
   Create a `.env` file in the `frontend` directory:
   ```env
   VITE_API_URL=http://localhost:3000
   ```
   Start the frontend:
   ```bash
   npm run dev
   ```

---

## 🛡️ Security & Performance
- **Token-based Authentication**: JWT for secure user sessions.
- **Real-time Updates**: Optimized Socket.io connections for low latency.
- **Data Persistence**: LocalStorage used for UI preferences to reduce server calls.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is open-source and available under the MIT License.
