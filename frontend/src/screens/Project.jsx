import React, { useState, useEffect, useContext, useRef } from "react";
import { UserContext } from "../context/user.context";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "../config/axios";
import {
  initializeSocket,
  receiveMessage,
  sendMessage,
  disconnectSocket,
  removeListener,
} from "../config/socket";
import Markdown from "markdown-to-jsx";
import hljs from "highlight.js";
import { getWebContainer } from "../config/webContainer";

function SyntaxHighlightedCode(props) {
  const ref = useRef(null);

  React.useEffect(() => {
    if (ref.current && props.className?.includes("lang-") && hljs) {
      hljs.highlightElement(ref.current);
      ref.current.removeAttribute("data-highlighted");
    }
  }, [props.className, props.children]);

  return <code {...props} ref={ref} />;
}

const Project = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(new Set());
  const [project, setProject] = useState(location.state?.project || null);
  const [message, setMessage] = useState("");
  const { user, setUser } = useContext(UserContext); // Added setUser
  const messageBox = React.createRef();

  // Theme support
  const appTheme = user?.appTheme || localStorage.getItem('appTheme') || 'dark';
  const editorThemePreference = user?.editorTheme || localStorage.getItem('editorTheme') || 'vs-dark';

  const THEMES = {
      'vs-dark': {
          bg: 'bg-[#1e1e1e]',
          sidebar: 'bg-[#252526]',
          activityBar: 'bg-[#333333]',
          border: 'border-[#333333]',
          text: 'text-[#d4d4d4]',
          secondaryText: 'text-gray-400',
          headerText: 'text-gray-400',
          menuHover: 'hover:bg-[#505051]',
          statusBarBg: 'bg-[#007acc]',
          statusBarText: 'text-white',
          activeTab: 'bg-[#1e1e1e] text-white border-t-2 border-t-[#0078d4]',
          inactiveTab: 'bg-[#2d2d2d] text-gray-400 hover:bg-[#2a2d2e]',
          editorBg: '#1e1e1e',
          editorText: '#d4d4d4',
          chatBg: 'bg-[#1e1e1e]',
          chatInput: 'bg-[#2d2d2d] border-[#3c3c3c]'
      },
      'vs-light': {
          bg: 'bg-[#ffffff]',
          sidebar: 'bg-[#f3f3f3]',
          activityBar: 'bg-[#2c2c2c]',
          border: 'border-[#e0e0e0]',
          text: 'text-[#333333]',
          secondaryText: 'text-[#616161]',
          headerText: 'text-[#616161]',
          menuHover: 'hover:bg-[#ececec]',
          statusBarBg: 'bg-[#005a9e]',
          statusBarText: 'text-white',
          activeTab: 'bg-[#ffffff] text-[#0078d4] border-t-2 border-t-[#0078d4]',
          inactiveTab: 'bg-[#ececec] text-[#616161] hover:bg-[#e1e1e1]',
          editorBg: '#ffffff',
          editorText: '#333333',
          chatBg: 'bg-[#f9f9f9]',
          chatInput: 'bg-white border-[#cccccc]'
      },
      'monokai': {
          bg: 'bg-[#272822]',
          sidebar: 'bg-[#1e1f1c]',
          activityBar: 'bg-[#141512]',
          border: 'border-[#3e3e3e]',
          text: 'text-[#f8f8f2]',
          secondaryText: 'text-gray-400',
          headerText: 'text-gray-400',
          menuHover: 'hover:bg-[#3e3e3e]',
          statusBarBg: 'bg-[#141512]',
          statusBarText: 'text-[#e6db74]',
          activeTab: 'bg-[#272822] text-[#e6db74] border-t-2 border-t-[#e6db74]',
          inactiveTab: 'bg-[#1e1f1c] text-gray-400 hover:bg-[#272822]',
          editorBg: '#272822',
          editorText: '#f8f8f2',
          chatBg: 'bg-[#272822]',
          chatInput: 'bg-[#1e1f1c] border-[#3e3e3e]'
      },
      'github-dark': {
          bg: 'bg-[#0d1117]',
          sidebar: 'bg-[#161b22]',
          activityBar: 'bg-[#010409]',
          border: 'border-[#30363d]',
          text: 'text-[#c9d1d9]',
          secondaryText: 'text-gray-400',
          headerText: 'text-gray-400',
          menuHover: 'hover:bg-[#30363d]',
          statusBarBg: 'bg-[#010409]',
          statusBarText: 'text-[#58a6ff]',
          activeTab: 'bg-[#0d1117] text-[#58a6ff] border-t-2 border-t-[#58a6ff]',
          inactiveTab: 'bg-[#161b22] text-gray-400 hover:bg-[#0d1117]',
          editorBg: '#0d1117',
          editorText: '#c9d1d9',
          chatBg: 'bg-[#0d1117]',
          chatInput: 'bg-[#161b22] border-[#30363d]'
      }
  };

  const colors = THEMES[editorThemePreference] || THEMES['vs-dark'];

  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [fileTree, setFileTree] = useState({});

  const [currentFile, setCurrentFile] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);

  const [webContainer, setWebContainer] = useState(null);
  const [iframeUrl, setIframeUrl] = useState(null);

  const [runProcess, setRunProcess] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // userId -> sessionId mapping
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('aiModel') || 'groq');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(() => parseInt(localStorage.getItem('editorFontSize')) || 14);
  const [editorWordWrap, setEditorWordWrap] = useState(() => localStorage.getItem('editorWordWrap') !== 'false');

  const handleFontSizeChange = (size) => {
    setEditorFontSize(size);
    localStorage.setItem('editorFontSize', size.toString());
  };

  const handleWordWrapChange = (wrap) => {
    setEditorWordWrap(wrap);
    localStorage.setItem('editorWordWrap', wrap.toString());
  };

  const handleThemeChange = async (theme) => {
    const isLight = theme === 'vs-light';
    const newAppTheme = isLight ? 'light' : 'dark';
    try {
        await axios.put('/users/update-theme', { theme });
        await axios.put('/users/update-theme', { theme: newAppTheme, type: 'app' });
        
        const updatedUser = { ...user, editorTheme: theme, appTheme: newAppTheme };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('appTheme', newAppTheme);
        localStorage.setItem('editorTheme', theme);
    } catch(err) {
        console.error('Failed to update theme', err);
    }
  };
  const [isChatOpen, setIsChatOpen] = useState(() => localStorage.getItem('isChatOpen') === 'true');
  const [isTeamChatOpen, setIsTeamChatOpen] = useState(() => localStorage.getItem('isTeamChatOpen') === 'true');
  const [isTerminalOpen, setIsTerminalOpen] = useState(() => {
      const stored = localStorage.getItem('isTerminalOpen');
      return stored === null ? true : stored === 'true';
  });
  const [isExplorerOpen, setIsExplorerOpen] = useState(() => {
      const stored = localStorage.getItem('isExplorerOpen');
      return stored === null ? true : stored === 'true';
  });
  const [activeMenu, setActiveMenu] = useState(null); // For dropdown menus
  
  // File explorer features
  const [isCreatingNew, setIsCreatingNew] = useState(null); // 'file' or 'folder' or null
  const [newItemName, setNewItemName] = useState('');
  const [renamingFile, setRenamingFile] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, file: null });
  const fileInputRef = useRef(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set()); // Track expanded folders
  const [lastReadTeamChat, setLastReadTeamChat] = useState(() => 
    parseInt(localStorage.getItem(`lastReadTeamChat_${location.state?.project?._id}`)) || Date.now()
  );

  // Resizable panel sizes (persisted to localStorage)
  const [explorerWidth, setExplorerWidth] = useState(() => 
    parseInt(localStorage.getItem('explorerWidth')) || 240
  );
  const [terminalHeight, setTerminalHeight] = useState(() => 
    parseInt(localStorage.getItem('terminalHeight')) || 200
  );
  const [chatWidth, setChatWidth] = useState(() => 
    parseInt(localStorage.getItem('chatWidth')) || 320
  );
  
  // Resize state
  const [isResizing, setIsResizing] = useState(null); // 'explorer', 'terminal', 'chat'
  const resizeRef = useRef({ startX: 0, startY: 0, startSize: 0 });

  const sessions = Array.from(new Set(messages.map(m => m.sessionId || 'general'))).sort((a,b) => {
      const aVal = a === 'general' ? 0 : parseInt(a);
      const bVal = b === 'general' ? 0 : parseInt(b);
      return bVal - aVal;
  });

  // Resize handlers
  // Persist panel states
  useEffect(() => {
    localStorage.setItem('isChatOpen', isChatOpen);
  }, [isChatOpen]);

  useEffect(() => {
    localStorage.setItem('isTeamChatOpen', isTeamChatOpen);
    if (isTeamChatOpen) {
        setLastReadTeamChat(Date.now());
        localStorage.setItem(`lastReadTeamChat_${project?._id}`, Date.now());
    }
  }, [isTeamChatOpen, messages]); // Update read time if chat is open and new messages come

  const unreadTeamCount = messages.filter(msg => {
      const isTeamMsg = (msg.sessionId || 'general') === 'general';
      const msgTime = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
      return isTeamMsg && msgTime > lastReadTeamChat;
  }).length;

  useEffect(() => {
    localStorage.setItem('isTerminalOpen', isTerminalOpen);
  }, [isTerminalOpen]);
  
  useEffect(() => {
    localStorage.setItem('isExplorerOpen', isExplorerOpen);
  }, [isExplorerOpen]);

  const startResize = (type, e) => {
    e.preventDefault();
    setIsResizing(type);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startSize: type === 'explorer' ? explorerWidth : 
                 type === 'terminal' ? terminalHeight : chatWidth
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const { startX, startY, startSize } = resizeRef.current;
      
      if (isResizing === 'explorer') {
        const newWidth = Math.max(150, Math.min(500, startSize + (e.clientX - startX)));
        setExplorerWidth(newWidth);
        localStorage.setItem('explorerWidth', newWidth);
      } else if (isResizing === 'terminal') {
        const newHeight = Math.max(100, Math.min(600, startSize - (e.clientY - startY)));
        setTerminalHeight(newHeight);
        localStorage.setItem('terminalHeight', newHeight);
      } else if (isResizing === 'chat') {
        const newWidth = Math.max(250, Math.min(600, startSize - (e.clientX - startX)));
        setChatWidth(newWidth);
        localStorage.setItem('chatWidth', newWidth);
      }
    };

    const stopResize = () => {
      setIsResizing(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', stopResize);
      document.body.style.cursor = isResizing === 'terminal' ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Keyboard shortcuts (VS Code style)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+J - Toggle Terminal
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
      }
      // Ctrl+B - Toggle Sidebar (Explorer)
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setIsExplorerOpen(prev => !prev);
      }
      // Ctrl+Shift+E - Focus Explorer
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        setIsExplorerOpen(true);
      }
      // Ctrl+` - Toggle Terminal (alternative)
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
      }
      // Ctrl+Shift+Y - Toggle Chat Panel
      if (e.ctrlKey && e.shiftKey && e.key === 'Y') {
        e.preventDefault();
        setIsChatOpen(prev => !prev);
      }
      // Escape - Close menus and context menu
      if (e.key === 'Escape') {
        setActiveMenu(null);
        setContextMenu({ show: false, x: 0, y: 0, file: null });
        setIsCreatingNew(null);
        setNewItemName('');
      }
      // Ctrl+N - New file
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        setIsCreatingNew('file');
        setIsExplorerOpen(true);
      }
      // Ctrl+O - Open file
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    };

    // Click outside to close menus and context menu
    const handleClickOutside = (e) => {
      if (!e.target.closest('.menu-dropdown')) {
        setActiveMenu(null);
      }
      // Close context menu when clicking outside
      if (!e.target.closest('.context-menu')) {
        setContextMenu({ show: false, x: 0, y: 0, file: null });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleUserClick = (id) => {
    setSelectedUserId((prevSelectedUserId) => {
      const newSelectedUserId = new Set(prevSelectedUserId);
      if (newSelectedUserId.has(id)) {
        newSelectedUserId.delete(id);
      } else {
        newSelectedUserId.add(id);
      }
      return newSelectedUserId;
    });
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await axios.get(`/users/search?query=${query}`);
      setSearchResults(res.data.users);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const sendInvitation = async (recipientId) => {
    if (!project?._id) {
      alert("Project not loaded. Please refresh the page.");
      return;
    }
    try {
      await axios.post("/users/invitations/send", {
        recipientId,
        projectId: project._id,
      });
      alert("Invitation sent!");
      setSearchResults((prev) => prev.filter((u) => u._id !== recipientId));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to send invitation");
    }
  };

  const send = () => {
    if (!message.trim() || !project || !user) {
      return;
    }

    let messageToSend = message.trim();
    let targetSessionId = currentSessionId;

    // Logic for Team Chat vs AI Chat
    if (isTeamChatOpen) {
        targetSessionId = 'general';
        // Ensure we don't accidentally trigger AI in team chat unless explicitly typed (optional, but safer to assume human-only)
        // For now, if user types @ai in team chat, it WILL trigger AI if we don't strip it. 
        // But let's leave it as is -> "Team Chat" is for general, but if you @ai, maybe you want it? 
        // User request: "make ai chat box and team chat box different". 
        // Let's keep it simple: Team Chat = General. AI Chat = AI Session.
    } else if (isChatOpen) {
        // AI Chat Panel
        // If user didn't type @ai, probably implies they want to talk to AI in this panel.
        if (!messageToSend.toLowerCase().includes('@ai')) {
             messageToSend = `@ai ${messageToSend}`;
        }
    }

    const messageData = {
      message: messageToSend,
      sender: user,
      sessionId: targetSessionId,
      modelType: selectedModel,
      timestamp: Date.now()
    };

    try {
      sendMessage("typing-stop", { sender: user });
      setMessages((prevMessages) => [...prevMessages, messageData]);
      sendMessage("project-message", messageData);

      if (messageToSend.includes("@ai")) {
        setIsAiTyping(true);
      }

      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
      setMessages((prevMessages) =>
        prevMessages.filter(
          (msg, idx) =>
            !(
              msg.sender?._id === user?._id &&
              msg.message === messageToSend &&
              idx === prevMessages.length - 1
            )
        )
      );
    }
  };

  const deleteFile = async (fileName) => {
    if (!project?._id) {
      alert("Project not loaded");
      return;
    }
    
    try {
      const newFileTree = { ...fileTree };
      delete newFileTree[fileName];
      setFileTree(newFileTree);
      
      setOpenFiles(openFiles.filter(f => f !== fileName));
      if (currentFile === fileName) {
        setCurrentFile(null);
      }
      
      await axios.put('/projects/update-file-tree', {
        projectId: project._id,
        fileTree: newFileTree
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file");
      setFileTree(fileTree);
    }
  };

  // Create new file or folder
  const createNewFile = async (name, type = 'file') => {
    if (!name.trim() || !project?._id) return;
    
    const fileName = type === 'folder' ? name : name;
    
    // Check if file/folder already exists
    if (fileTree[fileName]) {
      alert(`A ${type} with that name already exists`);
      return;
    }
    
    try {
      const newFileTree = { 
        ...fileTree, 
        [fileName]: type === 'folder' 
          ? { directory: {} }  // Mark as directory
          : { file: { contents: '' } }
      };
      setFileTree(newFileTree);
      
      if (type === 'file') {
        setCurrentFile(fileName);
        setOpenFiles([...new Set([...openFiles, fileName])]);
      } else {
        // Auto-expand the new folder
        setExpandedFolders(prev => new Set([...prev, fileName]));
      }
      
      await axios.put('/projects/update-file-tree', {
        projectId: project._id,
        fileTree: newFileTree
      });
      
      setIsCreatingNew(null);
      setNewItemName('');
    } catch (error) {
      console.error("Error creating file:", error);
      alert("Failed to create file");
    }
  };

  // Rename file
  const renameFile = async (oldName, newName) => {
    if (!newName.trim() || newName === oldName || !project?._id) {
      setRenamingFile(null);
      setRenameValue('');
      return;
    }
    
    if (fileTree[newName]) {
      alert('A file with that name already exists');
      return;
    }
    
    try {
      const newFileTree = { ...fileTree };
      newFileTree[newName] = newFileTree[oldName];
      delete newFileTree[oldName];
      setFileTree(newFileTree);
      
      // Update open files
      setOpenFiles(openFiles.map(f => f === oldName ? newName : f));
      if (currentFile === oldName) {
        setCurrentFile(newName);
      }
      
      await axios.put('/projects/update-file-tree', {
        projectId: project._id,
        fileTree: newFileTree
      });
      
      setRenamingFile(null);
      setRenameValue('');
    } catch (error) {
      console.error("Error renaming file:", error);
      alert("Failed to rename file");
    }
  };

  // Toggle folder expanded/collapsed
  const toggleFolder = (folderName) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderName)) {
        newSet.delete(folderName);
      } else {
        newSet.add(folderName);
      }
      return newSet;
    });
  };

  // Check if item is a folder
  const isFolder = (item) => {
    return item?.directory !== undefined;
  };

  // Handle file from system
  const handleFileFromSystem = async (event) => {
    const file = event.target.files[0];
    if (!file || !project?._id) return;
    
    try {
      const content = await file.text();
      const newFileTree = {
        ...fileTree,
        [file.name]: { file: { contents: content } }
      };
      setFileTree(newFileTree);
      setCurrentFile(file.name);
      setOpenFiles([...new Set([...openFiles, file.name])]);
      
      await axios.put('/projects/update-file-tree', {
        projectId: project._id,
        fileTree: newFileTree
      });
    } catch (error) {
      console.error("Error opening file:", error);
      alert("Failed to open file");
    }
    
    // Reset file input
    event.target.value = '';
  };

  useEffect(() => {
    if (!project?._id || !user) return;

    let typingTimeout;

    const handleTyping = () => {
      if (!message.trim() || !user) return;

      try {
        sendMessage("typing-start", { sender: user, sessionId: isTeamChatOpen ? 'general' : currentSessionId });
        clearTimeout(typingTimeout);

        typingTimeout = setTimeout(() => {
          try {
            sendMessage("typing-stop", { sender: user, sessionId: isTeamChatOpen ? 'general' : currentSessionId });
          } catch (err) {
            console.error("Error sending typing-stop:", err);
          }
        }, 3000);
      } catch (err) {
        console.error("Error sending typing-start:", err);
      }
    };

    if (message && message.trim()) {
      handleTyping();
    }

    return () => {
      clearTimeout(typingTimeout);
      if (user) {
        try {
          sendMessage("typing-stop", { sender: user });
        } catch (err) {
          // Socket might not be initialized yet
        }
      }
    };
  }, [message, project?._id, user]);

  function WriteAiMessage(message) {
    if (!message) return null;

    let content = message;
    try {
      if (typeof message === "string" && (message.trim().startsWith("{") || message.trim().startsWith("["))) {
        const parsed = JSON.parse(message);
        
        if (parsed.type === 'fileTree' && parsed.files) {
          const fileNames = Object.keys(parsed.files);
          content = `✅ Generated ${fileNames.length} file${fileNames.length > 1 ? 's' : ''}:\n\n${fileNames.map(f => `- \`${f}\``).join('\n')}\n\nFiles have been added to the file tree on the right. You can click on any file to view and edit it.`;
        } else if (parsed.type === 'chat') {
          content = parsed.message || message;
        } else {
          content = parsed.text || parsed.message || message;
        }
      }
    } catch (e) {
      // Not JSON or parse error, keep as is
    }

    return (
      <div className={`overflow-auto ${appTheme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white border ' + colors.border} text-sm rounded-lg p-3 ${colors.text}`}>
        <Markdown
          children={content}
          options={{
            overrides: {
              code: SyntaxHighlightedCode,
            },
          }}
        />
      </div>
    );
  }

  useEffect(() => {
    if (project?._id && !new URLSearchParams(location.search).get("id")) {
      navigate(`/project?id=${project._id}`, { replace: true, state: { project } });
    }

    if (!project) {
      const projectId = new URLSearchParams(location.search).get("id");

      if (projectId) {
        axios
          .get(`/projects/get-project/${projectId}`)
          .then((res) => {
            console.log(res.data.project);
            setProject(res.data.project);
            setFileTree(res.data.project.fileTree || {});
            setMessages(res.data.project.messages || []);
          })
          .catch((err) => {
            console.error("Error fetching project:", err);
            alert("Failed to load project. Redirecting to home...");
            navigate("/");
          });
      } else {
        alert("No project data found. Redirecting to home...");
        navigate("/");
      }
    } else {
      axios
        .get(`/projects/get-project/${project._id}`)
        .then((res) => {
          console.log(res.data.project);
          setProject(res.data.project);
          setFileTree(res.data.project.fileTree || {});
          setMessages(res.data.project.messages || []);
        })
        .catch((err) => {
          console.error("Error fetching project:", err);
        });
    }

    axios
      .get("/users/all")
      .then((res) => {
        setUsers(res.data.users);
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
      });
      
    const savedSessionId = localStorage.getItem(`currentSession_${project?._id}`);
    // AI Chat should never use 'general'. Default to a new session if none saved or if saved was 'general'.
    setCurrentSessionId((savedSessionId && savedSessionId !== 'general') ? savedSessionId : Date.now().toString());
  }, []);

  // Sync messages from database (backup for Socket.IO)
  useEffect(() => {
    if (!project?._id) return;

    const intervalId = setInterval(() => {
      axios.get(`/projects/get-project/${project._id}`)
        .then((res) => {
          setMessages(res.data.project.messages || []);
        })
        .catch((err) => {
          console.error("Error syncing messages:", err);
        });
    }, 2000);

    return () => clearInterval(intervalId);
  }, [project?._id]);

  useEffect(() => {
    if (project?._id && currentSessionId) {
      localStorage.setItem(`currentSession_${project._id}`, currentSessionId);
    }
  }, [currentSessionId, project?._id]);

  // Initialize socket connection once
  // Consolidate socket initialization and listeners
  useEffect(() => {
    if (!project?._id || !user) return;

    console.log("Initializing socket for project:", project._id);
    const socket = initializeSocket(project._id);

    const typingStartHandler = (data) => {
      console.log("Typing start received:", data);
      const senderId = data.sender?._id?.toString();
      if (senderId && senderId !== user?._id?.toString()) {
        setTypingUsers((prev) => ({
             ...prev,
             [senderId]: data.sessionId || 'general' // Default to general if undefined
        }));
      }
    };

    const typingStopHandler = (data) => {
      if (data.sender?._id?.toString() !== user?._id?.toString()) {
        setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[data.sender?._id?.toString()];
            return next;
            // Logic: if multiple sessions, this removes user entirely. 
            // Ideally should match sessionId, but typing-stop usually means "stopped typing anywhere".
        });
      }
    };

    const messageHandler = (data) => {
      console.log("Socket received message:", data);

      if (data.sender?._id == "ai") {
        setIsAiTyping(false); 
        const messageContent = data.message || "";
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(messageContent);
        } catch (e) {
            parsedMessage = { type: 'chat', message: messageContent };
        }

        const processFileTree = (files) => {
            if (!files || Object.keys(files).length === 0) return;
            
            setFileTree((prevFileTree) => {
                const normalizedFileTree = {};
                Object.keys(files).forEach((filePath) => {
                    const fileData = files[filePath];
                    if (fileData?.file?.contents) {
                        normalizedFileTree[filePath] = fileData;
                    }
                });
                
                const mergedFileTree = { ...prevFileTree, ...normalizedFileTree };
                if (project?._id) saveFileTree(mergedFileTree);
                setWebContainer((wc) => {
                  if (wc) wc.mount(normalizedFileTree).catch(console.error);
                  return wc;
                });
                return mergedFileTree;
            });
        };

        let messageToStore = { ...data };

        if (parsedMessage.type === 'fileTree') {
             processFileTree(parsedMessage.files);
             const fileNames = Object.keys(parsedMessage.files || {});
             messageToStore.message = JSON.stringify({ 
                 text: fileNames.length === 1 
                     ? `Generated ${fileNames[0]}` 
                     : `Generated ${fileNames.join(', ')}`
             });
        } 
        else if (parsedMessage.type === 'executionPlan') {
             const { file, execution } = parsedMessage;
             messageToStore.message = JSON.stringify({ 
                 text: `📋 Execution Plan for ${file.name}:\nEnvironment: ${execution.environment}\nLanguage: ${execution.language}\nReason: ${execution.reason}` 
             });
        }
        else if (parsedMessage.type === 'composite') {
             if (parsedMessage.actions) {
                 let filesGenerated = [];
                 parsedMessage.actions.forEach(action => {
                     if (action.type === 'fileTree') {
                         processFileTree(action.files);
                         filesGenerated.push(...Object.keys(action.files || {}));
                     }
                 });
                 const chatAction = parsedMessage.actions.find(a => a.type === 'chat');
                 if (chatAction) {
                     messageToStore.message = JSON.stringify({ 
                         text: chatAction.message
                     });
                 } else if (filesGenerated.length > 0) {
                     messageToStore.message = JSON.stringify({ 
                         text: filesGenerated.length === 1 
                             ? `Generated ${filesGenerated[0]}` 
                             : `Generated ${filesGenerated.join(', ')}`
                     });
                 } else {
                     return;
                 }
             }
        }
        else if (parsedMessage.type === 'chat') {
             messageToStore.message = JSON.stringify({ text: parsedMessage.message });
        }
        else {
             if (parsedMessage.fileTree) processFileTree(parsedMessage.fileTree);
             messageToStore.message = JSON.stringify({ 
                 text: parsedMessage.text || parsedMessage.message || messageContent
             });
        }

        setMessages((prevMessages) => {
             const isDuplicate = prevMessages.some(msg => 
                 msg.sender?._id === data.sender?._id && 
                 msg.message === messageToStore.message
             );
             if (isDuplicate) return prevMessages;
             return [...prevMessages, messageToStore];
        });
      } else {
        // Human/General Message Handling
        setMessages((prevMessages) => {
          // Optimization: If message is already there (local add), update it or ignore
          const isDuplicate = prevMessages.some(
            (msg) =>
              msg.sender?._id === data.sender?._id &&
              msg.message === data.message &&
              msg.sessionId === data.sessionId
          );

          if (isDuplicate) {
            console.log("Duplicate message ignored (already in state):", data.message);
            return prevMessages;
          }

          console.log("Adding new message to state:", data);
          return [...prevMessages, data];
        });
      }
    };

    receiveMessage("project-message", messageHandler);
    receiveMessage("typing-start", typingStartHandler);
    receiveMessage("typing-stop", typingStopHandler);

    return () => {
      console.log("Cleaning up socket listeners");
      removeListener("project-message", messageHandler);
      removeListener("typing-start", typingStartHandler);
      removeListener("typing-stop", typingStopHandler);
      disconnectSocket();
    };
  }, [project?._id, user]);

  // Set up message handlers


  useEffect(() => {
    console.log("WebContainer initialization useEffect triggered");
    console.log("Current webContainer state:", webContainer);
    
    if (!webContainer) {
      console.log("WebContainer not found, attempting to boot...");
      console.log("Cross-Origin Isolated:", window.crossOriginIsolated);
      
      getWebContainer()
        .then((container) => {
          console.log("✅ WebContainer booted successfully:", container);
          setWebContainer(container);
        })
        .catch((err) => {
          console.error("❌ Error initializing web container:", err);
          let errorMessage = "Failed to initialize WebContainer.";
          
          if (!window.crossOriginIsolated) {
            errorMessage += "\n\nCRITICAL: Your browser is NOT cross-origin isolated. This is required for WebContainers to run.";
            errorMessage += "\n\nTroubleshooting:";
            errorMessage += "\n1. Ensure you are using HTTPS (or localhost).";
            errorMessage += "\n2. Check if COOP/COEP headers are set (we've added them to vercel.json).";
            errorMessage += "\n3. Try a hard refresh (Ctrl+F5) or Incognito mode.";
            errorMessage += "\n4. Some browsers like Brave might require manual settings for isolation.";
          } else {
            errorMessage += `\n\nError details: ${err.message || 'Unknown error'}`;
          }
          
          alert(errorMessage + "\n\nPlease check the browser console for details.");
        });
    } else {
      console.log("WebContainer already initialized");
    }
  }, []);

  function saveFileTree(ft) {
    if (!project?._id) {
      console.error("Cannot save file tree: project not loaded");
      return;
    }
    axios
      .put("/projects/update-file-tree", {
        projectId: project._id,
        fileTree: ft,
      })
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => {
        console.error("Error saving file tree:", err);
      });
  }

  function scrollToBottom() {
    if (messageBox.current) {
      messageBox.current.scrollTop = messageBox.current.scrollHeight;
    }
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers, isAiTyping, isChatOpen, isTeamChatOpen]);

  if (!project) {
    return (
      <main className="h-screen w-screen flex items-center justify-center bg-[#1e1e1e]">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-[#0078d4] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm text-gray-400">Loading project...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={`h-screen w-screen flex flex-col ${colors.bg} overflow-hidden`}>
      {/* VS Code Style Menu Bar */}
      <div className={`h-8 ${appTheme === 'dark' ? 'bg-[#323233]' : 'bg-[#f3f3f3]'} flex items-center px-2 border-b ${colors.border} shrink-0`}>
        {/* Left - Menu Items */}
        <div className="flex items-center gap-0 relative menu-dropdown">
          <div className="flex items-center gap-2 px-2 mr-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
             <div className='w-6 h-6 flex items-center justify-center overflow-hidden'>
                 <img src="/logo.png" alt="codeX" className={`w-full h-full object-contain ${appTheme === 'dark' ? 'mix-blend-screen' : 'invert'}`} />
             </div>
          </div>
          
          {/* File Menu */}
          <div className="relative">
            <button 
              className={`px-2.5 py-1 text-[13px] ${colors.text} ${colors.menuHover} rounded-sm transition-colors ${activeMenu === 'File' ? colors.menuHover : ''}`}
              onClick={() => setActiveMenu(activeMenu === 'File' ? null : 'File')}
            >
              File
            </button>
            {activeMenu === 'File' && (
              <div className={`absolute top-full left-0 mt-0.5 ${colors.sidebar} border ${colors.border} rounded shadow-xl min-w-[220px] py-1 z-50`}>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => { setIsCreatingNew('file'); setActiveMenu(null); setIsExplorerOpen(true); }}>
                  <span>New File</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+N</span>
                </button>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => { setIsCreatingNew('folder'); setActiveMenu(null); setIsExplorerOpen(true); }}>
                  <span>New Folder</span>
                  <span className={`${colors.secondaryText} text-xs`}></span>
                </button>
                <div className={`border-t ${colors.border} my-1`}></div>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => { fileInputRef.current?.click(); setActiveMenu(null); }}>
                  <span>Open File...</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+O</span>
                </button>
                <div className={`border-t ${colors.border} my-1`}></div>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => { saveFileContent(); setActiveMenu(null); }}>
                  <span>Save</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+S</span>
                </button>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => setActiveMenu(null)}>
                  <span>Save All</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+K S</span>
                </button>
                <div className={`border-t ${colors.border} my-1`}></div>
                <button 
                  className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} 
                  onClick={() => { navigate('/'); setActiveMenu(null); }}
                >
                  <span>Close Project</span>
                  <span className={`${colors.secondaryText} text-xs`}></span>
                </button>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="relative">
            <button 
              className={`px-2.5 py-1 text-[13px] ${colors.text} ${colors.menuHover} rounded-sm transition-colors ${activeMenu === 'Edit' ? colors.menuHover : ''}`}
              onClick={() => setActiveMenu(activeMenu === 'Edit' ? null : 'Edit')}
            >
              Edit
            </button>
            {activeMenu === 'Edit' && (
              <div className={`absolute top-full left-0 mt-0.5 ${colors.sidebar} border ${colors.border} rounded shadow-xl min-w-[220px] py-1 z-50`}>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => { document.execCommand('undo'); setActiveMenu(null); }}>
                  <span>Undo</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+Z</span>
                </button>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => { document.execCommand('redo'); setActiveMenu(null); }}>
                  <span>Redo</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+Y</span>
                </button>
                <div className={`border-t ${colors.border} my-1`}></div>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => { document.execCommand('cut'); setActiveMenu(null); }}>
                  <span>Cut</span>
                </button>
                <button className="w-full px-4 py-1.5 text-left text-[13px] text-gray-300 hover:bg-[#094771] flex justify-between items-center" onClick={() => { document.execCommand('copy'); setActiveMenu(null); }}>
                  <span>Copy</span>
                  <span className="text-gray-500 text-xs">Ctrl+C</span>
                </button>
                <button className="w-full px-4 py-1.5 text-left text-[13px] text-gray-300 hover:bg-[#094771] flex justify-between items-center" onClick={() => { document.execCommand('paste'); setActiveMenu(null); }}>
                  <span>Paste</span>
                  <span className="text-gray-500 text-xs">Ctrl+V</span>
                </button>
              </div>
            )}
          </div>

          {/* Selection Menu */}
          <div className="relative">
            <button 
              className={`px-2.5 py-1 text-[13px] ${colors.text} ${colors.menuHover} rounded-sm transition-colors ${activeMenu === 'Selection' ? colors.menuHover : ''}`}
              onClick={() => setActiveMenu(activeMenu === 'Selection' ? null : 'Selection')}
            >
              Selection
            </button>
            {activeMenu === 'Selection' && (
              <div className={`absolute top-full left-0 mt-0.5 ${colors.sidebar} border ${colors.border} rounded shadow-xl min-w-[220px] py-1 z-50`}>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => { document.execCommand('selectAll'); setActiveMenu(null); }}>
                  <span>Select All</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+A</span>
                </button>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => setActiveMenu(null)}>
                  <span>Expand Selection</span>
                  <span className={`${colors.secondaryText} text-xs`}>Shift+Alt+Right</span>
                </button>
                <div className={`border-t ${colors.border} my-1`}></div>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => setActiveMenu(null)}>
                  <span>Add Cursors Above</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+Alt+Up</span>
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="relative">
            <button 
              className={`px-2.5 py-1 text-[13px] ${colors.text} ${colors.menuHover} rounded-sm transition-colors ${activeMenu === 'View' ? colors.menuHover : ''}`}
              onClick={() => setActiveMenu(activeMenu === 'View' ? null : 'View')}
            >
              View
            </button>
            {activeMenu === 'View' && (
              <div className={`absolute top-full left-0 mt-0.5 ${colors.sidebar} border ${colors.border} rounded shadow-xl min-w-[220px] py-1 z-50`}>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => { setIsExplorerOpen(!isExplorerOpen); setActiveMenu(null); }}>
                  <span><i className="ri-checkbox-line text-xs mr-2" style={{opacity: isExplorerOpen ? 1 : 0}}></i>Explorer</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+Shift+E</span>
                </button>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => { setIsTerminalOpen(!isTerminalOpen); setActiveMenu(null); }}>
                  <span><i className="ri-checkbox-line text-xs mr-2" style={{opacity: isTerminalOpen ? 1 : 0}}></i>Terminal</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+J</span>
                </button>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => { setIsChatOpen(!isChatOpen); setActiveMenu(null); }}>
                  <span><i className="ri-checkbox-line text-xs mr-2" style={{opacity: isChatOpen ? 1 : 0}}></i>AI Chat</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+Shift+Y</span>
                </button>
                <div className={`border-t ${colors.border} my-1`}></div>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => setActiveMenu(null)}>
                  <span>Word Wrap</span>
                  <span className={`${colors.secondaryText} text-xs`}>Alt+Z</span>
                </button>
              </div>
            )}
          </div>

          {/* Go Menu */}
          <div className="relative">
            <button 
              className={`px-2.5 py-1 text-[13px] ${colors.text} ${colors.menuHover} rounded-sm transition-colors ${activeMenu === 'Go' ? colors.menuHover : ''}`}
              onClick={() => setActiveMenu(activeMenu === 'Go' ? null : 'Go')}
            >
              Go
            </button>
            {activeMenu === 'Go' && (
              <div className={`absolute top-full left-0 mt-0.5 ${colors.sidebar} border ${colors.border} rounded shadow-xl min-w-[220px] py-1 z-50`}>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => setActiveMenu(null)}>
                  <span>Go to File...</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+P</span>
                </button>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => setActiveMenu(null)}>
                  <span>Go to Line...</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+G</span>
                </button>
              </div>
            )}
          </div>

          {/* Run Menu */}
          <div className="relative">
            <button 
              className={`px-2.5 py-1 text-[13px] ${colors.text} ${colors.menuHover} rounded-sm transition-colors ${activeMenu === 'Run' ? colors.menuHover : ''}`}
              onClick={() => setActiveMenu(activeMenu === 'Run' ? null : 'Run')}
            >
              Run
            </button>
            {activeMenu === 'Run' && (
              <div className={`absolute top-full left-0 mt-0.5 ${colors.sidebar} border ${colors.border} rounded shadow-xl min-w-[220px] py-1 z-50`}>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => setActiveMenu(null)}>
                  <span>Start Debugging</span>
                  <span className={`${colors.secondaryText} text-xs`}>F5</span>
                </button>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => setActiveMenu(null)}>
                  <span>Run Without Debugging</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+F5</span>
                </button>
                <div className={`border-t ${colors.border} my-1`}></div>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => setActiveMenu(null)}>
                  <span>Add Configuration...</span>
                  <span className={`${colors.secondaryText} text-xs`}></span>
                </button>
              </div>
            )}
          </div>

          {/* Terminal Menu */}
          <div className="relative">
            <button 
              className={`px-2.5 py-1 text-[13px] ${colors.text} ${colors.menuHover} rounded-sm transition-colors ${activeMenu === 'Terminal' ? colors.menuHover : ''}`}
              onClick={() => setActiveMenu(activeMenu === 'Terminal' ? null : 'Terminal')}
            >
              Terminal
            </button>
            {activeMenu === 'Terminal' && (
              <div className={`absolute top-full left-0 mt-0.5 ${colors.sidebar} border ${colors.border} rounded shadow-xl min-w-[220px] py-1 z-50`}>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => { setIsTerminalOpen(true); setActiveMenu(null); }}>
                  <span>New Terminal</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+Shift+`</span>
                </button>
                <div className={`border-t ${colors.border} my-1`}></div>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => { setTerminalOutput([]); setActiveMenu(null); }}>
                  <span>Clear Terminal</span>
                  <span className={`${colors.secondaryText} text-xs`}></span>
                </button>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => { setIsTerminalOpen(!isTerminalOpen); setActiveMenu(null); }}>
                  <span>{isTerminalOpen ? 'Hide' : 'Show'} Terminal</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+J</span>
                </button>
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div className="relative">
            <button 
              className={`px-2.5 py-1 text-[13px] ${colors.text} ${colors.menuHover} rounded-sm transition-colors ${activeMenu === 'Help' ? colors.menuHover : ''}`}
              onClick={() => setActiveMenu(activeMenu === 'Help' ? null : 'Help')}
            >
              Help
            </button>
            {activeMenu === 'Help' && (
              <div className={`absolute top-full left-0 mt-0.5 ${colors.sidebar} border ${colors.border} rounded shadow-xl min-w-[220px] py-1 z-50`}>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => setActiveMenu(null)}>
                  <span>Welcome</span>
                  <span className={`${colors.secondaryText} text-xs`}></span>
                </button>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => setActiveMenu(null)}>
                  <span>Keyboard Shortcuts</span>
                  <span className={`${colors.secondaryText} text-xs`}>Ctrl+K Ctrl+S</span>
                </button>
                <div className={`border-t ${colors.border} my-1`}></div>
                <button className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex justify-between items-center`} onClick={() => setActiveMenu(null)}>
                  <span>About</span>
                  <span className={`${colors.secondaryText} text-xs`}></span>
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Center - Title */}
        <div className="flex-grow flex justify-center">
          <span className="text-[13px] text-gray-400">
            {project?.name || 'Project'} - codeX {currentFile ? `- ${currentFile}` : ''}
          </span>
        </div>
        
        {/* Right - Editor Settings */}
        <div className="flex items-center gap-1 relative">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`w-8 h-8 flex items-center justify-center ${colors.headerText} hover:bg-white/10 rounded-full transition-colors`}
            title="Editor Settings"
          >
            <i className={`ri-settings-3-line text-lg ${isSettingsOpen ? 'rotate-90' : ''} transition-transform duration-300`}></i>
          </button>

          {isSettingsOpen && (
            <div className={`absolute top-full right-0 mt-2 ${colors.sidebar} border ${colors.border} rounded-xl shadow-2xl min-w-[240px] py-3 z-[100] animate-in fade-in slide-in-from-top-2 duration-200`}>
              <div className="px-4 py-2 border-b border-white/5 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Editor Settings</span>
              </div>
              
              {/* Theme Selector */}
              <div className="px-4 py-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block">Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'vs-dark', name: 'VS Dark', color: '#1e1e1e' },
                    { id: 'vs-light', name: 'VS Light', color: '#ffffff' },
                    { id: 'monokai', name: 'Monokai', color: '#272822' },
                    { id: 'github-dark', name: 'GitHub', color: '#0d1117' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleThemeChange(t.id)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all ${
                        user?.editorTheme === t.id 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-white/5 hover:border-white/20 bg-white/5'
                      }`}
                    >
                      <div className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: t.color }}></div>
                      <span className="text-[11px] truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-white/5 my-2 mx-4"></div>

              {/* Font Size */}
              <div className="px-4 py-2 flex items-center justify-between">
                <label className="text-xs font-medium">Font Size</label>
                <div className="flex items-center gap-2 bg-white/5 rounded-lg p-1 border border-white/5">
                  <button 
                    onClick={() => handleFontSizeChange(Math.max(8, editorFontSize - 1))}
                    className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors"
                  >
                    <i className="ri-subtract-line text-xs"></i>
                  </button>
                  <span className="text-xs min-w-[20px] text-center font-mono">{editorFontSize}</span>
                  <button 
                    onClick={() => handleFontSizeChange(Math.min(32, editorFontSize + 1))}
                    className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors"
                  >
                    <i className="ri-add-line text-xs"></i>
                  </button>
                </div>
              </div>

              {/* Word Wrap */}
              <div className="px-4 py-2 flex items-center justify-between">
                <label className="text-xs font-medium">Word Wrap</label>
                <button 
                  onClick={() => handleWordWrapChange(!editorWordWrap)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${editorWordWrap ? 'bg-blue-600' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editorWordWrap ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="h-px bg-white/5 my-2 mx-4"></div>

              <button 
                onClick={() => navigate('/dashboard')}
                className="w-full px-4 py-2 text-left text-xs text-red-400 hover:bg-red-400/10 flex items-center gap-2 transition-colors"
              >
                <i className="ri-logout-box-r-line"></i>
                Exit Project
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`main flex h-screen w-screen overflow-hidden ${colors.text} ${colors.bg}`}>
      {/* Activity Bar - Vertical Strip on the far left */}
      <aside className={`w-12 ${colors.activityBar} flex flex-col items-center py-4 gap-4 z-30`}>
        <button 
          className={`w-12 h-12 flex items-center justify-center ${colors.secondaryText} hover:text-white transition-colors border-l-2 border-transparent hover:bg-white/10`}
          onClick={() => navigate('/dashboard')}
          title="Home"
        >
          <i className="ri-home-4-line text-xl"></i>
        </button>
        <button 
          className={`w-12 h-12 flex items-center justify-center transition-colors ${
            isExplorerOpen ? 'text-white border-l-2 border-white bg-white/10' : `${colors.secondaryText} hover:text-white border-l-2 border-transparent hover:bg-white/10`
          }`}
          onClick={() => setIsExplorerOpen(!isExplorerOpen)}
          title="Explorer (Ctrl+B)"
        >
          <i className="ri-file-copy-line text-xl"></i>
        </button>
        <button 
          className={`w-12 h-12 flex items-center justify-center transition-colors ${
            isChatOpen ? 'text-white border-l-2 border-white bg-white/10' : `${colors.secondaryText} hover:text-white border-l-2 border-transparent hover:bg-white/10`
          }`}
          onClick={() => {
            setIsChatOpen(!isChatOpen);
            setIsTeamChatOpen(false);
          }}
          title="codeX AI"
        >
          <i className="ri-robot-line text-xl"></i>
        </button>
        <button 
          onClick={() => {
            setIsTeamChatOpen(!isTeamChatOpen);
            setIsChatOpen(false);
            if (!isTeamChatOpen) { // Opening
                setLastReadTeamChat(Date.now());
                localStorage.setItem(`lastReadTeamChat_${project?._id}`, Date.now());
            }
          }}
          className={`w-12 h-12 flex items-center justify-center transition-colors relative ${
            isTeamChatOpen ? 'text-white border-l-2 border-white bg-white/10' : `${colors.secondaryText} hover:text-white border-l-2 border-transparent hover:bg-white/10`
          }`}
          title="Team Chat"
        >
          <i className="ri-team-line text-xl"></i>
          {unreadTeamCount > 0 && !isTeamChatOpen && (
            <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 bg-[#e53e3e] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadTeamCount > 99 ? '99+' : unreadTeamCount}
            </span>
          )}
        </button>
        <div className="flex-grow"></div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className={`w-12 h-12 flex items-center justify-center ${colors.secondaryText} hover:text-white transition-colors`}
          title="Invite Collaborators"
        >
          <i className="ri-user-add-line text-xl"></i>
        </button>
      </aside>

      {/* Hidden file input for opening files from system */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileFromSystem} 
        className="hidden" 
        accept=".js,.jsx,.ts,.tsx,.json,.css,.html,.py,.cpp,.c,.java,.txt,.md"
      />

      {/* Side Explorer Panel */}
      {isExplorerOpen && (
      <div 
        className={`w-64 h-full ${colors.sidebar} border-r ${colors.border} relative flex flex-col z-20`}
        style={{ width: explorerWidth }}
      >
        <header className={`p-3 border-b ${colors.border} flex justify-between items-center bg-black/5`}>
          <h2 className={`text-[11px] font-bold ${colors.headerText} uppercase tracking-wider`}>Explorer</h2>
          <div className="flex gap-1">
            <button 
              onClick={() => setIsCreatingNew('file')}
              className={`${colors.headerText} hover:text-white p-0.5`}
              title="New File"
            >
              <i className="ri-file-add-line text-sm"></i>
            </button>
            <button 
              onClick={() => setIsCreatingNew('folder')}
              className={`${colors.headerText} hover:text-white p-0.5`}
              title="New Folder"
            >
              <i className="ri-folder-add-line text-sm"></i>
            </button>
            <button 
              onClick={() => setIsExplorerOpen(false)}
              className={`${colors.headerText} hover:text-white p-0.5`}
              title="Close Sidebar (Ctrl+B)"
            >
              <i className="ri-close-line text-sm"></i>
            </button>
          </div>
        </header>
        <div className="px-2 py-1">
          <div className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-gray-300 uppercase tracking-wide">
            <i className="ri-arrow-down-s-line text-sm"></i>
            <span>{project?.name || 'PROJECT'}</span>
          </div>
        </div>
        
        {/* Create New File/Folder Input */}
        {isCreatingNew && (
          <div className="px-4 py-1">
            <div className="flex items-center gap-2 bg-[#3c3c3c] rounded px-2 py-1">
              <i className={`text-sm ${isCreatingNew === 'folder' ? 'ri-folder-line text-yellow-400' : 'ri-file-line text-gray-400'}`}></i>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    createNewFile(newItemName, isCreatingNew);
                  } else if (e.key === 'Escape') {
                    setIsCreatingNew(null);
                    setNewItemName('');
                  }
                }}
                onBlur={() => {
                  setIsCreatingNew(null);
                  setNewItemName('');
                }}
                placeholder={`New ${isCreatingNew}... (Esc to cancel)`}
                className="flex-grow bg-transparent text-[13px] text-white outline-none placeholder-gray-500"
                autoFocus
              />
            </div>
          </div>
        )}
        
        <div className="flex-grow overflow-auto">
          {Object.keys(fileTree).length === 0 && !isCreatingNew ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <i className="ri-folder-open-line text-3xl mb-2 block opacity-50"></i>
              <p className="text-xs">No files yet</p>
              <p className="text-[10px] mt-1 opacity-70">Click + to create files</p>
            </div>
          ) : (
            Object.keys(fileTree).map((fileName, index) => {
              const item = fileTree[fileName];
              const itemIsFolder = isFolder(item);
              const isExpanded = expandedFolders.has(fileName);
              
              // Rename mode
              if (renamingFile === fileName) {
                return (
                  <div key={index} className="px-4 py-1">
                    <div className="flex items-center gap-2 bg-[#3c3c3c] rounded px-2 py-1">
                      <i className={`text-sm ${itemIsFolder ? 'ri-folder-line text-yellow-400' : 'ri-file-code-line text-gray-400'}`}></i>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') renameFile(fileName, renameValue);
                          else if (e.key === 'Escape') { setRenamingFile(null); setRenameValue(''); }
                        }}
                        onBlur={() => renameFile(fileName, renameValue)}
                        className="flex-grow bg-transparent text-[13px] text-white outline-none"
                        autoFocus
                      />
                    </div>
                  </div>
                );
              }
              
              // Folder rendering
              if (itemIsFolder) {
                return (
                  <div key={index}>
                    <button
                      onClick={() => toggleFolder(fileName)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ show: true, x: e.clientX, y: e.clientY, file: fileName });
                      }}
                      className={`w-full text-left px-4 py-1 flex items-center gap-1 text-[13px] transition-colors group text-gray-300 hover:bg-[#2a2d2e]`}
                    >
                      <i className={`text-xs transition-transform ${isExpanded ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'}`}></i>
                      <i className={`text-sm ${isExpanded ? 'ri-folder-open-line text-yellow-400' : 'ri-folder-line text-yellow-400'}`}></i>
                      <span className="truncate flex-grow">{fileName}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <i 
                          className="ri-file-add-line text-gray-500 hover:text-white text-xs"
                          onClick={(e) => { e.stopPropagation(); /* TODO: Create file in folder */ }}
                          title="New File in Folder"
                        ></i>
                        <i 
                          className="ri-pencil-line text-gray-500 hover:text-white text-xs"
                          onClick={(e) => { e.stopPropagation(); setRenamingFile(fileName); setRenameValue(fileName); }}
                          title="Rename"
                        ></i>
                        <i 
                          className="ri-delete-bin-line text-gray-500 hover:text-red-400 text-xs"
                          onClick={(e) => { e.stopPropagation(); deleteFile(fileName); }}
                          title="Delete"
                        ></i>
                      </div>
                    </button>
                    {/* Folder contents would go here if we support nested structure */}
                    {isExpanded && (
                      <div className="pl-4 border-l border-[#3c3c3c] ml-5">
                        <div className="px-2 py-2 text-xs text-gray-500 italic">Empty folder</div>
                      </div>
                    )}
                  </div>
                );
              }
              
              // File rendering
              return (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentFile(fileName);
                    setOpenFiles([...new Set([...openFiles, fileName])]);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ show: true, x: e.clientX, y: e.clientY, file: fileName });
                  }}
                  className={`w-full text-left px-4 py-1 flex items-center gap-2 text-[13px] transition-colors group ${
                    currentFile === fileName ? 'bg-[#0078d4]/20 border-l-2 border-l-[#0078d4]' : `hover:${colors.menuHover}`
                  }`}
                >
                  <i className={`text-base flex-shrink-0 ${
                    fileName.endsWith('.js') || fileName.endsWith('.jsx') ? 'ri-javascript-fill text-yellow-400' :
                    fileName.endsWith('.ts') || fileName.endsWith('.tsx') ? 'ri-code-box-fill text-blue-400' :
                    fileName.endsWith('.json') ? 'ri-braces-fill text-yellow-500' :
                    fileName.endsWith('.css') ? 'ri-css3-fill text-blue-300' :
                    fileName.endsWith('.html') ? 'ri-html5-fill text-orange-400' :
                    fileName.endsWith('.py') ? 'ri-python-fill text-green-400' :
                    `ri-file-code-line ${colors.secondaryText}`
                  }`}></i>
                  <span className={`truncate flex-grow ${colors.text} ${currentFile === fileName ? 'font-bold' : ''}`}>{fileName}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i 
                      className={`${colors.secondaryText} hover:text-white text-xs ri-pencil-line`}
                      onClick={(e) => { e.stopPropagation(); setRenamingFile(fileName); setRenameValue(fileName); }}
                      title="Rename"
                    ></i>
                    <i 
                      className={`${colors.secondaryText} hover:text-red-400 text-xs ri-delete-bin-line`}
                      onClick={(e) => { e.stopPropagation(); deleteFile(fileName); }}
                      title="Delete"
                    ></i>
                  </div>
                </button>
              );
            })
          )}
        </div>
        {/* Resize Handle */}
        <div 
          className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-[#0078d4] transition-colors z-10"
          onMouseDown={(e) => startResize('explorer', e)}
        />
      </div>
      )}

      {/* Context Menu */}
      {contextMenu.show && (
        <div 
          className={`fixed ${colors.sidebar} border ${colors.border} rounded shadow-xl min-w-[160px] py-1 z-50`}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={() => setContextMenu({ show: false, x: 0, y: 0, file: null })}
        >
          <button 
            className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-[#0078d4] hover:text-white flex items-center gap-2`}
            onClick={() => {
              setRenamingFile(contextMenu.file);
              setRenameValue(contextMenu.file);
            }}
          >
            <i className="ri-pencil-line text-xs"></i>
            Rename
          </button>
          <button 
            className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} hover:bg-red-500/10 hover:text-red-400 flex items-center gap-2`}
            onClick={() => deleteFile(contextMenu.file)}
          >
            <i className="ri-delete-bin-line text-xs"></i>
            Delete
          </button>
          <div className={`border-t ${colors.border} my-1`}></div>
          <button 
            className={`w-full px-4 py-1.5 text-left text-[13px] ${colors.text} ${colors.menuHover} flex items-center gap-2`}
            onClick={() => {
              navigator.clipboard.writeText(fileTree[contextMenu.file]?.file?.contents || '');
            }}
          >
            <i className="ri-file-copy-line text-xs"></i>
            Copy Content
          </button>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-grow flex flex-col min-w-0">
        {/* Tabs Bar */}
        <div className={`h-9 ${colors.sidebar} flex items-center border-b ${colors.border}`}>
          <div className="flex overflow-x-auto">
            {openFiles.map((file, index) => (
              <button
                key={index}
                onClick={() => setCurrentFile(file)}
                className={`h-9 px-3 flex items-center gap-2 text-[13px] border-r ${colors.border} min-w-fit group ${
                  currentFile === file 
                    ? colors.activeTab 
                    : colors.inactiveTab
                }`}
              >
                <i className={`text-sm ${
                  file.endsWith('.js') || file.endsWith('.jsx') ? 'ri-javascript-line text-yellow-400' :
                  file.endsWith('.json') ? 'ri-braces-line text-yellow-300' :
                  file.endsWith('.css') ? 'ri-css3-line text-blue-300' :
                  'ri-file-code-line text-gray-400'
                }`}></i>
                <span>{file}</span>
                <i 
                  className="ri-close-line text-gray-500 hover:text-white ml-1 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newOpenFiles = openFiles.filter(f => f !== file);
                    setOpenFiles(newOpenFiles);
                    if (currentFile === file) {
                      setCurrentFile(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
                    }
                  }}
                ></i>
              </button>
            ))}
          </div>
          <div className="flex-grow"></div>
          {/* Run Button */}
          <div className="flex items-center gap-1 px-2">
            <button
              onClick={async () => {
                console.log("Run button clicked");
                console.log("WebContainer:", webContainer);
                console.log("FileTree:", fileTree);

                if (!webContainer) {
                  alert("WebContainer is not ready. Please wait and try again...");
                  return;
                }

                if (!fileTree || Object.keys(fileTree).length === 0) {
                  alert("No files to run. Please create some files first using AI.");
                  return;
                }

                setIsRunning(true);

                try {
                  const normalizedFileTree = {};
                  Object.keys(fileTree).forEach((filePath) => {
                    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
                    const fileData = fileTree[filePath];
                    
                    if (fileData && fileData.file && fileData.file.contents) {
                      normalizedFileTree[cleanPath] = fileData;
                    } else if (typeof fileData === "string") {
                      normalizedFileTree[cleanPath] = {
                        file: { contents: fileData },
                      };
                    }
                  });

                  if (Object.keys(normalizedFileTree).length === 0) {
                    throw new Error("No valid files found in fileTree");
                  }

                  await webContainer.mount(normalizedFileTree);

                  const hasPackageJson = normalizedFileTree["package.json"];

                  if (runProcess) {
                    runProcess.kill();
                    setRunProcess(null);
                  }

                  if (hasPackageJson) {
                    setTerminalOutput(prev => [...prev, `📦 Running npm install...`]);
                    const installProcess = await webContainer.spawn("npm", ["install"]);
                    installProcess.output.pipeTo(new WritableStream({
                      write(chunk) {
                        const cleaned = chunk.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').trim();
                        if (cleaned) {
                           console.log("Install output:", cleaned);
                           setTerminalOutput(prev => [...prev, cleaned]);
                        }
                      }
                    }));

                    await installProcess.exit;
                    setTerminalOutput(prev => [...prev, `✅ Dependencies installed`]);

                    let runCommand = ["start"];
                    try {
                      const pkgJson = JSON.parse(normalizedFileTree["package.json"].file.contents);
                      if (pkgJson.scripts?.dev) runCommand = ["run", "dev"];
                      else if (pkgJson.scripts?.start) runCommand = ["start"];
                    } catch (e) {}

                    setTerminalOutput(prev => [...prev, `▶ Running application...`]);
                    let tempRunProcess = await webContainer.spawn("npm", runCommand);
                    tempRunProcess.output.pipeTo(new WritableStream({
                      write(chunk) { 
                        const cleaned = chunk.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').trim();
                        if (cleaned) {
                          console.log("App output:", cleaned);
                          setTerminalOutput(prev => [...prev, cleaned]);
                        }
                      }
                    }));

                    setRunProcess(tempRunProcess);

                    webContainer.on("server-ready", (port, url) => {
                      setTerminalOutput(prev => [...prev, `🌐 Server ready at ${url} (port ${port})`]);
                      setIframeUrl(url);
                      setIsRunning(false);
                    });

                    tempRunProcess.exit.then((code) => {
                      setTerminalOutput(prev => [...prev, `⏹ Process exited with code ${code}`]);
                      setIsRunning(false);
                      setRunProcess(null);
                    });
                  } else {
                    const fileKeys = Object.keys(normalizedFileTree);
                    let fileToRun = currentFile || fileKeys.find(f => f.endsWith('.js')) || fileKeys[0];
                    
                    if (fileToRun?.endsWith('.js')) {
                      // Detect dependencies from require/import statements
                      const fileContent = normalizedFileTree[fileToRun]?.file?.contents || "";
                      const commonDeps = ['express', 'cors', 'socket.io', 'mongoose', 'nodemon', 'body-parser', 'dotenv', 'axios', 'lodash', 'moment', 'uuid', 'bcrypt', 'jsonwebtoken', 'multer', 'pg', 'mysql', 'redis', 'ws'];
                      const neededDeps = commonDeps.filter(dep => 
                        fileContent.includes(`require('${dep}')`) || 
                        fileContent.includes(`require("${dep}")`) ||
                        fileContent.includes(`from '${dep}'`) ||
                        fileContent.includes(`from "${dep}"`)
                      );

                      if (neededDeps.length > 0) {
                        setTerminalOutput(prev => [...prev, `📦 Installing dependencies: ${neededDeps.join(', ')}...`]);
                        const installProcess = await webContainer.spawn("npm", ["install", ...neededDeps]);
                        
                        installProcess.output.pipeTo(new WritableStream({
                          write(chunk) {
                            const cleaned = chunk.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').trim();
                            if (cleaned) {
                              setTerminalOutput(prev => [...prev, cleaned]);
                            }
                          }
                        }));

                        await installProcess.exit;
                        setTerminalOutput(prev => [...prev, `✅ Dependencies installed`]);
                      }

                      setTerminalOutput(prev => [...prev, `▶ Running ${fileToRun}...`]);
                      let tempRunProcess = await webContainer.spawn("node", [fileToRun]);
                      setRunProcess(tempRunProcess);

                      tempRunProcess.output.pipeTo(new WritableStream({
                        write(chunk) {
                          const cleaned = chunk.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').trim();
                          if (cleaned) setTerminalOutput(prev => [...prev, cleaned]);
                        }
                      }));

                      webContainer.on("server-ready", (port, url) => {
                        setTerminalOutput(prev => [...prev, `🌐 Server ready at ${url}`]);
                        setIframeUrl(url);
                        setIsRunning(false);
                      });

                      tempRunProcess.exit.then((code) => {
                        setTerminalOutput(prev => [...prev, `⏹ Process exited with code ${code}`]);
                        setIsRunning(false);
                        setRunProcess(null);
                      });
                    } else {
                      const fileContent = normalizedFileTree[fileToRun]?.file?.contents || "";
                      const ext = fileToRun.split('.').pop();
                      const langMap = { py: 'python', cpp: 'cpp', c: 'cpp', java: 'java' };
                      
                      try {
                        const response = await axios.post('/projects/execute', {
                          language: langMap[ext] || 'python',
                          code: fileContent,
                          fileName: fileToRun
                        });
                        
                        if (response.data.output) setTerminalOutput(prev => [...prev, response.data.output]);
                        if (response.data.error) setTerminalOutput(prev => [...prev, `[ERROR] ${response.data.error}`]);
                      } catch (execErr) {
                        setTerminalOutput(prev => [...prev, `Execution failed: ${execErr.message}`]);
                      } finally {
                        setIsRunning(false);
                      }
                    }
                  }
                } catch (error) {
                  console.error("Error running application:", error);
                  alert(`Failed to run application: ${error.message}`);
                  setIsRunning(false);
                  setRunProcess(null);
                }
              }}
              disabled={isRunning || !webContainer || Object.keys(fileTree).length === 0}
              className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 ${
                isRunning 
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                  : 'bg-[#0e639c] hover:bg-[#1177bb] text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <i className="ri-play-fill"></i>
                  <span>Run</span>
                </>
              )}
            </button>
            {runProcess && (
              <button
                onClick={() => {
                  runProcess.kill();
                  setRunProcess(null);
                  setIframeUrl(null);
                  setIsRunning(false);
                }}
                className="px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 bg-[#c53030] hover:bg-[#e53e3e] text-white"
              >
                <i className="ri-stop-fill"></i>
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Editor + Terminal Container */}
        <div className="flex-grow flex flex-col overflow-hidden">
          {/* Code Editor */}
          <div 
            className="flex-grow overflow-auto transition-colors duration-300"
            style={{ 
                backgroundColor: editorThemePreference === 'vs-light' ? '#ffffff' : editorThemePreference === 'monokai' ? '#272822' : editorThemePreference === 'github-dark' ? '#0d1117' : '#1e1e1e',
                color: editorThemePreference === 'vs-light' ? '#333333' : '#d4d4d4'
            }}
          >
            {fileTree[currentFile] ? (
              <pre className="hljs h-full">
                <code
                  className="hljs h-full outline-none block p-4 text-sm leading-6"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const updatedContent = e.target.innerText;
                    const ft = {
                      ...fileTree,
                      [currentFile]: { file: { contents: updatedContent } },
                    };
                    setFileTree(ft);
                    saveFileTree(ft);
                  }}
                  dangerouslySetInnerHTML={{
                    __html: hljs.highlight("javascript", fileTree[currentFile].file.contents).value,
                  }}
                   style={{ 
                    whiteSpace: editorWordWrap ? "pre-wrap" : "pre", 
                    paddingBottom: "10rem",
                    fontSize: `${editorFontSize}px`,
                    fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
                    backgroundColor: 'transparent'
                  }}
                />
              </pre>
            ) : (
              <div className={`h-full flex items-center justify-center ${colors.secondaryText}`}>
                <div className="text-center">
                  <i className="ri-code-s-slash-line text-6xl mb-4 opacity-30"></i>
                  <p className="text-sm font-medium">Select a file to start editing</p>
                  <p className="text-xs mt-1 opacity-70">Or ask AI to create new files</p>
                </div>
              </div>
            )}
          </div>

          {/* Terminal Panel */}
          {isTerminalOpen && (
          <div 
            className={`${colors.bg} border-t ${colors.border} flex flex-col relative`}
            style={{ height: terminalHeight }}
          >
            {/* Resize Handle */}
            <div 
              className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-[#0078d4] transition-colors z-10"
              onMouseDown={(e) => startResize('terminal', e)}
            />
            <div className={`h-9 ${colors.sidebar} flex items-center px-4 border-b ${colors.border}`}>
              <div className="flex items-center gap-4 h-full">
                <button className={`h-full px-2 text-xs font-medium border-b-2 border-blue-500 ${colors.text}`}>
                  Terminal
                </button>
                <button className={`text-xs font-medium ${colors.secondaryText} hover:${colors.text} transition-colors`}>
                  Problems
                </button>
                <button className={`text-xs font-medium ${colors.secondaryText} hover:${colors.text} transition-colors`}>
                  Output
                </button>
              </div>
              <div className="flex-grow"></div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setTerminalOutput([])} 
                  className={`${colors.secondaryText} hover:text-white p-1 rounded transition-colors`}
                  title="Clear Terminal"
                >
                  <i className="ri-delete-bin-line text-sm"></i>
                </button>
                <button 
                  onClick={() => setIsTerminalOpen(false)} 
                  className={`${colors.secondaryText} hover:text-white p-1 rounded transition-colors`}
                  title="Close Terminal (Ctrl+J)"
                >
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>
            </div>
            <div className={`flex-grow p-3 overflow-auto font-mono text-sm ${colors.text}`}>
              {terminalOutput.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {terminalOutput.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap break-words">
                      <span className="text-[#569cd6]">❯ </span>{line}
                    </div>
                  ))}
                  <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                </div>
              ) : (
                <div className="text-gray-600">
                  <span className="text-[#569cd6]">❯ </span>
                  <span className="opacity-50">Ready to execute...</span>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      {iframeUrl && webContainer && (
        <div className="w-96 flex flex-col h-full border-l border-[#414141]">
          <div className="h-9 bg-[#252526] flex items-center px-3 border-b border-[#1e1e1e]">
            <input
              type="text"
              onChange={(e) => setIframeUrl(e.target.value)}
              value={iframeUrl}
              className="flex-grow px-2 py-1 bg-[#3c3c3c] border border-[#3c3c3c] rounded text-xs text-gray-300 outline-none focus:border-[#0078d4]"
            />
          </div>
          <iframe src={iframeUrl} className="w-full flex-grow bg-white"></iframe>
        </div>
      )}

      {/* AI Chat Panel - Right Side (Claude-style) */}
      {isChatOpen && (
        <div 
          className="bg-[#1e1e1e] flex flex-col border-l border-[#333] relative"
          style={{ width: chatWidth }}
        >
          {/* Resize Handle */}
          <div 
            className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-[#0078d4] transition-colors z-10"
            onMouseDown={(e) => startResize('chat', e)}
          />
          
          {/* Chat Header - Claude Style */}
          <div className={`px-3 py-2.5 border-b ${colors.border} flex items-center justify-between ${colors.sidebar}`}>
            <span className={`text-[13px] font-medium ${colors.text}`}>codeX Chat</span>
            <div className="flex items-center gap-0.5">
              <button 
                onClick={() => setCurrentSessionId(Date.now().toString())}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
                title="New Chat"
              >
                <i className="ri-add-line text-sm"></i>
              </button>
              <button 
                onClick={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
                title="History"
              >
                <i className="ri-history-line text-sm"></i>
              </button>
              <button 
                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
                title="More"
              >
                <i className="ri-more-line text-sm"></i>
              </button>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#3c3c3c] rounded transition-colors"
                title="Close"
              >
                <i className="ri-close-line text-sm"></i>
              </button>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div 
            ref={messageBox}
            className="flex-grow overflow-auto"
          >
            {messages
              .filter((msg) => (msg.sessionId && msg.sessionId !== 'general')) // STRICTLY AI ONLY
              .filter((msg) => (msg.sessionId === currentSessionId)) // Only current AI session
              .map((msg, index) => {
                const senderId = msg.sender?._id?.toString();
                const userId = user?._id?.toString();
                const isMe = userId && senderId ? senderId === userId : (msg.sender === userId);
                const isAI = msg.sender?._id === "ai";

                return (
                  <div key={index} className="border-b border-[#2d2d2d]">
                    {/* User Message - Claude Style */}
                    {isMe && (
                      <div className={`px-4 py-3 ${colors.bg}`}>
                        <div className={`${appTheme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-gray-100'} rounded-lg p-3 flex items-start justify-between group`}>
                          <p className="whitespace-pre-wrap text-[13px] text-gray-200 flex-grow">{msg.message}</p>
                          <button className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-gray-300 transition-opacity">
                            <i className="ri-refresh-line text-sm"></i>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* AI Message - Claude Style */}
                    {isAI && (
                      <div className={`px-4 py-3 ${colors.bg}`}>
                        {/* Thought Section (Expandable) */}
                        <div className="mb-3">
                          <button className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-[13px] transition-colors">
                            <i className="ri-arrow-right-s-line text-sm"></i>
                            <span>Thought for 1s</span>
                          </button>
                        </div>

                        {/* AI Response Content */}
                        <div className={`text-[13px] ${colors.text}`}>
                          {WriteAiMessage(msg.message)}
                        </div>
                      </div>
                    )}

                    {/* Other Users Message */}
                    {!isMe && !isAI && (
                      <div className={`px-4 py-3 ${colors.bg}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[11px] font-medium ${colors.secondaryText}`}>
                            {msg.sender?.username || msg.sender?.email}
                          </span>
                        </div>
                        <p className={`whitespace-pre-wrap text-[13px] ${colors.text}`}>{msg.message}</p>
                      </div>
                    )}
                  </div>
                );
              })}
              
            {/* AI Typing Indicator - Claude Style */}
            {isAiTyping && (
              <div className={`px-4 py-3 border-b ${colors.border}`}>
                <div className={`flex items-center gap-2 ${colors.secondaryText} text-[13px] mb-2`}>
                  <i className="ri-loader-4-line animate-spin text-sm"></i>
                  <span>Generating</span>
                </div>
              </div>
            )}

            {/* User Typing Indicators */}
            {Array.from(typingUsers).map((userId) => {
              const typingUser = users.find((u) => u._id?.toString() === userId?.toString()) ||
                project?.users?.find((u) => u._id?.toString() === userId?.toString());
              if (!typingUser) return null;

              return (
                <div key={userId} className={`px-4 py-2 text-[12px] ${colors.secondaryText}`}>
                  {typingUser.username || typingUser.email} is typing...
                </div>
              );
            })}
          </div>

          {/* Bottom Section - Claude Style */}
          <div className={`border-t ${colors.border} ${colors.sidebar}`}>
            {/* Files with Changes Bar */}
            <div className={`flex items-center justify-between px-3 py-2 border-b ${colors.border} text-[12px]`}>
              <div className={`flex items-center gap-2 ${colors.secondaryText}`}>
                <i className="ri-arrow-left-s-line"></i>
                <i className="ri-file-line text-yellow-500"></i>
                <span>0 Files With Changes</span>
              </div>
              <button className={`flex items-center gap-1.5 ${colors.secondaryText} hover:${colors.text} transition-colors`}>
                <i className="ri-git-commit-line text-sm"></i>
                <span>Review Changes</span>
              </button>
            </div>

            {/* Input Area */}
            <div className="p-3">
              <div className={`${colors.chatInput} rounded-lg border focus-within:border-[#0078d4] transition-colors`}>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  className={`w-full p-3 bg-transparent text-[13px] ${colors.text} outline-none placeholder:text-gray-500`}
                  type="text"
                  placeholder="Ask anything (Ctrl+L), @ to mention, / for workflow"
                />
                
                {/* Bottom Controls Row */}
                <div className="flex items-center justify-between px-3 pb-2">
                  <div className="flex items-center gap-2">
                    {/* Add Button */}
                    <button className={`p-1 ${colors.secondaryText} hover:${colors.text} transition-colors`}>
                      <i className="ri-add-line text-lg"></i>
                    </button>
                    
                    {/* Planning Toggle */}
                    <button className={`flex items-center gap-1 px-2 py-0.5 text-[11px] ${colors.secondaryText} hover:text-white bg-white/10 rounded transition-colors`}>
                      <i className="ri-arrow-up-s-line text-sm"></i>
                      <span>Planning</span>
                    </button>
                    
                    {/* Model Selector */}
                    <div className="relative">
                      <button 
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                        className={`flex items-center gap-1 px-2 py-0.5 text-[11px] ${colors.secondaryText} hover:text-white bg-white/10 rounded transition-colors`}
                      >
                        <i className="ri-arrow-up-s-line text-sm"></i>
                        <i className={`${
                          selectedModel === 'groq' ? 'ri-flashlight-fill text-purple-400' : 
                          'ri-gemini-fill text-orange-400'
                        } text-xs`}></i>
                        <span>{selectedModel === 'groq' ? 'Groq' : 'Gemini'}</span>
                      </button>

                      {isModelDropdownOpen && (
                        <div className={`absolute bottom-full left-0 mb-1 ${colors.sidebar} rounded border ${colors.border} overflow-hidden z-20 min-w-[100px]`}>
                          {['groq', 'gemini'].map(model => (
                            <button
                              key={model}
                              onClick={() => { 
                                setSelectedModel(model); 
                                setIsModelDropdownOpen(false); 
                                localStorage.setItem('aiModel', model); 
                              }}
                              className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2 ${
                                selectedModel === model ? 'bg-[#0078d4] text-white' : `hover:${colors.menuHover} ${colors.text}`
                              }`}
                            >
                              <i className={`${
                                model === 'groq' ? 'ri-flashlight-fill text-purple-400' : 
                                'ri-gemini-fill text-orange-400'
                              } text-xs`}></i>
                              {model.charAt(0).toUpperCase() + model.slice(1)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Mic Button */}
                    <button className={`p-1.5 ${colors.secondaryText} hover:${colors.text} transition-colors`}>
                      <i className="ri-mic-line text-sm"></i>
                    </button>
                    
                    {/* Send/Stop Button */}
                    <button
                      onClick={send}
                      disabled={!message.trim()}
                      className={`p-1.5 bg-red-500 hover:bg-red-600 disabled:bg-white/5 disabled:${colors.secondaryText} text-white rounded transition-colors`}
                    >
                      <i className={`${message.trim() ? 'ri-send-plane-fill' : 'ri-stop-fill'} text-sm`}></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Chat Panel */}
      {isTeamChatOpen && (
        <div 
          className={`${colors.bg} flex flex-col border-l ${colors.border} relative`}
          style={{ width: chatWidth }}
        >
           {/* Resize Handle */}
           <div 
            className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-[#0078d4] transition-colors z-10"
            onMouseDown={(e) => startResize('chat', e)}
          />

          {/* Team Chat Header */}
          <div className={`px-3 py-2.5 border-b ${colors.border} flex items-center justify-between ${colors.sidebar}`}>
            <div className="flex items-center gap-2">
              <i className="ri-team-fill text-[#0078d4]"></i>
              <span className={`text-[13px] font-medium ${colors.text}`}>Team Chat</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button 
                onClick={() => setIsSidePanelOpen(true)} // Re-purpose SidePanel for just member list if needed, or integrate list here
                className={`p-1.5 ${colors.secondaryText} hover:text-white hover:bg-white/10 rounded transition-colors`}
                title="Members"
              >
                <i className="ri-user-line text-sm"></i>
              </button>
              <button 
                onClick={() => setIsTeamChatOpen(false)}
                className={`p-1.5 ${colors.secondaryText} hover:text-white hover:bg-white/10 rounded transition-colors`}
                title="Close"
              >
                <i className="ri-close-line text-sm"></i>
              </button>
            </div>
          </div>

          {/* Team Messages Area */}
          <div ref={messageBox} className="flex-grow overflow-auto p-3 space-y-3">
             {messages
              .filter((msg) => (msg.sessionId || 'general') === 'general') // Only show general/team messages
              .map((msg, index) => {
                const senderId = msg.sender?._id?.toString();
                const userId = user?._id?.toString();
                const isMe = userId && senderId ? senderId === userId : (msg.sender === userId);

                return (
                  <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg p-2.5 text-[13px] ${
                      isMe ? "bg-[#0078d4] text-white" : `${appTheme === 'dark' ? 'bg-[#3c3c3c]' : 'bg-gray-200'} ${colors.text}`
                    }`}>
                      {!isMe && (
                         <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-[8px] text-white font-bold">
                            {(msg.sender?.username?.[0] || msg.sender?.email?.[0] || '?').toUpperCase()}
                          </div>
                          <span className="text-[11px] font-medium opacity-75">
                            {msg.sender?.username || msg.sender?.email}
                          </span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
              
            {/* Team Typing Indicator */}
            {Object.entries(typingUsers).map(([userId, sessionId]) => {
              if (sessionId !== 'general') return null; // Only show 'general' typing in Team Chat

              const typingUser = users.find((u) => u._id?.toString() === userId?.toString()) ||
                project?.users?.find((u) => u._id?.toString() === userId?.toString());
              if (!typingUser) return null;

              return (
                <div key={userId} className="flex justify-start">
                   <div className="bg-[#3c3c3c] rounded-lg p-2 text-xs text-gray-400 italic">
                    {typingUser.username || typingUser.email} is typing...
                  </div>
                </div>
              );
            })}
          </div>

          {/* Team Chat Input */}
          <div className={`p-3 border-t ${colors.border} ${colors.sidebar}`}>
             <div className="flex gap-2">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  className={`flex-grow p-2 ${colors.chatInput} rounded text-sm ${colors.text} outline-none focus:border-[#0078d4] placeholder:text-gray-500`}
                  type="text"
                  placeholder="Message the team..."
                />
                <button
                  onClick={send}
                  disabled={!message.trim()}
                  className="px-3 bg-[#0078d4] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1177bb] transition-colors rounded flex items-center"
                >
                  <i className="ri-send-plane-fill text-sm"></i>
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Side Panel - Team Members Overlay (Optional - kept for detailed member info) */}
      {isSidePanelOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsSidePanelOpen(false)}>
          <div className={`absolute right-0 top-0 h-full w-72 ${colors.sidebar} border-l ${colors.border} shadow-xl`} onClick={e => e.stopPropagation()}>
            <header className={`flex justify-between items-center px-4 py-3 border-b ${colors.border}`}>
              <div className="flex items-center gap-2">
                <i className="ri-team-fill text-[#0078d4]"></i>
                <h1 className={`font-medium text-sm ${colors.text}`}>Team Members</h1>
              </div>
              <button onClick={() => setIsSidePanelOpen(false)} className={`p-1 hover:${colors.menuHover} rounded`}>
                <i className={`ri-close-fill ${colors.secondaryText}`}></i>
              </button>
            </header>
            
            <div className="p-3 space-y-1">
              {project?.users?.map((user) => {
                const displayEmail = user.email || user.username || 'Unknown';
                const initial = displayEmail[0]?.toUpperCase() || '?';
                
                return (
                  <div
                    key={user._id || user.email}
                    onClick={() => handleUserClick(user._id)}
                    className={`cursor-pointer p-2 flex gap-2 items-center rounded transition-colors ${
                      selectedUserId.has(user._id) ? "bg-[#0078d4]/20" : `hover:${colors.menuHover}`
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#0078d4] text-white text-xs font-medium">
                      {initial}
                    </div>
                    <div>
                      <p className={`text-sm ${colors.text}`}>{displayEmail}</p>
                      <p className={`text-[10px] ${colors.secondaryText}`}>Collaborator</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* History Panel */}
      {isHistoryPanelOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsHistoryPanelOpen(false)}>
          <div className={`absolute right-80 top-12 w-64 ${colors.sidebar} rounded-lg border ${colors.border} shadow-xl overflow-hidden`} onClick={e => e.stopPropagation()}>
            <header className={`flex justify-between items-center px-3 py-2 border-b ${colors.border}`}>
              <span className={`text-xs font-medium ${colors.text}`}>Chat History</span>
              <button onClick={() => setIsHistoryPanelOpen(false)} className={`p-0.5 hover:${colors.menuHover} rounded`}>
                <i className={`ri-close-fill ${colors.secondaryText} text-sm`}></i>
              </button>
            </header>
            <div className="max-h-64 overflow-auto p-1">
              {sessions.map(sid => (
                <button 
                  key={sid}
                  onClick={() => {
                    setCurrentSessionId(sid);
                    setIsHistoryPanelOpen(false);
                  }}
                  className={`w-full p-2 text-left rounded text-xs transition-colors ${
                    sid === currentSessionId 
                      ? 'bg-[#0078d4] text-white' 
                      : `hover:${colors.menuHover} ${colors.text}`
                  }`}
                >
                  {sid === 'general' ? '💬 General Chat' : `🕒 ${new Date(parseInt(sid)).toLocaleString()}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${colors.sidebar} rounded-lg w-full max-w-md border ${colors.border} shadow-2xl overflow-hidden`}>
            <header className={`flex justify-between items-center px-4 py-3 border-b ${colors.border}`}>
              <div>
                <h2 className={`text-sm font-medium ${colors.text}`}>Invite Collaborators</h2>
                <p className={`text-xs ${colors.secondaryText} mt-0.5`}>Add team members to your project</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className={`p-1 ${colors.secondaryText} hover:text-white hover:bg-white/10 rounded`}
              >
                <i className="ri-close-line"></i>
              </button>
            </header>
            
            <div className="p-4">
              <div className="relative mb-4">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full pl-9 pr-4 py-2 bg-[#3c3c3c] border border-[#3c3c3c] rounded text-sm text-gray-200 outline-none focus:border-[#0078d4] placeholder:text-gray-500"
                />
              </div>

              <div className="max-h-64 overflow-auto space-y-1">
                {isSearching && (
                  <div className="text-center py-4 text-gray-400">
                    <div className="animate-spin w-5 h-5 border-2 border-[#0078d4] border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-xs">Finding users...</p>
                  </div>
                )}
                {!isSearching && searchResults.length === 0 && searchQuery.length >= 2 && (
                  <div className="text-center py-4 text-gray-500">
                    <i className="ri-user-search-line text-2xl mb-2 block"></i>
                    <p className="text-xs">No users found</p>
                  </div>
                )}
                {searchResults.map((user) => {
                  const displayUsername = user.username || user.email || 'Unknown';
                  const initial = displayUsername[0]?.toUpperCase() || '?';
                  
                  return (
                    <div
                      key={user._id}
                      className={`p-2 rounded flex justify-between items-center hover:${colors.menuHover} group`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#0078d4] text-white text-xs font-medium">
                          {initial}
                        </div>
                        <div>
                          <p className={`text-sm ${colors.text}`}>@{displayUsername}</p>
                          <p className={`text-[10px] ${colors.secondaryText}`}>{user.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => sendInvitation(user._id)}
                        className="px-3 py-1 bg-[#0078d4] text-white text-xs rounded hover:bg-[#1177bb] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Invite
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* VS Code Status Bar */}
      <div className={`h-6 ${colors.statusBarBg} flex items-center justify-between px-2 text-xs ${colors.statusBarText} shrink-0`}>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 rounded-sm">
            <i className="ri-git-branch-line text-xs"></i>
            <span>main</span>
          </button>
          <button className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 rounded-sm">
            <i className="ri-error-warning-line text-xs"></i>
            <span>0</span>
            <i className="ri-alert-line text-xs ml-1"></i>
            <span>0</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 rounded-sm"
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            title="Toggle Terminal (Ctrl+J)"
          >
            <i className="ri-terminal-box-line text-xs"></i>
          </button>
          {currentFile && (
            <>
              <span className="opacity-80">Ln 1, Col 1</span>
              <span className="opacity-80">Spaces: 2</span>
              <span className="opacity-80">UTF-8</span>
              <span className="opacity-80">
                {currentFile.endsWith('.js') || currentFile.endsWith('.jsx') ? 'JavaScript React' :
                 currentFile.endsWith('.ts') || currentFile.endsWith('.tsx') ? 'TypeScript React' :
                 currentFile.endsWith('.json') ? 'JSON' :
                 currentFile.endsWith('.css') ? 'CSS' :
                 currentFile.endsWith('.html') ? 'HTML' :
                 currentFile.endsWith('.py') ? 'Python' :
                 currentFile.endsWith('.cpp') || currentFile.endsWith('.c') ? 'C++' :
                 'Plain Text'}
              </span>
            </>
          )}
          <button className="flex items-center gap-1 hover:bg-white/10 px-2 py-0.5 rounded-sm">
            <i className="ri-notification-line text-xs"></i>
          </button>
        </div>
      </div>
    </main>
  );
};

export default Project;