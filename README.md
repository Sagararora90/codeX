# CodeX

A real-time, collaborative, AI-powered code editor built for modern development workflows. CodeX integrates WebContainer API, Socket.io, Monaco Editor, and Generative AI to deliver a full IDE experience directly in the browser — no local setup required.


## Key Features

### Autonomous AI Agent
An integrated AI coding assistant that generates entire projects from a single prompt. No multi-step confirmations — describe what you want, and CodeX builds it autonomously.
- **Bring Your Own Key (BYOK)**: Add your own API keys for Groq, Google Gemini, or Hugging Face directly in the editor settings.
- **Multi-Model Support**: Bind multiple models to each key and switch between them from the chat dropdown.
- **Context-Aware**: The AI reads your current project files and generates code that fits your existing architecture.
- **Intent Detection**: Automatically classifies requests as chat, build, or fix — and responds accordingly.

### Monaco Editor
A professional-grade code editor powered by the same engine as VS Code.
- Syntax highlighting for all major languages (auto-detected by file extension).
- IntelliSense autocompletions, bracket auto-closing, and word wrapping.
- Debounced auto-save with no manual save required.

### Real-Time Collaboration
Work with team members simultaneously on the same project.
- **Team Chat**: Dedicated communication channel for collaborators.
- **AI Chat**: Separate AI assistant panel for code generation and debugging.
- **Typing Indicators**: See who is currently typing in real time.
- **Live Sync**: All file changes propagate to collaborators instantly.

### Browser-Based Execution (WebContainer)
Run Node.js projects entirely in the browser without installing anything locally.
- **Integrated Terminal**: Execute shell commands like `npm install` and `npm start`.
- **Live Preview**: See your application running in an embedded iframe alongside the editor.

### Theming and Personalization
Full IDE theme synchronization across every UI component.
- **Supported Themes**: VS Dark (default), VS Light, Monokai, and GitHub Dark.
- **Persistent Settings**: Font size, word wrap, and theme preferences are saved locally across sessions.


## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Monaco Editor, Framer Motion, Markdown-to-JSX |
| **Backend** | Node.js, Express, Socket.io, Mongoose (MongoDB) |
| **AI** | Groq SDK, Google Gemini API, Hugging Face Inference API |
| **Execution** | WebContainer API (in-browser Node.js runtime) |
| **Real-Time** | Socket.io for bidirectional WebSocket communication |
| **Auth** | JWT-based token authentication with bcrypt password hashing |


## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/) (local instance or MongoDB Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sagararora90/codeX.git
   cd codeX
   ```

2. **Backend setup**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ```
   Start the backend server:
   ```bash
   npm run dev
   ```

3. **Frontend setup**
   ```bash
   cd ../frontend
   npm install
   ```
   Create a `.env` file in the `frontend` directory:
   ```env
   VITE_API_URL=http://localhost:3000
   ```
   Start the frontend dev server:
   ```bash
   npm run dev
   ```

4. **Configure AI Models**
   Open the editor settings (gear icon) inside any project. Add your API key for Groq, Gemini, or Hugging Face, and bind the model names you want to use. The models will appear in the chat dropdown automatically.


## Project Structure

```
codeX/
  backend/
    server.js              # HTTP + WebSocket server entry point
    app.js                 # Express app configuration and routes
    services/
      ai.service.js        # Autonomous AI agent (intent routing, code generation)
    models/                # Mongoose schemas (User, Project)
    routes/                # Express route handlers
    controllers/           # Request handlers
    middleware/             # Auth middleware
  frontend/
    src/
      screens/
        Project.jsx        # Main IDE screen (editor, chat, file tree, terminal)
        Login.jsx          # Authentication - login
        Register.jsx       # Authentication - registration
      context/             # React context providers (User, Theme)
      config/              # Axios and WebContainer configuration
      components/          # Reusable UI components
```


## Architecture

The application follows a client-server architecture with real-time communication:

- **Frontend** renders the IDE UI and manages local editor state. File changes are debounced and persisted to the backend via REST API.
- **Backend** handles authentication, project CRUD, and real-time message routing via Socket.io. AI requests are forwarded to the configured provider with the user's API key.
- **AI Service** classifies user intent (chat, build, fix) and routes to the appropriate prompt strategy. Build requests generate complete file trees in a single response. Fix requests patch only the affected files.
- **WebContainer** boots an in-browser Node.js runtime, mounts the project file tree, and streams terminal output and preview URLs back to the UI.


## Security

- JWT-based authentication for all API routes and WebSocket connections.
- API keys are stored client-side only (localStorage) and transmitted per-request — never persisted on the server.
- Passwords are hashed with bcrypt before storage.


## License

This project is open-source and available under the MIT License.
