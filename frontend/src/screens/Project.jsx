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
import { getWebContainer } from "../config/webcontainer";

function SyntaxHighlightedCode(props) {
  const ref = useRef(null);

  React.useEffect(() => {
    if (ref.current && props.className?.includes("lang-") && window.hljs) {
      window.hljs.highlightElement(ref.current);
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
  const { user } = useContext(UserContext);
  const messageBox = React.createRef();

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
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('aiModel') || 'groq');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const sessions = Array.from(new Set(messages.map(m => m.sessionId || 'general'))).sort((a,b) => {
      const aVal = a === 'general' ? 0 : parseInt(a);
      const bVal = b === 'general' ? 0 : parseInt(b);
      return bVal - aVal;
  });


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

    const messageToSend = message.trim();
    const messageData = {
      message: messageToSend,
      sender: user,
      sessionId: currentSessionId,
      modelType: selectedModel
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

  useEffect(() => {
    if (!project?._id || !user) return;

    let typingTimeout;

    const handleTyping = () => {
      if (!message.trim() || !user) return;

      try {
        sendMessage("typing-start", { sender: user });
        clearTimeout(typingTimeout);

        typingTimeout = setTimeout(() => {
          try {
            sendMessage("typing-stop", { sender: user });
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
      <div className="overflow-auto bg-slate-900/95 text-white rounded-xl p-4 shadow-inner">
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
    setCurrentSessionId(savedSessionId || 'general');
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
    }, 2000); // Sync every 2 seconds for now

    return () => clearInterval(intervalId);
  }, [project?._id]);

  useEffect(() => {
    if (project?._id && currentSessionId) {
      localStorage.setItem(`currentSession_${project._id}`, currentSessionId);
    }
  }, [currentSessionId, project?._id]);

  // Initialize socket connection once
  useEffect(() => {
    if (!project?._id) {
      return;
    }

    try {
      console.log("Initializing socket for project:", project._id);
      initializeSocket(project._id);
    } catch (error) {
      console.error("Error initializing socket:", error);
    }

    return () => {
      console.log("Disconnecting socket");
      disconnectSocket();
    };
  }, [project?._id]); // Only reconnect if project changes

  // Set up message handlers - only register once per project
  useEffect(() => {
    if (!project?._id || !user) {
      return;
    }

    const typingStartHandler = (data) => {
      console.log("Typing start received:", data);
      const senderId = data.sender?._id?.toString();
      if (senderId && senderId !== user?._id?.toString()) {
        setTypingUsers((prev) => new Set([...prev, senderId]));
      }
    };

    const typingStopHandler = (data) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.sender?._id);
        return newSet;
      });
    };

    const messageHandler = (data) => {
      console.log("Received message via Socket.IO:", data);

      if (data.sender?._id == "ai") {
        setIsAiTyping(false);
      }

      if (data.sender?._id?.toString() !== user?._id?.toString()) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.sender?._id?.toString());
          return newSet;
        });
      }

      // Auto-join session logic
      setCurrentSessionId((currentSession) => {
        if (data.sessionId && data.sessionId !== currentSession) {
          setMessages((msgs) => {
            const currentSessionMessages = msgs.filter(m => m.sessionId === currentSession);
            if (currentSessionMessages.length === 0) {
              console.log("Auto-joining collaborator session:", data.sessionId);
              return msgs;
            }
            return msgs;
          });
        }
        return currentSession;
      });

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
        setMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          const isOptimisticDuplicate =
            lastMessage &&
            lastMessage.sender?._id === data.sender?._id &&
            lastMessage.message === data.message;

          if (isOptimisticDuplicate) {
            return [...prevMessages.slice(0, -1), data];
          }

          const isDuplicate = prevMessages.some(
            (msg) =>
              msg.sender?._id === data.sender?._id &&
              msg.message === data.message
          );

          if (isDuplicate) {
            console.log("Duplicate message detected, skipping...");
            return prevMessages;
          }

          return [...prevMessages, data];
        });
      }
    };

    receiveMessage("project-message", messageHandler);
    receiveMessage("typing-start", typingStartHandler);
    receiveMessage("typing-stop", typingStopHandler);

    return () => {
      // Clean up event listeners when component unmounts or project changes
      removeListener("project-message", messageHandler);
      removeListener("typing-start", typingStartHandler);
      removeListener("typing-stop", typingStopHandler);
    };
  }, [project?._id, user]); // Only re-register when project or user changes

  useEffect(() => {
    console.log("WebContainer initialization useEffect triggered");
    console.log("Current webContainer state:", webContainer);
    
    if (!webContainer) {
      console.log("WebContainer not found, attempting to boot...");
      getWebContainer()
        .then((container) => {
          console.log("✅ WebContainer booted successfully:", container);
          setWebContainer(container);
        })
        .catch((err) => {
          console.error("❌ Error initializing web container:", err);
          alert("Failed to initialize WebContainer. Please refresh the page.");
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
  }, [messages, typingUsers, isAiTyping]);

  // Messages are now saved on server-side when sent via Socket.IO
  // No need for client-side auto-save

  if (!project) {
    return (
      <main className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg text-slate-600 font-medium">Loading project...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen flex bg-slate-50">
      {/* LEFT PANEL - Chat */}
      <section className="left relative flex flex-col h-screen w-[420px] bg-white border-r border-slate-200/80 shadow-xl">
        {/* Header */}
        <header className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80 backdrop-blur-xl z-10 shadow-sm">
          <div className="flex gap-2 items-center">
            <button 
              title="Back to Home"
              className="p-2 mr-2 text-slate-500 hover:text-slate-700 transition-colors duration-200"
              onClick={() => navigate('/')}
            >
              <i className="ri-arrow-left-line text-xl"></i>
            </button>

            <button 
              className="flex items-center gap-2 bg-slate-800 text-white py-2 px-4 rounded-md hover:bg-slate-900 transition-all duration-200 shadow-sm font-medium text-xs border border-transparent"
              onClick={() => setIsModalOpen(true)}
            >
              <i className="ri-user-add-line text-sm"></i>
              <span>Invite</span>
            </button>
            
            <button 
              className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 py-2 px-4 rounded-md hover:bg-slate-50 transition-all duration-200 shadow-sm font-medium text-xs"
              onClick={() => setCurrentSessionId(Date.now().toString())}
            >
              <i className="ri-chat-new-line text-sm"></i>
              <span>New Chat</span>
            </button>

            <button 
              className={`p-2 transition-colors duration-200 ${
                isHistoryPanelOpen ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setIsHistoryPanelOpen(!isHistoryPanelOpen)}
              title="Chat History"
            >
              <i className="ri-history-line text-xl"></i>
            </button>
          </div>
          
          <button
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            className={`p-2.5 rounded-xl transition-all duration-200 relative ${
              isSidePanelOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <i className="ri-team-line text-xl"></i>
            {project?.users?.length > 1 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {project.users.length}
              </span>
            )}
          </button>
        </header>

        {/* Messages Area */}
        <div className="conversation-area flex-grow flex flex-col h-full relative overflow-hidden">
          <div
            ref={messageBox}
            className="message-box p-4 flex-grow flex flex-col gap-3 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
          >
            {messages
              .filter((msg) => (msg.sessionId || 'general') === (currentSessionId || 'general'))
              .map((msg, index) => {
                  const senderId = msg.sender?._id?.toString();
                  const userId = user?._id?.toString();
                  const isMe = userId && senderId ? senderId === userId : (msg.sender === userId);

                  return (
                  <div
                      key={index}
                      className={`max-w-[85%] ${
                      isMe 
                        ? "ml-auto bg-slate-800 text-white shadow-sm" 
                        : msg.sender?._id === "ai" 
                          ? "bg-white text-slate-800 border border-slate-200 shadow-sm" 
                          : "bg-white text-slate-800 border border-slate-200 shadow-sm"
                      } ${
                        selectedUserId.has(senderId) ? "ring-2 ring-blue-500 transform scale-[1.02]" : ""
                      } message flex flex-col p-4 rounded-2xl transition-all duration-200`}
                  >
                      <div className="flex items-center gap-2 mb-2">
                        {msg.sender?._id === "ai" && (
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                            <i className="ri-robot-2-fill text-slate-600 text-xs"></i>
                          </div>
                        )}
                        <small className={`text-xs font-semibold ${isMe ? "text-slate-200" : "text-slate-500"}`}>
                          {isMe ? "You" : msg.sender?._id === "ai" ? "AI Assistant" : (msg.sender?.username || msg.sender?.email || "Unknown")}
                        </small>
                      </div>
                      <div className="text-sm leading-relaxed">
                      {msg.sender?._id === "ai" ? (
                          WriteAiMessage(msg.message)
                      ) : (
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                      )}
                      </div>
                  </div>
                  );
              })}
              
            {isAiTyping && (
              <div className="message max-w-[85%] flex flex-col p-4 bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                    <i className="ri-robot-2-fill text-slate-600 text-xs"></i>
                  </div>
                  <small className="text-xs font-semibold text-slate-500">AI Assistant</small>
                </div>
                <div className="text-sm flex items-center gap-2 text-slate-600">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></span>
                  </div>
                  <span className="font-medium text-xs">Thinking...</span>
                </div>
              </div>
            )}

            {Array.from(typingUsers).map((userId) => {
               const typingUser =
                users.find((u) => u._id?.toString() === userId?.toString()) ||
                project?.users?.find((u) => u._id?.toString() === userId?.toString());
               if (!typingUser) return null;

              return (
                <div key={userId} className="message max-w-[70%] flex flex-col p-3 bg-slate-100 rounded-xl shadow-sm border border-slate-200">
                   <small className="text-xs text-slate-600 font-semibold">{typingUser.username || typingUser.email}</small>
                   <div className="text-sm flex items-center gap-1 text-slate-500 italic mt-1">
                     <span>typing</span>
                     <span className="flex gap-0.5 items-center">
                        <span className="animate-bounce" style={{ animationDelay: "0s" }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>.</span>
                     </span>
                   </div>
                </div>
              );
            })}
          </div>

          {/* Input Field */}
          <div className="inputField w-full flex flex-col bg-white border-t-2 border-slate-200/80 shadow-2xl p-3 z-10">
            <div className="flex gap-2 mb-2">
              {/* Model Selector */}
              <div className="relative">
                  <button 
                      onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                      className={`py-2 px-3 rounded-md font-semibold text-xs flex items-center gap-2 transition-all duration-200 shadow-sm border ${
                          selectedModel === 'groq' 
                          ? 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' 
                          : selectedModel === 'gemini'
                          ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                  >
                      <i className={`${selectedModel === 'groq' ? 'ri-flashlight-fill' : selectedModel === 'gemini' ? 'ri-gemini-fill' : 'ri-robot-2-fill'} text-base`}></i>
                      <span>{selectedModel === 'groq' ? 'Groq' : selectedModel === 'gemini' ? 'Gemini' : 'Llama'}</span>
                      <i className={`ri-arrow-down-s-line transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`}></i>
                  </button>

                  {isModelDropdownOpen && (
                      <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-20">
                          <div className="p-1">
                              <button
                                  onClick={() => { setSelectedModel('groq'); setIsModelDropdownOpen(false); localStorage.setItem('aiModel', 'groq'); }}
                                  className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-colors ${selectedModel === 'groq' ? 'bg-purple-50' : 'hover:bg-slate-50'}`}
                              >
                                  <div className={`p-2 rounded-md ${selectedModel === 'groq' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                                      <i className="ri-flashlight-fill text-lg"></i>
                                  </div>
                                  <div className="flex-grow">
                                      <p className={`font-semibold text-sm ${selectedModel === 'groq' ? 'text-purple-900' : 'text-slate-700'}`}>Groq</p>
                                      <p className="text-xs text-slate-500">Lightning fast</p>
                                  </div>
                                  {selectedModel === 'groq' && <i className="ri-check-line text-purple-600"></i>}
                              </button>
                              
                              <button
                                  onClick={() => { setSelectedModel('gemini'); setIsModelDropdownOpen(false); localStorage.setItem('aiModel', 'gemini'); }}
                                  className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-colors ${selectedModel === 'gemini' ? 'bg-orange-50' : 'hover:bg-slate-50'}`}
                              >
                                  <div className={`p-2 rounded-md ${selectedModel === 'gemini' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                                      <i className="ri-gemini-fill text-lg"></i>
                                  </div>
                                  <div className="flex-grow">
                                      <p className={`font-semibold text-sm ${selectedModel === 'gemini' ? 'text-orange-900' : 'text-slate-700'}`}>Gemini</p>
                                      <p className="text-xs text-slate-500">Multimodal genius</p>
                                  </div>
                                  {selectedModel === 'gemini' && <i className="ri-check-line text-orange-600"></i>}
                              </button>

                              <button
                                  onClick={() => { setSelectedModel('llama'); setIsModelDropdownOpen(false); localStorage.setItem('aiModel', 'llama'); }}
                                  className={`w-full text-left p-2 rounded-lg flex items-center gap-3 transition-colors ${selectedModel === 'llama' ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                              >
                                  <div className={`p-2 rounded-md ${selectedModel === 'llama' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                      <i className="ri-robot-2-fill text-lg"></i>
                                  </div>
                                  <div className="flex-grow">
                                      <p className={`font-semibold text-sm ${selectedModel === 'llama' ? 'text-blue-900' : 'text-slate-700'}`}>Llama</p>
                                      <p className="text-xs text-slate-500">Smart reasoning</p>
                                  </div>
                                  {selectedModel === 'llama' && <i className="ri-check-line text-blue-600"></i>}
                              </button>
                          </div>
                      </div>
                  )}
              </div>

              <button 
                onClick={() => {
                  if (!message.startsWith("@ai ")) {
                    setMessage("@ai " + message);
                  }
                }}
                className="py-2 px-3 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 font-semibold text-xs shadow-sm flex items-center gap-2"
                title="Tag AI"
              >
                <i className="ri-sparkling-fill"></i>
                <span>Ask AI</span>
              </button>
            </div>
            
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
                className="flex-grow p-3 bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-slate-400 focus:bg-white text-slate-700 transition-all font-medium placeholder:text-slate-400 shadow-inner"
                type="text"
                placeholder="Type your message..."
              />
              <button
                onClick={send}
                disabled={!message.trim()}
                className="px-5 bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-900 transition-all duration-200 rounded-md font-semibold shadow-sm disabled:shadow-none flex items-center gap-2 border border-transparent"
              >
                <i className="ri-send-plane-fill"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div
          className={`sidePanel w-full h-full flex flex-col gap-2 bg-white absolute transition-all duration-300 shadow-2xl ${
            isSidePanelOpen ? "translate-x-0" : "-translate-x-full"
          } top-0 z-20`}
        >
           <header className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-slate-100 to-white border-b-2 border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                <i className="ri-team-fill text-white text-lg"></i>
              </div>
              <h1 className="font-bold text-lg text-slate-800">Team</h1>
            </div>
            <button
              onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
              className="p-2 hover:bg-slate-200 rounded-xl transition-colors duration-200"
            >
              <i className="ri-close-fill text-xl text-slate-700"></i>
            </button>
          </header>
          
          <div className="users flex flex-col gap-2 p-4">
            {project?.users &&
              project.users.map((user) => {
                const displayEmail = user.email || user.username || 'Unknown';
                const initial = displayEmail[0]?.toUpperCase() || '?';
                
                return (
                  <div
                    key={user._id || user.email || Math.random()}
                    onClick={() => handleUserClick(user._id)}
                    className={`user cursor-pointer p-3 flex gap-3 items-center rounded-lg transition-all duration-200 border ${
                        selectedUserId.has(user._id) 
                        ? "bg-blue-50 border-blue-200 shadow-sm" 
                        : "hover:bg-slate-50 border-transparent hover:border-slate-200"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 bg-slate-100 border border-slate-200 font-bold text-base">
                      {initial}
                    </div>
                    <div>
                      <h1 className="font-semibold text-sm text-slate-700">{displayEmail}</h1>
                      <p className="text-xs text-slate-500">Collaborator</p>
                    </div>
                  </div>
                );
              })}
          </div>

          </div>


        {/* History Panel */}
        <div
          className={`historyPanel w-full h-full flex flex-col gap-2 bg-white absolute transition-all duration-300 shadow-2xl ${
            isHistoryPanelOpen ? "translate-x-0" : "-translate-x-full"
          } top-0 z-20`}
        >
           <header className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                <i className="ri-history-line text-blue-600 text-lg"></i>
              </div>
              <h1 className="font-bold text-lg text-slate-800">History</h1>
            </div>
            <button
              onClick={() => setIsHistoryPanelOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-md transition-colors duration-200"
            >
              <i className="ri-close-fill text-xl text-slate-500 hover:text-slate-700"></i>
            </button>
          </header>

          <div className="sessions flex flex-col gap-1 p-4 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                {sessions.map(sid => (
                      <button 
                        key={sid}
                        onClick={() => {
                            setCurrentSessionId(sid);
                            setIsHistoryPanelOpen(false);
                        }}
                        className={`p-3 text-left rounded-lg transition-all duration-200 font-semibold text-sm border ${
                          sid === currentSessionId 
                            ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' 
                            : 'hover:bg-slate-50 text-slate-600 border-transparent hover:border-slate-200'
                        }`}
                      >
                          {sid === 'general' ? '💬 General Chat' : `🕒 ${new Date(parseInt(sid)).toLocaleString()}`}
                      </button>
                ))}
          </div>
        </div>

      </section>

      {/* RIGHT PANEL - Code Editor */}
      <section className="right bg-slate-50 flex-grow h-full flex overflow-hidden">
         {/* File Explorer */}
         <div className="explorer h-full w-64 bg-white border-r-2 border-slate-200/80 flex flex-col shadow-xl">
           <div className="p-4 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <i className="ri-folder-2-fill text-blue-600 text-sm"></i>
                  </div>
                  <h3 className="font-bold text-slate-700 text-sm">Files</h3>
                </div>
           </div>
           <div className="file-tree w-full overflow-auto h-full">
             {Object.keys(fileTree).length === 0 ? (
               <div className="p-4 text-center text-slate-400">
                 <i className="ri-folder-open-line text-4xl mb-2"></i>
                 <p className="text-xs">No files yet</p>
               </div>
             ) : (
               Object.keys(fileTree).map((file, index) => (
                 <button
                   key={index}
                   onClick={() => {
                     setCurrentFile(file);
                     setOpenFiles([...new Set([...openFiles, file])]);
                   }}
                   className={`tree-element cursor-pointer py-2 px-4 flex items-center justify-between gap-2 w-full transition-all duration-150 group border-l-2 ${
                     currentFile === file 
                       ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium' 
                       : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                   }`}
                 >
                   <div className="flex items-center gap-2 flex-grow min-w-0">
                     <i className={`text-lg ${
                       currentFile === file 
                           ? 'ri-file-code-fill' 
                           : 'ri-file-code-line text-slate-400 group-hover:text-slate-600'
                     }`}></i>
                     <p className="font-semibold text-sm truncate">{file}</p>
                   </div>
                   <i 
                       className="ri-delete-bin-line text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-lg hover:bg-red-50"
                       onClick={(e) => {
                           e.stopPropagation();
                           deleteFile(file);
                       }}
                       title="Delete file"
                   ></i>
                 </button>
               ))
             )}
           </div>
         </div>

        {/* Code Editor */}
        <div className="code-editor flex flex-col flex-grow h-full shrink bg-white">
          <div className="top flex justify-between w-full bg-gradient-to-r from-slate-50 to-white border-b-2 border-slate-200/80">
            <div className="files flex overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
              {openFiles.map((file, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentFile(file)}
                  className={`open-file cursor-pointer py-3 px-5 flex items-center w-fit gap-2 border-r border-slate-200 transition-all duration-200 min-w-fit ${
                    currentFile === file 
                      ? "bg-white text-blue-700 font-bold border-t-4 border-t-blue-500 shadow-sm" 
                      : "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-t-4 border-t-transparent"
                  }`}
                >
                  <i className={`text-sm ${
                    currentFile === file ? 'ri-file-code-fill text-blue-500' : 'ri-file-code-line'
                  }`}></i>
                  <p className="text-sm">{file}</p>
                  <i 
                    className="ri-close-line text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-all ml-1 text-sm"
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

            <div className="actions flex items-center gap-2 px-3">
              <button
                onClick={async () => {
                  console.log("Run button clicked");
                  console.log("WebContainer:", webContainer);
                  console.log("FileTree:", fileTree);
                  console.log("FileTree keys:", Object.keys(fileTree));

                  if (!webContainer) {
                    console.error("WebContainer is not available");
                    alert("WebContainer is not ready. Please wait and try again...");
                    return;
                  }

                  if (!fileTree || Object.keys(fileTree).length === 0) {
                    console.error("No files in fileTree");
                    alert("No files to run. Please create some files first using AI.");
                    return;
                  }

                  setIsRunning(true);

                  try {
                    // Normalize fileTree structure for WebContainer
                    const normalizedFileTree = {};
                    Object.keys(fileTree).forEach((filePath) => {
                      // Remove leading slash if present
                      const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
                      const fileData = fileTree[filePath];
                      
                      if (fileData && fileData.file && fileData.file.contents) {
                        normalizedFileTree[cleanPath] = fileData;
                      } else if (typeof fileData === "string") {
                        normalizedFileTree[cleanPath] = {
                          file: {
                            contents: fileData,
                          },
                        };
                      } else {
                        console.warn(
                          `Skipping invalid file structure for ${filePath}:`,
                          fileData
                        );
                      }
                    });

                    console.log("Normalized fileTree:", normalizedFileTree);

                    if (Object.keys(normalizedFileTree).length === 0) {
                      throw new Error("No valid files found in fileTree");
                    }

                    // Mount file tree
                    await webContainer.mount(normalizedFileTree);
                    console.log("File tree mounted successfully");

                    // Check if package.json exists
                    const hasPackageJson = normalizedFileTree["package.json"];
                    console.log("Has package.json:", hasPackageJson);

                    // Kill existing process if running
                    if (runProcess) {
                      console.log("Killing existing process");
                      runProcess.kill();
                      setRunProcess(null);
                    }

                    if (hasPackageJson) {
                      // Install dependencies
                      console.log("Installing dependencies...");
                      const installProcess = await webContainer.spawn("npm", [
                        "install",
                      ]);

                      installProcess.output.pipeTo(
                        new WritableStream({
                          write(chunk) {
                            console.log("Install output:", chunk);
                          },
                        })
                      );

                      // Wait for install to complete
                      const installCode = await new Promise((resolve) => {
                        installProcess.on("exit", (code) => {
                          console.log("Install process exited with code:", code);
                          resolve(code);
                        });
                      });

                      if (installCode !== 0 && installCode !== null) {
                        console.warn("npm install had warnings, continuing anyway...");
                      }

                      // Determine which command to run
                      let runCommand = ["start"];
                      
                      // Try to read package.json to find the right script
                      try {
                        const pkgJson = JSON.parse(normalizedFileTree["package.json"].file.contents);
                        if (pkgJson.scripts) {
                          if (pkgJson.scripts.dev) {
                            runCommand = ["run", "dev"];
                          } else if (pkgJson.scripts.start) {
                            runCommand = ["start"];
                          } else {
                            runCommand = ["run", "dev"];
                          }
                        }
                      } catch (e) {
                        console.warn("Could not parse package.json, using default");
                      }

                      // Start the application
                      console.log("Starting application with:", runCommand);
                      let tempRunProcess = await webContainer.spawn("npm", runCommand);

                      tempRunProcess.output.pipeTo(
                        new WritableStream({
                          write(chunk) {
                            console.log("App output:", chunk);
                          },
                        })
                      );

                      setRunProcess(tempRunProcess);

                      // Handle server ready event (only once)
                      const serverReadyHandler = (port, url) => {
                        console.log("Server ready on port:", port, "URL:", url);
                        setIframeUrl(url);
                        setIsRunning(false);
                        webContainer.off("server-ready", serverReadyHandler);
                      };
                      webContainer.on("server-ready", serverReadyHandler);

                      // Handle process exit
                      tempRunProcess.on("exit", (code) => {
                        console.log("Run process exited with code:", code);
                        setIsRunning(false);
                        setRunProcess(null);
                        if (code !== 0 && code !== null) {
                          alert(
                            `Application exited with code ${code}. Check console for details.`
                          );
                        }
                      });

                      tempRunProcess.on("error", (err) => {
                        console.error("Run process error:", err);
                        setIsRunning(false);
                        setRunProcess(null);
                        alert(`Failed to start application: ${err.message}`);
                      });
                    } else {
                      // No package.json - check for standalone files
                      console.log("No package.json found. Looking for standalone files...");
                      const fileKeys = Object.keys(normalizedFileTree);
                      
                      // Prioritize current file if it exists and is executable
                      let fileToRun = null;
                      let language = null;
                      
                      if (currentFile && normalizedFileTree[currentFile]) {
                        fileToRun = currentFile;
                        // Detect language from extension
                        if (currentFile.endsWith('.js') || currentFile.endsWith('.mjs')) {
                          language = 'javascript';
                        } else if (currentFile.endsWith('.py')) {
                          language = 'python';
                        } else if (currentFile.endsWith('.cpp') || currentFile.endsWith('.c')) {
                          language = 'cpp';
                        } else if (currentFile.endsWith('.java')) {
                          language = 'java';
                        }
                      } else {
                        // Fallback to heuristic search if no current file
                        const jsFiles = fileKeys.filter(f => f.endsWith('.js') || f.endsWith('.mjs'));
                        const pythonFiles = fileKeys.filter(f => f.endsWith('.py'));
                        const cppFiles = fileKeys.filter(f => f.endsWith('.cpp') || f.endsWith('.c'));
                        const javaFiles = fileKeys.filter(f => f.endsWith('.java'));
                        
                        if (jsFiles.length > 0) {
                          fileToRun = jsFiles.find(f => f === 'server.js' || f === 'index.js' || f === 'app.js') || jsFiles[0];
                          language = 'javascript';
                        } else if (pythonFiles.length > 0) {
                          fileToRun = pythonFiles.find(f => f === 'main.py' || f === 'app.py') || pythonFiles[0];
                          language = 'python';
                        } else if (cppFiles.length > 0) {
                          fileToRun = cppFiles.find(f => f === 'main.cpp') || cppFiles[0];
                          language = 'cpp';
                        } else if (javaFiles.length > 0) {
                          fileToRun = javaFiles.find(f => f === 'Main.java') || javaFiles[0];
                          language = 'java';
                        }
                      }
                      
                      if (!fileToRun) {
                        alert("No executable file found. Please select a .js, .py, .cpp, .c, or .java file.");
                        setIsRunning(false);
                        return;
                      }
                      
                      console.log(`Running file: ${fileToRun} (${language})`);
                      
                      // Handle JavaScript files
                      if (language === 'javascript') {
                        setIsRunning(true);

                        // Quick check for common dependencies to install
                        const fileContent = normalizedFileTree[fileToRun]?.file?.contents || "";
                        const commonDeps = ['express', 'cors', 'socket.io', 'mongoose', 'nodemon'];
                        const neededDeps = commonDeps.filter(dep => fileContent.includes(dep));

                        if (neededDeps.length > 0) {
                          console.log(`Detected dependencies: ${neededDeps.join(', ')}. Installing...`);
                          const installProcess = await webContainer.spawn("npm", ["install", ...neededDeps]);
                          
                          const stripAnsi = (str) => {
                            return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
                                      .replace(/\x1B\[[\d;]*[mGKH]/g, '')
                                      .replace(/[\r]/g, '');
                          };
                          
                          installProcess.output.pipeTo(new WritableStream({
                            write(chunk) { 
                              console.log("Install output:", chunk);
                              const cleaned = stripAnsi(chunk).trim();
                              if (cleaned) {
                                setTerminalOutput(prev => [...prev, cleaned]);
                              }
                            }
                          }));
                          await installProcess.exit;
                        }
                        
                        let tempRunProcess = await webContainer.spawn("node", [fileToRun]);
                        setRunProcess(tempRunProcess);

                        tempRunProcess.output.pipeTo(
                          new WritableStream({
                            write(chunk) {
                              console.log("App output:", chunk);
                              const stripAnsi = (str) => str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1B\[[\d;]*[mGKH]/g, '').replace(/[\r]/g, '');
                              const cleaned = stripAnsi(chunk).trim();
                              if (cleaned) {
                                setTerminalOutput(prev => [...prev, cleaned]);
                              }
                            },
                          })
                        );

                        // Handle server ready event
                        const serverReadyHandler = (port, url) => {
                          console.log("Server ready on port:", port, "URL:", url);
                          setIframeUrl(url);
                          setIsRunning(false);
                          webContainer.off("server-ready", serverReadyHandler);
                        };
                        webContainer.on("server-ready", serverReadyHandler);
                        
                        // Handle process exit
                        tempRunProcess.exit.then((code) => {
                          console.log("Process exited with code:", code);
                          setIsRunning(false);
                          setRunProcess(null);
                        });
                      } else {
                        // Handle backend languages (Python, C++, Java)
                        setIsRunning(true);
                        
                        const fileContent = normalizedFileTree[fileToRun]?.file?.contents || "";
                        
                        try {
                          const response = await axios.post('/projects/execute', {
                            language,
                            code: fileContent,
                            fileName: fileToRun
                          });
                          
                          const { output, error, stderr } = response.data;
                                 
                          if (output) setTerminalOutput(prev => [...prev, output]);
                          if (stderr) setTerminalOutput(prev => [...prev, `[STDERR]\n${stderr}`]);
                          if (error) setTerminalOutput(prev => [...prev, `[ERROR]\n${error}`]);
                          
                        } catch (execErr) {
                          setTerminalOutput(prev => [...prev, `> Execution failed: ${execErr.response?.data?.error || execErr.message}`]);
                        } finally {
                          setIsRunning(false);
                        }
                      }
                    }
                  } catch (error) {
                    console.error("Error running application:", error);
                    alert(
                      `Failed to run application: ${error.message || error}`
                    );
                    setIsRunning(false);
                    setRunProcess(null);
                  }
                }}
                disabled={
                  isRunning ||
                  !webContainer ||
                  Object.keys(fileTree).length === 0
                }
                className={`py-2.5 px-5 ${
                  isRunning
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg"
                } text-white rounded-xl transition-all duration-200 flex items-center gap-2 font-semibold text-sm`}
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
                    if (runProcess) {
                      runProcess.kill();
                      setRunProcess(null);
                      setIframeUrl(null);
                      setIsRunning(false);
                    }
                  }}
                  className="py-2.5 px-5 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl transition-all duration-200 flex items-center gap-2 font-semibold text-sm shadow-lg"
                >
                  <i className="ri-stop-fill"></i>
                  <span>Stop</span>
                </button>
              )}
            </div>
          </div>

          <div className="bottom flex flex-grow max-w-full shrink overflow-auto flex-col">
            {fileTree[currentFile] ? (
              <div className="code-editor-area h-[60%] overflow-auto flex-grow bg-slate-50">
                <pre className="hljs h-full">
                  <code
                    className="hljs h-full outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const updatedContent = e.target.innerText;
                      const ft = {
                        ...fileTree,
                        [currentFile]: {
                          file: {
                            contents: updatedContent,
                          },
                        },
                      };
                      setFileTree(ft);
                      saveFileTree(ft);
                    }}
                    dangerouslySetInnerHTML={{
                      __html: hljs.highlight(
                        "javascript",
                        fileTree[currentFile].file.contents
                      ).value,
                    }}
                    style={{
                      whiteSpace: "pre-wrap",
                      paddingBottom: "25rem",
                      counterSet: "line-numbering",
                    }}
                  />
                </pre>
              </div>
            ) : (
              <div className="h-[60%] flex items-center justify-center bg-slate-50 text-slate-400">
                <div className="text-center">
                  <i className="ri-code-s-slash-line text-6xl mb-4"></i>
                  <p className="text-lg font-semibold">No file selected</p>
                  <p className="text-sm">Select a file from the sidebar to start editing</p>
                </div>
              </div>
            )}
            
            {/* Terminal */}
            <div className="terminal-area h-[40%] bg-slate-950 text-slate-300 font-mono text-sm overflow-hidden flex flex-col border-t border-slate-800">
                <div className="flex justify-between items-center px-4 py-2 bg-slate-900 border-b border-slate-800 select-none">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center border border-slate-700">
                          <i className="ri-terminal-box-fill text-slate-400 text-xs"></i>
                        </div>
                        <span className="font-semibold text-xs text-slate-400 uppercase tracking-wider">Terminal</span>
                    </div>
                    <button 
                        onClick={() => setTerminalOutput([])} 
                        className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1 hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1 font-medium"
                        title="Clear Terminal"
                    >
                        <i className="ri-delete-bin-line"></i>
                        Clear
                    </button>
                </div>
                <div className="flex-grow p-4 overflow-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                    {terminalOutput.length > 0 ? (
                        <div className="flex flex-col gap-1 font-mono text-xs">
                            {terminalOutput.map((line, i) => (
                                <div key={i} className="whitespace-pre-wrap break-words text-slate-300 font-medium">
                                  <span className="text-slate-600 mr-2 select-none">$</span>
                                  {line}
                                </div>
                            ))}
                            <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} /> 
                        </div>
                    ) : (
                        <div className="text-slate-700 flex items-center gap-2 h-full justify-center opacity-50 select-none flex-col">
                            <i className="ri-terminal-line text-4xl mb-2"></i>
                            <span className="text-xs font-medium uppercase tracking-widest">Ready to Execute</span>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        {iframeUrl && webContainer && (
          <div className="flex w-96 flex-col h-full border-l-2 border-slate-200 shadow-2xl">
            <div className="address-bar bg-gradient-to-r from-slate-100 to-white border-b-2 border-slate-200 p-2">
              <input
                type="text"
                onChange={(e) => setIframeUrl(e.target.value)}
                value={iframeUrl}
                className="w-full px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-mono text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <iframe src={iframeUrl} className="w-full h-full bg-white"></iframe>
          </div>
        )}
      </section>

      {/* Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-start justify-center z-50 pt-20 transition-all duration-300">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 transform transition-all duration-300 scale-100 opacity-100 flex flex-col max-h-[85vh] overflow-hidden">
            <header className="flex justify-between items-center p-6 border-b border-slate-100 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Invite Collaborators</h2>
                <p className="text-sm text-slate-500 mt-0.5">Add team members to your project</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </header>
            
            <div className="p-6 flex-grow flex flex-col overflow-hidden">
              <div className="mb-4">
                <div className="relative group">
                  <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50/50 focus:border-blue-400 outline-none transition-all text-sm font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="users-list flex flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent flex-grow -mx-2 px-2">
                {isSearching && (
                  <div className="text-center text-slate-500 py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-xs font-medium">Finding users...</p>
                  </div>
                )}
                {!isSearching &&
                  searchResults.length === 0 &&
                  searchQuery.length >= 2 && (
                    <div className="text-center text-slate-400 py-8 flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                         <i className="ri-user-search-line text-2xl opacity-50"></i>
                      </div>
                      <p className="text-sm font-semibold text-slate-600">No users found</p>
                      <p className="text-xs text-slate-400 mt-1">Try a different username or email</p>
                    </div>
                  )}
                {searchResults.map((user) => {
                  const displayUsername = user.username || user.email || 'Unknown';
                  const displayEmail = user.email || user.username || '';
                  const initial = displayUsername[0]?.toUpperCase() || '?';
                  
                  return (
                  <div
                    key={user._id}
                    className="user p-3 border border-slate-100 rounded-xl flex justify-between items-center hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 bg-white border border-slate-200 font-bold text-sm shadow-sm group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                        {initial}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-slate-800 group-hover:text-blue-700 transition-colors">@{displayUsername}</span>
                        <span className="text-xs text-slate-500">{displayEmail}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => sendInvitation(user._id)}
                      className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all shadow-sm opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
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
    </main>
  );
};

export default Project;