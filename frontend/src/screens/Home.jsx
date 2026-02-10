import React, { useContext, useState, useEffect } from 'react'
import { UserContext } from '../context/user.context'
import axios from "../config/axios"
import { useNavigate } from 'react-router-dom'
import { initializeSocket, receiveMessage } from '../config/socket'




const Home = () => {

    const { user, setUser } = useContext(UserContext)
    const [ isModalOpen, setIsModalOpen ] = useState(false)
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [projectTechStack, setProjectTechStack] = useState('');

    // Recent Updates View All State
    const [showAllUpdates, setShowAllUpdates] = useState(false);
    
    // Rename/Menu States
    const [activeMenu, setActiveMenu] = useState(null); // stores project ID
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [newName, setNewName] = useState('');
    
    const [ project, setProject ] = useState([])
    const [ invitations, setInvitations ] = useState([])
    const [ showNotifications, setShowNotifications ] = useState(false)

    const navigate = useNavigate()

    function createProject(e) {
        e.preventDefault();
        
        // Parse tech stack string into array and trim whitespace
        const techStackArray = projectTechStack
            .split(',')
            .map(tech => tech.trim())
            .filter(tech => tech.length > 0);

        axios.post('/projects/create', {
            name: projectName,
            description: projectDescription,
            techStack: techStackArray.length > 0 ? techStackArray : undefined
        })
            .then((res) => {
                console.log(res);
                setIsModalOpen(false);
                setProjectName(''); // Reset form
                setProjectDescription('');
                setProjectTechStack('');
                setProject(prev => [...prev, res.data]); // Optimistically update UI
            })
            .catch((error) => {
                console.log(error);
                alert('Failed to create project: ' + (error.response?.data?.message || error.message));
            })
    }

    const handleRenameProject = (e) => {
        e.preventDefault();
        axios.put('/projects/rename', {
            projectId: editingProject._id,
            name: newName
        })
            .then((res) => {
                setProject(prev => prev.map(p => p._id === editingProject._id ? { ...p, name: newName } : p));
                setIsRenameModalOpen(false);
                setEditingProject(null);
                setNewName('');
            })
            .catch(err => {
                console.error(err);
                alert("Failed to rename project");
            });
    };

    const handleDeleteProject = (projectId) => {
        if(confirm("Are you sure you want to delete this project?")) {
            axios.delete(`/projects/delete/${projectId}`)
                .then(() => {
                    setProject(prev => prev.filter(p => p._id !== projectId));
                    setActiveMenu(null);
                })
                .catch(console.error);
        }
    };

    const fetchProjects = () => {
        axios.get('/projects/all').then((res) => {
            setProject(res.data.projects)
        }).catch(err => {
            console.log(err)
        })
    }
    
    const fetchInvitations = () => {
        axios.get('/users/invitations/get').then((res) => {
            setInvitations(res.data.invitations)
        }).catch(err => {
            console.error(err)
        })
    }

    useEffect(() => {
        fetchProjects()
        fetchInvitations()
        
        // Initialize global socket (no project ID)
        const socket = initializeSocket(null);
        
        receiveMessage('project-invitation', (data) => {
            console.log('New invitation received:', data);
            setInvitations(prev => [data, ...prev]);
            // Optional: Show toast
        });

        // Cleanup
        return () => {
            // disconnectSocket(); // Don't disconnect global socket as it might be needed?
            // Actually usually good to disconnect on unmount
        }

    }, [])
    
    const handleAcceptInvitation = async (invitation, action) => {
         try {
            await axios.post('/users/invitations/accept', { invitationId: invitation._id, action })
            setInvitations(prev => prev.filter(inv => inv._id !== invitation._id))
            if (action === 'accepted') {
                fetchProjects(); // Refresh projects list to show the new one
            }
        } catch (err) {
            console.error(`Error ${action} invitation:`, err)
        }
    }

    const handleLogout = async () => {
        try {
            await axios.get('/users/logout')
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            setUser(null)
            navigate('/login')
        } catch (err) {
            console.error('Logout error:', err)
            // Force logout even if API fails
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            setUser(null)
            navigate('/login')
        }
    }

    const [isGridView, setIsGridView] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState(localStorage.getItem('activeTab') || 'dashboard');

    // Profile State
    const [ newUsername, setNewUsername ] = useState('');
    const [ userNameMessage, setUserNameMessage ] = useState(null);
    const [ userNameError, setUserNameError ] = useState(null);
    const [ isEditingUsername, setIsEditingUsername ] = useState(false);
    const [ imageMessage, setImageMessage ] = useState(null);
    const [ imageError, setImageError ] = useState(null);
    const [ loading, setLoading ] = useState(false);
    
    // Editor Preferences
    const [ editorFontSize, setEditorFontSize ] = useState(localStorage.getItem('editorFontSize') || '14');
    const [ editorWordWrap, setEditorWordWrap ] = useState(localStorage.getItem('editorWordWrap') === 'false' ? false : true);
    const [ editorTheme, setEditorTheme ] = useState(user?.editorTheme || 'vs-dark');

    // App Theme State
    const [ appTheme, setAppTheme ] = useState(user?.appTheme || 'dark');

    const THEMES = {
        dark: {
            bg: 'bg-black',
            card: 'bg-[#121212]/80 backdrop-blur-xl', // More glass-like
            subCard: 'bg-white/5',
            border: 'border-white/10',
            borderHover: 'hover:border-white/20', 
            text: 'text-white',
            secondaryText: 'text-gray-400',
            button: 'bg-blue-600 text-white',
            buttonHover: 'hover:bg-blue-700',
            sidebar: 'bg-[#141414]/90 backdrop-blur-xl border-r border-[#222]',
            header: 'border-b border-[#222] bg-[#141414]/80 backdrop-blur-md',
            navHover: 'hover:bg-white/10 hover:text-white hover:backdrop-blur-md hover:border-white/10 border border-transparent',
            navActive: 'bg-white/10 text-white border-white/10 shadow-lg shadow-black/20 backdrop-blur-md'
        },
        light: {
            bg: 'bg-[#f0f2f5]', // Slightly darker for better glass contrast
            card: 'bg-white/70 backdrop-blur-xl shadow-sm',
            subCard: 'bg-black/5',
            border: 'border-white/40',
            borderHover: 'hover:border-black/5',
            text: 'text-[#212529]',
            secondaryText: 'text-[#868e96]', 
            button: 'bg-[#212529] text-white',
            buttonHover: 'hover:bg-[#343a40]',
            sidebar: 'bg-white/80 backdrop-blur-xl border-r border-[#e9ecef]',
            header: 'border-b border-[#e9ecef] bg-white/80 backdrop-blur-md',
            navHover: 'hover:bg-[#212529]/5 hover:text-[#212529] hover:backdrop-blur-md hover:border-[#212529]/10 border border-transparent',
            navActive: 'bg-[#212529]/10 text-[#212529] border-[#212529]/10 shadow-lg shadow-black/5 backdrop-blur-md'
        }
    };

    const colors = THEMES[appTheme] || THEMES.dark;

    const handleAppThemeChange = async (theme) => {
        setAppTheme(theme);
        try {
            await axios.put('/users/update-theme', { theme, type: 'app' });
            // Update local user object
            const updatedUser = { ...user, appTheme: theme };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch(err) {
            console.error('Failed to update app theme', err);
        }
    };

    const handleFontSizeChange = (size) => {
        setEditorFontSize(size);
        localStorage.setItem('editorFontSize', size);
    };

    const handleWordWrapChange = (wrap) => {
        setEditorWordWrap(wrap);
        localStorage.setItem('editorWordWrap', wrap);
    };

    const handleThemeChange = async (theme) => {
        setEditorTheme(theme);
        try {
            await axios.put('/users/update-theme', { theme });
            // Update local user object to reflect change immediately if needed by other components
            const updatedUser = { ...user, editorTheme: theme };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser)); // Keep persistence in sync
        } catch(err) {
            console.error('Failed to update theme', err);
        }
    };

    // Password Change State

    // Password Change State
    const [ passwordData, setPasswordData ] = useState({ current: '', new: '' });
    const [ passwordMessage, setPasswordMessage ] = useState(null);
    const [ passwordError, setPasswordError ] = useState(null);
    
    // Delete Account State
    const [ isDeleteModalOpen, setIsDeleteModalOpen ] = useState(false);
    const [ deleteStep, setDeleteStep ] = useState(1);
    const [ deletePassword, setDeletePassword ] = useState('');
    const [ deleteReason, setDeleteReason ] = useState('no-longer-needed');
    const [ customReason, setCustomReason ] = useState('');
    const [ deleteError, setDeleteError ] = useState(null);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setPasswordMessage(null);
        setPasswordError(null);
        try {
            const res = await axios.post('/users/change-password', {
                currentPassword: passwordData.current,
                newPassword: passwordData.new
            });
            setPasswordMessage(res.data.message);
            setPasswordData({ current: '', new: '' });
            setTimeout(() => setPasswordMessage(null), 3000);
        } catch (err) {
            setPasswordError(err.response?.data?.error || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = () => {
        setIsDeleteModalOpen(true);
        setDeleteStep(1);
        setDeleteError(null);
        setDeletePassword('');
    };

    const confirmDeleteAccount = async (e) => {
        e.preventDefault();
        setLoading(true);
        setDeleteError(null);

        const finalReason = deleteReason === 'other' ? customReason : deleteReason;

        try {
            await axios.delete('/users/delete', {
                data: { password: deletePassword, reason: finalReason }
            });
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            navigate('/login');
        } catch (err) {
            console.error(err);
            setDeleteError(err.response?.data?.error || 'Failed to delete account');
            setLoading(false);
        }
    };

    const fileInputRef = React.useRef(null);

    const handleUpdateUsername = async (e) => {
        e.preventDefault();
        setLoading(true);
        setUserNameMessage(null);
        setUserNameError(null);
        try {
            const res = await axios.put('/users/update-username', { username: newUsername });
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            if (res.data.token) localStorage.setItem('token', res.data.token);
            setUserNameMessage(res.data.message);
            setNewUsername('');
            setTimeout(() => {
                setIsEditingUsername(false);
                setUserNameMessage(null);
            }, 2000);
        } catch (err) {
            setUserNameError(err.response?.data?.error || 'Failed to update username');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setLoading(true);
        setImageMessage(null);
        setImageError(null);

        try {
            const res = await axios.post('/users/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setImageMessage('Profile image updated successfully');
            setTimeout(() => setImageMessage(null), 3000);
        } catch (err) {
            setImageError(err.response?.data?.error || 'Failed to upload image');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        localStorage.setItem('activeTab', tab);
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString || Date.now());
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return "Just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} min ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hr ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} days ago`;
        
        return date.toLocaleDateString();
    };

    const filteredProjects = project.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Calculate stats
    const totalProjects = project.length;
    // Calculate account age or start date
    // Use user.createdAt if available, fallback to current date to avoid N/A during dev/stale state
    const memberSinceDate = user?.createdAt ? new Date(user.createdAt) : new Date();
    const memberSince = memberSinceDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    // Debug user object to see why createdAt might be missing
    // console.log('Home Render - User:', user);

    const pendingInvites = invitations.length;

    // Mobile Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // Graph Tooltip State
    const [graphTooltip, setGraphTooltip] = useState(null);

    // ... (existing state) ...

    return (
        <main className={`w-full h-screen flex ${colors.bg} overflow-hidden relative`}>
            
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div 
                className={`
                    fixed md:static inset-y-0 left-0 z-40
                    w-72 ${colors.sidebar} flex flex-col transition-transform duration-300
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                <div className="p-4 flex justify-between items-center">
                    <div 
                        className="flex items-center gap-1.5 px-1 cursor-pointer" 
                        onClick={() => navigate('/dashboard')}
                    >
                         <div className="w-8 h-8 flex items-center justify-center overflow-hidden">
                             <img src="/logo.png" alt="codeX" className={`w-full h-full object-contain ${appTheme === 'dark' ? 'mix-blend-screen' : 'invert'}`} />
                         </div>
                         <span className={`font-black text-lg tracking-wide ${colors.text}`}>codeX</span>
                    </div>
                    {/* Close button for mobile */}
                    <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden p-2 text-gray-400 hover:text-white"
                    >
                        <i className="ri-close-line text-xl"></i>
                    </button>
                </div>

                <div className="px-4 space-y-2 flex-grow">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-3-line' },
                        { id: 'projects', label: 'Projects', icon: 'ri-folder-3-line' },
                        { id: 'settings', label: 'Settings', icon: 'ri-settings-3-line' }
                    ].map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => {
                                handleTabChange(tab.id);
                                setIsSidebarOpen(false); // Close on selection (mobile)
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
                                activeTab === tab.id || (tab.id === 'projects' && activeTab === 'project')
                                    ? colors.navActive 
                                     : `${colors.secondaryText} ${colors.navHover}`
                            }`}
                        >
                            <i className={`${tab.icon} text-lg`}></i>
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className={`p-4 border-t ${colors.border}`}>
                    <div 
                        onClick={() => handleTabChange('profile')}
                        className={`p-4 ${colors.subCard} rounded-xl border ${colors.border} cursor-pointer ${appTheme === 'dark' ? 'hover:bg-[#222]' : 'hover:bg-gray-100'} transition-colors group relative ${activeTab === 'profile' ? 'ring-1 ring-blue-500/50' : ''}`}
                    >
                        <div className='flex items-center gap-3 mb-3'>
                            <div className='w-10 h-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden'>
                                {user?.profileImage ? (
                                    <img src={user.profileImage.startsWith('http') ? user.profileImage : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${user.profileImage}`} className="w-full h-full object-cover" />
                                ) : (
                                    (user?.username?.[0] || 'U').toUpperCase()
                                )}
                            </div>
                            <div className='overflow-hidden'>
                                <p className={`text-sm font-medium ${colors.text} truncate group-hover:text-blue-400 transition-colors`}>{user?.username || 'User'}</p>
                                <p className='text-xs text-gray-500 truncate'>Pro Plan</p>
                            </div>
                        </div>
                        <button onClick={handleLogout} className={`w-full py-2 text-xs ${colors.secondaryText} ${appTheme === 'dark' ? 'hover:text-white border-[#333] hover:border-white/20' : 'hover:text-gray-900 border-gray-300 hover:border-gray-400'} border rounded-lg transition-all`}>
                            Log Out
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow flex flex-col h-screen overflow-hidden w-full relative">
                {/* Header */}
                <header 
                    className={`flex justify-between items-center px-4 md:px-10 py-4 md:py-6 ${colors.header} z-10 shrink-0`}
                >
                    <div className="flex items-center gap-4">
                        {/* Mobile Menu Button */}
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className={`md:hidden p-2 rounded-lg ${colors.subCard} border ${colors.border} ${colors.text}`}
                        >
                            <i className="ri-menu-2-line text-lg"></i>
                        </button>

                        <h2 className={`text-xl font-semibold ${colors.text}`}>
                            {activeTab === 'dashboard' ? 'Overview' : 'Projects'}
                        </h2>
                    </div>
                    
                    <div className='flex items-center gap-3 md:gap-5'>
                         {/* Search - Only show in Projects tab */}
                        {activeTab === 'projects' && (
                            <div className="relative group hidden md:block">
                                <i className={`ri-search-line absolute left-3 top-1/2 -translate-y-1/2 ${colors.secondaryText} group-focus-within:${appTheme === 'dark' ? 'text-white' : 'text-gray-900'} transition-colors`}></i>
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search projects..." 
                                    className={`${colors.subCard} border ${colors.border} rounded-xl py-2 pl-10 pr-4 w-64 text-sm ${colors.text} focus:outline-none ${appTheme === 'dark' ? 'focus:border-[#444]' : 'focus:border-gray-400'} transition-all`}
                                />
                            </div>
                        )}

                        {/* Notifications */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`w-10 h-10 rounded-xl ${colors.subCard} border ${colors.border} flex items-center justify-center ${colors.secondaryText} ${appTheme === 'dark' ? 'hover:text-white hover:border-[#444]' : 'hover:text-gray-900 hover:border-gray-400'} transition-all relative`}
                            >
                                <i className="ri-notification-3-fill text-lg"></i>
                                {invitations.length > 0 && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></span>
                                )}
                            </button>
                            
                            {showNotifications && (
                                <div 
                                    className={`absolute right-0 top-14 w-80 ${colors.card} border ${colors.border} rounded-2xl shadow-2xl z-50 overflow-hidden`}
                                >
                                    <div className={`p-4 border-b ${colors.border}`}>
                                        <h3 className={`font-medium text-sm ${colors.text}`}>Notifications</h3>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {invitations.length === 0 ? (
                                            <div className="p-8 text-center text-gray-600 text-sm">No new notifications</div>
                                        ) : (
                                            invitations.map(invitation => (
                                            <div key={invitation._id} className="p-4 border-b border-[#222] hover:bg-[#1A1A1A] transition-colors">
                                                    <p className="text-sm text-gray-300 mb-3">
                                                        <span className="font-medium text-white">@{invitation.sender?.username}</span> invited you to <span className="font-medium text-blue-400">{invitation.project?.name}</span>
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleAcceptInvitation(invitation, 'accepted')}
                                                            className="flex-1 py-1.5 bg-white text-black text-xs rounded-lg hover:bg-gray-200 font-medium transition-colors"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button 
                                                            onClick={() => handleAcceptInvitation(invitation, 'rejected')}
                                                            className="flex-1 py-1.5 bg-[#222] text-gray-300 text-xs rounded-lg hover:bg-[#333] font-medium transition-colors"
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                            </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-grow overflow-y-auto p-4 md:p-10">
                    
                                    {/* Stats - Only show in Dashboard tab */}
                                    {/* Stats - Optimized Mobile Grid */}
                        {activeTab === 'dashboard' && (
                            <div 
                                className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12"
                            >
                                <div className={`${colors.card} p-5 md:p-6 rounded-3xl border ${colors.border} ${colors.borderHover} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 group col-span-1 relative overflow-hidden`}>
                                    <div className={`absolute top-0 right-0 p-20 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/10`}></div>
                                    <div className="flex justify-between items-start mb-3 md:mb-4 relative">
                                        <div className={`p-2.5 ${colors.subCard} rounded-2xl ${colors.text} ${appTheme === 'dark' ? 'group-hover:bg-white group-hover:text-black' : 'group-hover:bg-gray-900 group-hover:text-white'} transition-colors shadow-sm`}><i className="ri-folder-fill text-lg"></i></div>
                                    </div>
                                    <h3 className={`text-2xl md:text-3xl font-bold ${colors.text} mb-1 tracking-tight relative`}>{totalProjects}</h3>
                                    <p className="text-xs md:text-sm text-gray-500 font-medium relative">Active Projects</p>
                                </div>

                                <div className={`${colors.card} p-5 md:p-6 rounded-3xl border ${colors.border} ${colors.borderHover} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10 group col-span-1 relative overflow-hidden`}>
                                    <div className={`absolute top-0 right-0 p-20 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-purple-500/10`}></div>
                                    <div className="flex justify-between items-start mb-3 md:mb-4 relative">
                                        <div className={`p-2.5 ${colors.subCard} rounded-2xl ${colors.text} ${appTheme === 'dark' ? 'group-hover:bg-white group-hover:text-black' : 'group-hover:bg-gray-900 group-hover:text-white'} transition-colors shadow-sm`}><i className="ri-calendar-2-fill text-lg"></i></div>
                                    </div>
                                    <h3 className={`text-2xl md:text-3xl font-bold ${colors.text} mb-1 tracking-tight relative`}>{memberSince}</h3>
                                    <p className="text-xs md:text-sm text-gray-500 font-medium relative">Member Since</p>
                                </div>

                                <div className={`${colors.card} p-5 md:p-6 rounded-3xl border ${colors.border} ${colors.borderHover} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-green-500/10 group col-span-2 md:col-span-1 relative overflow-hidden`}>
                                    <div className={`absolute top-0 right-0 p-20 bg-green-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-green-500/10`}></div>
                                    <div className="flex justify-between items-start mb-3 md:mb-4 relative">
                                        <div className={`p-2.5 ${colors.subCard} rounded-2xl ${colors.text} ${appTheme === 'dark' ? 'group-hover:bg-white group-hover:text-black' : 'group-hover:bg-gray-900 group-hover:text-white'} transition-colors shadow-sm`}><i className="ri-mail-send-fill text-lg"></i></div>
                                        {pendingInvites > 0 && <span className="text-[10px] md:text-xs font-bold text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">Action Needed</span>}
                                    </div>
                                    <h3 className={`text-2xl md:text-3xl font-bold ${colors.text} mb-1 tracking-tight relative`}>{pendingInvites}</h3>
                                    <p className="text-xs md:text-sm text-gray-500 font-medium relative">Pending Invites</p>
                                </div>
                            </div>
                        )}

                    {/* Activity Graph Section */}
                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                            <div className={`${colors.card} p-4 md:p-6 rounded-3xl border ${colors.border} ${colors.borderHover} transition-all`}>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className={`text-lg font-bold ${colors.text}`}>Project Activity</h3>
                                    <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-lg border border-white/5">Last 7 Days</span>
                                </div>
                                <div className="h-48 md:h-64 relative w-full">
                                    {/* Grid Lines */}
                                    <div className="absolute inset-0 flex flex-col justify-between text-[10px] text-gray-600 mb-6">
                                        {[4, 3, 2, 1, 0].map(val => (
                                            <div key={val} className={`w-full border-b ${colors.border} border-dashed last:border-0 h-0 pl-0 relative`}>
                                                <span className="absolute -top-2 text-[#444]">{val === 0 ? '' : val}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Dynamic Area Chart based on project updates */}
                                    {(() => {
                                        // Generate last 7 days data
                                        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                        const data = new Array(7).fill(0);
                                        const today = new Date();
                                        
                                        // Populate with project updates
                                        project.forEach(p => {
                                            const date = new Date(p.updatedAt);
                                            const diffTime = Math.abs(today - date);
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                                            if (diffDays <= 7) {
                                                const dayIndex = date.getDay(); 
                                                data[dayIndex] = (data[dayIndex] || 0) + 1;
                                            }
                                        });

                                        // Reorder to start from 6 days ago
                                        const chartData = [];
                                        for (let i = 6; i >= 0; i--) {
                                            const d = new Date(today);
                                            d.setDate(d.getDate() - i);
                                            const dayName = days[d.getDay()];
                                            const count = data[d.getDay()];
                                            chartData.push({ day: dayName, count });
                                        }
                                        
                                        // Calculate Max for Y-Axis (Fixed scale 0-4 for small numbers, or dynamic if larger)
                                        const maxCount = Math.max(...chartData.map(d => d.count), 4); 
                                        
                                        // Helper to generate Monotone X spline path
                                        const getPath = (points, isClosed = false) => {
                                            if (points.length < 2) return "";

                                            const dp = points.map((d, i) => ({
                                                x: i * (100 / (points.length - 1)),
                                                y: 100 - (d.count * (100 / maxCount))
                                            }));

                                            const k = dp.length;
                                            
                                            // Calculate tangents (m)
                                            const m = new Array(k).fill(0);
                                            const delta = new Array(k - 1).fill(0);

                                            for (let i = 0; i < k - 1; i++) {
                                                delta[i] = (dp[i+1].y - dp[i].y) / (dp[i+1].x - dp[i].x);
                                            }

                                            for (let i = 0; i < k - 1; i++) {
                                                if (i === 0) {
                                                    m[i] = delta[i];
                                                } else {
                                                    m[i] = (delta[i-1] + delta[i]) / 2;
                                                }
                                            }
                                            m[k-1] = delta[k-2];

                                            // Fix tangents for horizontal segments (monotonicity)
                                            for (let i = 0; i < k - 1; i++) {
                                                if (delta[i] === 0) {
                                                    m[i] = 0;
                                                    m[i+1] = 0;
                                                }
                                            }

                                            // Alpha/Beta Check
                                            for (let i = 0; i < k - 1; i++) {
                                                if (delta[i] === 0) continue;
                                                const alpha = m[i] / delta[i];
                                                const beta = m[i+1] / delta[i];
                                                const tau = 3;
                                                if (alpha < 0 || beta < 0) {
                                                    // Should not happen for monotone but good safety
                                                }
                                                if (alpha * alpha + beta * beta > 9) {
                                                     const t = tau / Math.sqrt(alpha * alpha + beta * beta);
                                                     m[i] = t * alpha * delta[i];
                                                     m[i+1] = t * beta * delta[i];
                                                }
                                            }

                                            let path = `M ${dp[0].x},${dp[0].y}`;

                                            for (let i = 0; i < k - 1; i++) {
                                                const p0 = dp[i];
                                                const p1 = dp[i+1];
                                                const lenX = p1.x - p0.x;
                                                
                                                const cp1x = p0.x + lenX / 3;
                                                const cp1y = p0.y + (m[i] * lenX) / 3;
                                                
                                                const cp2x = p1.x - lenX / 3;
                                                const cp2y = p1.y - (m[i+1] * lenX) / 3;

                                                path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
                                            }

                                            if (isClosed) {
                                                path += ` L 100,100 L 0,100 Z`;
                                            }

                                            return path;
                                        };

                                        const areaPath = getPath(chartData, true);
                                        const linePath = getPath(chartData, false);

                                        return (
                                            <>
                                            <div className="absolute inset-0 top-2 left-4 right-0 bottom-6" onMouseLeave={() => setGraphTooltip(null)}>
                                                {/* SVG Lines Only */}
                                                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                                    <defs>
                                                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                                                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                                        </linearGradient>
                                                    </defs>
                                                    
                                                    {/* Area Fill */}
                                                    <path d={areaPath} fill="url(#chartGradient)" className="transition-opacity duration-300 opacity-70" />
                                                    
                                                    {/* Stroke Line */}
                                                    <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                                </svg>

                                                {/* HTML Overlay for Dots & Interactivity (Respects Aspect Ratio) */}
                                                {chartData.map((d, i) => {
                                                    const x = i * (100 / (chartData.length - 1));
                                                    const y = 100 - (d.count * (100 / maxCount));
                                                    const isHovered = graphTooltip && graphTooltip.day === d.day;
                                                    
                                                    return (
                                                        <div 
                                                            key={i}
                                                            className="absolute group"
                                                            style={{ 
                                                                left: `${x}%`, 
                                                                top: `${y}%`,
                                                                transform: 'translate(-50%, -50%)' // Center the dot on the coordinate
                                                            }}
                                                            onMouseEnter={() => setGraphTooltip({ x, y, count: d.count, day: d.day })}
                                                            onMouseLeave={() => setGraphTooltip(null)}
                                                        >
                                                            {/* Invisible Hit Area */}
                                                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-24 bg-transparent cursor-pointer" />
                                                            
                                                            {/* Visible HTML Dot - Always Circular */}
                                                            <div 
                                                                className={`
                                                                    w-2.5 h-2.5 rounded-full border-[2.5px] cursor-pointer transition-all duration-200 ease-out z-10
                                                                    ${isHovered 
                                                                        ? 'w-3.5 h-3.5 bg-white border-[#10b981] shadow-[0_0_0_3px_rgba(16,185,129,0.2)]' 
                                                                        : 'bg-[#1e1e1e] border-[#10b981]'}
                                                                `}
                                                            />
                                                        </div>
                                                    )
                                                })}

                                                {/* Tooltip */}
                                                {graphTooltip && (
                                                    <div 
                                                        className="absolute pointer-events-none z-50 flex flex-col items-center"
                                                        style={{ 
                                                            left: `${graphTooltip.x}%`, 
                                                            top: `${graphTooltip.y}%`,
                                                            transform: 'translate(-50%, -100%) translateY(-12px)'
                                                        }}
                                                    >
                                                        <div className="bg-[#1e1e1e] border border-white/10 rounded-lg shadow-xl px-3 py-2 min-w-[80px] text-center transform transition-all duration-200 ease-out scale-100 opacity-100">
                                                            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-0.5">{graphTooltip.day}</div>
                                                            <div className="text-sm font-bold text-white leading-none pb-0.5">{graphTooltip.count} <span className="text-[10px] font-normal text-gray-400">updates</span></div>
                                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-[-5px] w-2.5 h-2.5 bg-[#1e1e1e] border-r border-b border-white/10 rotate-45"></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* X-Axis Labels */}
                                            <div className="absolute bottom-0 left-4 right-0 flex justify-between text-[10px] text-gray-500 font-medium select-none">
                                                {chartData.map((d, i) => (
                                                    <span key={i} className="w-4 text-center">{d.day}</span>
                                                ))}
                                            </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className={`${colors.card} p-5 md:p-6 rounded-3xl border ${colors.border} ${colors.borderHover} transition-all flex flex-col`}>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className={`text-lg font-bold ${colors.text}`}>Recent Updates</h3>
                                    <button 
                                        onClick={() => setShowAllUpdates(!showAllUpdates)}
                                        className={`text-xs ${colors.button} px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity`}
                                    >
                                        {showAllUpdates ? 'Show Less' : 'View All'}
                                    </button>
                                </div>
                                
                                <div className="space-y-3 overflow-y-auto custom-scrollbar flex-grow pr-1" style={{ maxHeight: showAllUpdates ? '600px' : '300px', transition: 'max-height 0.3s ease-in-out' }}>
                                    {project.flatMap(p => 
                                        p.users && p.users.length > 0 ? p.users.map(u => ({
                                            ...u, 
                                            project: p.name, 
                                            action: 'contributed to', 
                                            time: p.updatedAt,
                                            projectId: p._id
                                        })) : []
                                    )
                                    .sort((a, b) => new Date(b.time) - new Date(a.time))
                                    .slice(0, showAllUpdates ? 50 : 10)
                                    .map((update, i) => (
                                        <div key={i} className={`p-3 rounded-2xl ${colors.subCard} border ${colors.border} hover:bg-white/5 transition-all flex items-center gap-3 group cursor-default`}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20`}>
                                                {update.email ? update.email[0].toUpperCase() : 'U'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${colors.text} font-medium truncate`}>
                                                    <span className={`${appTheme === 'dark' ? 'text-white' : 'text-black'}`}>{update.email ? update.email.split('@')[0] : 'Unknown User'}</span>
                                                    <span className="text-gray-500 font-normal ml-1">pushed to</span>
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <i className="ri-git-branch-line text-xs text-blue-400"></i>
                                                    <p className={`text-xs ${colors.secondaryText} truncate group-hover:text-blue-400 transition-colors`}>{update.project}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap bg-black/20 px-2 py-1 rounded-full">{formatTimeAgo(update.time)}</span>
                                        </div>
                                    ))}

                                    {project.length === 0 && (
                                        <div className="text-center py-10 text-gray-500">
                                            <p>No recent activity</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Projects Section - Only show in Projects tab */}
                    {activeTab === 'projects' && (
                        <>
                            {/* Section Header */}
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-4">
                                    <h3 className={`text-2xl font-bold ${colors.text} tracking-tight`}>All Projects</h3>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${colors.subCard} ${colors.secondaryText} border ${colors.border}`}>{project.length}</span>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setIsModalOpen(true)}
                                        className={`px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2`}
                                    >
                                        <i className="ri-add-line text-lg"></i>
                                        <span className="hidden sm:inline">New Project</span>
                                    </button>
                                    <div className={`p-1 rounded-xl ${colors.subCard} border ${colors.border} flex items-center gap-1`}>
                                        <button 
                                            onClick={() => setIsGridView(true)}
                                            className={`p-2 rounded-lg transition-all duration-300 ${isGridView ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            <i className="ri-layout-grid-fill"></i>
                                        </button>
                                        <button 
                                            onClick={() => setIsGridView(false)}
                                            className={`p-2 rounded-lg transition-all duration-300 ${!isGridView ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                        >
                                            <i className="ri-list-check"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Projects Grid */}
                            <div className={`${isGridView ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'flex flex-col gap-3'}`}>
                                
                                {/* Project List */}
                                {filteredProjects.map((project, index) => (
                                    <div 
                                        key={project._id}
                                        onClick={() => navigate(`/project?id=${project._id}`, { state: { project } })}
                                        className={`${colors.subCard} backdrop-blur-md rounded-3xl border ${colors.border} ${colors.borderHover} hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden ${isGridView ? 'aspect-square flex flex-col p-5' : 'h-20 flex items-center px-6 gap-6'}`}
                                    >
                                        {/* Grid View Content */}
                                        {isGridView && (
                                            <>
                                                <div className="flex justify-between items-start mb-auto">
                                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300`}>
                                                        <i className="ri-code-s-slash-line"></i>
                                                    </div>
                                                    <div className="relative z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveMenu(activeMenu === project._id ? null : project._id);
                                                            }}
                                                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors"
                                                        >
                                                            <i className="ri-more-fill text-xl"></i>
                                                        </button>
                                                         {activeMenu === project._id && (
                                                            <div className="absolute right-0 top-8 bg-[#1c1c1c]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-30 w-36 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingProject(project);
                                                                        setNewName(project.name);
                                                                        setIsRenameModalOpen(true);
                                                                        setActiveMenu(null);
                                                                    }}
                                                                    className="w-full text-left px-3 py-2.5 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors"
                                                                >
                                                                    <i className="ri-pencil-line"></i> Rename
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteProject(project._id);
                                                                    }}
                                                                    className="w-full text-left px-3 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <i className="ri-delete-bin-line"></i> Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h3 className={`text-base font-bold ${colors.text} mb-1 truncate`}>{project.name}</h3>
                                                    <p className={`text-[10px] ${colors.secondaryText} line-clamp-2 leading-relaxed mb-3`}>
                                                        {project.description || "No description provided."}
                                                    </p>
                                                    <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-[10px] bg-white/5 border border-white/5 px-2 py-0.5 rounded text-gray-400 font-mono">
                                                            {formatTimeAgo(project.updatedAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* List View Content */}
                                        {!isGridView && (
                                            <>
                                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg shadow-lg shadow-blue-500/20`}>
                                                    <i className="ri-code-s-slash-line"></i>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className={`text-sm font-bold ${colors.text} truncate`}>{project.name}</h3>
                                                    <p className={`text-xs ${colors.secondaryText} truncate`}>{project.description || "No description"}</p>
                                                </div>
                                                <div className="hidden sm:flex items-center gap-2">
                                                    {(project.techStack || []).slice(0, 3).map((tech, i) => (
                                                        <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-gray-400 border border-white/5`}>{tech}</span>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-4">
                                                     <div className="flex -space-x-2">
                                                        {(project.users || []).slice(0, 3).map((u, i) => (
                                                            <div key={i} className="w-6 h-6 rounded-full border border-[#121212] bg-[#222] flex items-center justify-center text-[9px] text-gray-300 font-bold">
                                                                {(u.email?.[0] || 'U').toUpperCase()}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className={`text-[10px] font-mono ${colors.secondaryText}`}>{formatTimeAgo(project.updatedAt)}</div>
                                                </div>
                                                 <div className="relative">
                                                     <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveMenu(activeMenu === project._id ? null : project._id);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                    >
                                                        <i className="ri-more-2-fill"></i>
                                                    </button>
                                                    {activeMenu === project._id && (
                                                         <div className="absolute right-0 top-8 bg-[#1c1c1c]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-20 w-36 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingProject(project);
                                                                    setNewName(project.name);
                                                                    setIsRenameModalOpen(true);
                                                                    setActiveMenu(null);
                                                                }}
                                                                className="w-full text-left px-3 py-2.5 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2 transition-colors"
                                                            >
                                                                <i className="ri-pencil-line"></i> Rename
                                                            </button>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteProject(project._id);
                                                                }}
                                                                className="w-full text-left px-3 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
                                                            >
                                                                <i className="ri-delete-bin-line"></i> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}

                            </div>
                        </>
                    )}


                    {/* Settings Section - Only Editor & Security */}
                    {activeTab === 'settings' && (
                        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className={`text-3xl font-bold ${colors.text} mb-2`}>Settings</h2>
                            <p className={`${colors.secondaryText} text-sm mb-10`}>Customize your workspace and manage your security.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-8">
                                    {/* Appearance Settings */}
                                    <div className={`${colors.card} rounded-2xl border ${colors.border} overflow-hidden ${colors.borderHover} transition-colors shadow-sm h-fit`}>
                                        <div className={`p-6 border-b ${colors.border} flex items-center gap-3`}>
                                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                                <i className="ri-palette-line text-xl"></i>
                                            </div>
                                            <div>
                                                <h3 className={`text-lg font-bold ${colors.text}`}>Appearance</h3>
                                                <p className={`text-xs ${colors.secondaryText}`}>Customize the application look & feel.</p>
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <div className="flex items-center justify-between group">
                                                <div>
                                                    <p className={`${colors.text} font-medium mb-1`}>App Theme</p>
                                                    <p className={`text-xs ${colors.secondaryText}`}>Choose the overall look of the application.</p>
                                                </div>
                                                <div className={`flex items-center gap-2 ${colors.subCard} rounded-lg border ${colors.border} p-1`}>
                                                    {[
                                                        { id: 'dark', name: 'Dark', icon: 'ri-moon-line' },
                                                        { id: 'light', name: 'Light', icon: 'ri-sun-line' }
                                                    ].map(theme => (
                                                        <button
                                                            key={theme.id}
                                                            onClick={() => handleAppThemeChange(theme.id)}
                                                            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${appTheme === theme.id ? 'bg-blue-600 text-white shadow-lg' : appTheme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                                                        >
                                                            <i className={theme.icon}></i>
                                                            {theme.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Editor Preferences */}
                                <div className={`${colors.card} rounded-2xl border ${colors.border} overflow-hidden ${colors.borderHover} transition-colors shadow-sm h-fit`}>
                                    <div className={`p-6 border-b ${colors.border} flex items-center gap-3`}>
                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                            <i className="ri-code-s-slash-line text-xl"></i>
                                        </div>
                                        <div>
                                            <h3 className={`text-lg font-bold ${colors.text}`}>Editor</h3>
                                            <p className={`text-xs ${colors.secondaryText}`}>Coding environment preferences.</p>
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div className="flex items-center justify-between group">
                                            <div>
                                                <p className={`${colors.text} font-medium mb-1`}>Font Size</p>
                                                <p className={`text-xs ${colors.secondaryText}`}>Control the text size in the editor.</p>
                                            </div>
                                            <div className={`flex items-center ${colors.subCard} rounded-lg border ${colors.border} p-1`}>
                                                {['12', '14', '16', '18'].map(size => (
                                                    <button
                                                        key={size}
                                                        onClick={() => handleFontSizeChange(size)}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${editorFontSize === size ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : appTheme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                                                    >
                                                        {size}px
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between group">
                                            <div>
                                                <p className={`${colors.text} font-medium mb-1`}>Editor Theme</p>
                                                <p className={`text-xs ${colors.secondaryText}`}>Select your preferred code syntax theme.</p>
                                            </div>
                                            <div className={`flex items-center gap-2 ${colors.subCard} rounded-lg border ${colors.border} p-1`}>
                                                {[
                                                    { id: 'vs-dark', name: 'Dark', color: '#1e1e1e' },
                                                    { id: 'vs-light', name: 'Light', color: '#ffffff' },
                                                    { id: 'monokai', name: 'Monokai', color: '#272822' }
                                                ].map(theme => (
                                                    <button
                                                        key={theme.id}
                                                        onClick={() => handleThemeChange(theme.id)}
                                                        className={`w-8 h-8 rounded-md flex items-center justify-center transition-all border ${editorTheme === theme.id ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:opacity-80'} ${appTheme === 'dark' ? 'ring-offset-[#141414] border-transparent' : 'ring-offset-white border-gray-200'}`}
                                                        style={{ backgroundColor: theme.color }}
                                                        title={theme.name}
                                                    >
                                                        {editorTheme === theme.id && (
                                                            <i className={`ri-check-line text-lg ${theme.id === 'vs-light' ? 'text-black' : 'text-white'}`}></i>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>



                                        <div className="flex items-center justify-between group">
                                            <div>
                                                <p className={`${colors.text} font-medium mb-1`}>Word Wrap</p>
                                                <p className={`text-xs ${colors.secondaryText}`}>Toggle text wrapping for long lines.</p>
                                            </div>
                                            <button 
                                                onClick={() => handleWordWrapChange(!editorWordWrap)}
                                                className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${editorWordWrap ? 'bg-blue-600' : 'bg-[#333]'}`}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out shadow-sm ${editorWordWrap ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    </div>
                                
                                    </div>
                                </div>

                                {/* Security Settings */}
                                <div className="space-y-8">
                                    <div className={`${colors.card} rounded-2xl border ${colors.border} overflow-hidden ${colors.borderHover} transition-colors shadow-sm`}>
                                        <div className={`p-6 border-b ${colors.border} flex items-center gap-3`}>
                                            <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                                                <i className="ri-shield-keyhole-line text-xl"></i>
                                            </div>
                                            <div>
                                                <h3 className={`text-lg font-bold ${colors.text}`}>Security</h3>
                                                <p className={`text-xs ${colors.secondaryText}`}>Password and authentication.</p>
                                            </div>
                                        </div>
                                        <div className="p-6">
                                            <form onSubmit={handleChangePassword}>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className={`block text-xs font-medium ${colors.secondaryText} mb-1.5 uppercase tracking-wide`}>Current Password</label>
                                                        <input 
                                                            type="password" 
                                                            value={passwordData.current}
                                                            onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                                                            placeholder="••••••••"
                                                            className={`w-full ${colors.subCard} border ${colors.border} rounded-xl px-4 py-2.5 ${colors.text} text-sm focus:outline-none focus:border-blue-500 transition-all placeholder-gray-500`}
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={`block text-xs font-medium ${colors.secondaryText} mb-1.5 uppercase tracking-wide`}>New Password</label>
                                                        <input 
                                                            type="password" 
                                                            value={passwordData.new}
                                                            onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                                                            placeholder="••••••••"
                                                            className={`w-full ${colors.subCard} border ${colors.border} rounded-xl px-4 py-2.5 ${colors.text} text-sm focus:outline-none focus:border-blue-500 transition-all placeholder-gray-500`}
                                                            required
                                                            minLength={6}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                {passwordMessage && (
                                                    <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                                                        <i className="ri-checkbox-circle-fill text-green-500"></i>
                                                        <p className="text-green-500 text-xs font-medium">{passwordMessage}</p>
                                                    </div>
                                                )}
                                                {passwordError && (
                                                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                                                        <i className="ri-error-warning-fill text-red-500"></i>
                                                        <p className="text-red-500 text-xs font-medium">{passwordError}</p>
                                                    </div>
                                                )}

                                                <div className="mt-6 flex justify-end">
                                                    <button 
                                                        type="submit" 
                                                        disabled={loading}
                                                        className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                                    >
                                                        <i className={loading ? "ri-loader-4-line animate-spin" : "ri-save-line"}></i>
                                                        {loading ? 'Updating...' : 'Update Password'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>

                                    {/* Danger Zone */}
                                    <div className={`${colors.card} rounded-2xl border border-red-900/20 overflow-hidden hover:border-red-900/40 transition-colors shadow-sm`}>
                                        <div className="p-6 border-b border-red-900/10 bg-red-500/5 flex items-center gap-3">
                                            <div className="p-2 bg-red-500/10 rounded-lg text-red-500">
                                                <i className="ri-alarm-warning-line text-xl"></i>
                                            </div>
                                            <div>
                                                <h3 className={`text-lg font-bold ${colors.text}`}>Danger Zone</h3>
                                                <p className="text-xs text-red-400">Irreversible actions.</p>
                                            </div>
                                        </div>
                                        <div className="p-6 flex items-center justify-between">
                                            <div>
                                                <h4 className={`${colors.text} font-medium mb-1`}>Delete Account</h4>
                                                <p className={`text-xs ${colors.secondaryText}`}>Once deleted, your account is gone forever.</p>
                                            </div>
                                            <button 
                                                onClick={handleDeleteAccount}
                                                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-medium transition-all"
                                            >
                                                Delete Account
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Profile Section - Only show in Profile tab */}
                    {activeTab === 'profile' && (
                        <div className="max-w-4xl mx-auto">
                            <h2 className={`text-2xl font-bold ${colors.text} mb-2`}>My Profile</h2>
                            <p className={`${colors.secondaryText} text-sm mb-8`}>Manage your personal information.</p>
                            
                            <div className={`${colors.card} rounded-2xl border ${colors.border} overflow-hidden`}>
                                {/* Profile Header */}
                                <div className={`p-8 border-b ${colors.border} flex flex-col items-center`}>
                                    <div 
                                        className={`relative w-24 h-24 rounded-full overflow-hidden border-4 ${appTheme === 'dark' ? 'border-[#1A1A1A]' : 'border-gray-200'} shadow-xl group cursor-pointer mb-4`}
                                        onClick={() => fileInputRef.current.click()}
                                    >
                                        {user.profileImage ? (
                                            <img 
                                                src={user.profileImage.startsWith('http') ? user.profileImage : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${user.profileImage}`} 
                                                alt="Profile" 
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className={`w-full h-full ${colors.subCard} flex items-center justify-center text-3xl ${colors.secondaryText} font-bold`}>
                                                {(user?.username || user?.email)?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <i className="ri-camera-line text-white text-xl"></i>
                                        </div>
                                    </div>
                                    <h3 className={`text-xl font-bold ${colors.text}`}>{user?.username}</h3>
                                    <p className="text-sm text-gray-500">{user?.email}</p>
                                    
                                    {imageMessage && <p className="text-green-500 text-xs mt-2">{imageMessage}</p>}
                                    {imageError && <p className="text-red-500 text-xs mt-2">{imageError}</p>}
                                    
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                </div>

                                {/* Account Fields */}
                                <div className="p-8 space-y-8">
                                    <div>
                                        <label className={`block text-sm font-medium ${colors.secondaryText} mb-2`}>Username</label>
                                        <div className={`flex items-center justify-between p-4 ${colors.subCard} rounded-xl border ${colors.border}`}>
                                            <span className={colors.text}>@{user?.username || 'Not set'}</span>
                                            <button 
                                                onClick={() => setIsEditingUsername(!isEditingUsername)}
                                                className="text-blue-500 hover:text-blue-400 text-sm font-medium"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    </div>

                                    {isEditingUsername && (
                                        <form onSubmit={handleUpdateUsername} className={`${colors.subCard} p-6 rounded-xl border ${colors.border} animate-in fade-in slide-in-from-top-2`}>
                                            <h4 className={`${colors.text} font-medium mb-4`}>Update Username</h4>
                                            <div className="mb-4">
                                                <input 
                                                    type="text" 
                                                    value={newUsername}
                                                    onChange={(e) => setNewUsername(e.target.value)}
                                                    placeholder="New username"
                                                    className={`w-full ${colors.subCard} border ${colors.border} rounded-lg px-4 py-2 ${colors.text} text-sm focus:outline-none focus:border-blue-500 transition-all`}
                                                    autoFocus
                                                />
                                            </div>
                                            {userNameMessage && <p className="text-green-500 text-xs mb-3">{userNameMessage}</p>}
                                            {userNameError && <p className="text-red-500 text-xs mb-3">{userNameError}</p>}
                                            <div className="flex justify-end gap-3">
                                                <button 
                                                    type="button" 
                                                    onClick={() => setIsEditingUsername(false)}
                                                    className={`px-4 py-2 text-xs font-medium ${colors.secondaryText} ${appTheme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'} transition-colors`}
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    type="submit" 
                                                    disabled={loading}
                                                    className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
                                                >
                                                    {loading ? 'Saving...' : 'Save Changes'}
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    <div>
                                        <label className={`block text-sm font-medium ${colors.secondaryText} mb-2`}>Email</label>
                                        <div className={`p-4 ${colors.subCard} rounded-xl border ${colors.border}`}>
                                            <span className={colors.secondaryText}>{user?.email}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">Email address cannot be changed.</p>
                                    </div>
                                </div>

                            </div>


                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50 animate-in fade-in duration-300">
                    <div className="bg-[#1c1c1c]/90 backdrop-blur-2xl p-8 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl relative transform transition-all scale-100">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <i className="ri-close-line text-xl"></i>
                        </button>

                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white mb-6 border border-white/5">
                            <i className="ri-add-line text-2xl font-bold"></i>
                        </div>
                        
                        <h2 className="text-xl font-bold mb-2 text-white">Create New Project</h2>
                        <p className="text-gray-400 text-sm mb-8">Deploy a new environment for your team.</p>
                        <form onSubmit={createProject}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Project Name</label>
                                        <input
                                            type="text"
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all placeholder-gray-600"
                                            placeholder="e.g. AI Content Generator"
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Description (Optional)</label>
                                        <textarea
                                            value={projectDescription}
                                            onChange={(e) => setProjectDescription(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all placeholder-gray-600 resize-none h-24"
                                            placeholder="What is this project about?"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Tech Stack (comma separated)</label>
                                        <input
                                            type="text"
                                            value={projectTechStack}
                                            onChange={(e) => setProjectTechStack(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all placeholder-gray-600"
                                            placeholder="e.g. React, Node.js, Python"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-8">
                                <button type="submit" className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all">Create Project</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            


            {/* Delete Account Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-300">
                    <div className="bg-[#0f0f0f] border border-red-500/20 p-8 rounded-3xl w-full max-w-lg shadow-2xl shadow-red-900/30 relative transform transition-all scale-100 overflow-hidden min-h-[500px] flex flex-col">
                        
                        {/* Background Gradient Mesh */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                         <button 
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors z-10 bg-white/5 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10"
                        >
                            <i className="ri-close-line text-lg"></i>
                        </button>

                        {/* Step Indicator */}
                        <div className="flex items-center gap-2 mb-8 absolute top-8 left-8">
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${deleteStep >= 1 ? 'w-8 bg-red-500' : 'w-2 bg-gray-700'}`}></div>
                            <div className={`h-1.5 rounded-full transition-all duration-500 ${deleteStep >= 2 ? 'w-8 bg-red-500' : 'w-2 bg-gray-700'}`}></div>
                        </div>

                        <div className="mt-8 flex-grow flex flex-col">
                            {/* Step 1: Reason */}
                            {deleteStep === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                                    <div className="relative z-0">
                                        <h2 className="text-2xl font-bold text-white mb-2">Why are you leaving?</h2>
                                        <p className="text-gray-400 text-sm leading-relaxed">Help us improve by sharing your reason.</p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                            {[
                                                { id: 'no-longer-needed', label: 'I no longer need this account' },
                                                { id: 'found-alternative', label: 'I found a better alternative' },
                                                { id: 'technical-issues', label: 'Technical issues/Bugs' },
                                                { id: 'too-expensive', label: 'Too expensive' },
                                                { id: 'other', label: 'Other' }
                                            ].map(option => (
                                                <label key={option.id} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all group ${deleteReason === option.id ? 'bg-red-500/10 border-red-500/50' : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'}`}>
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${deleteReason === option.id ? 'border-red-500' : 'border-gray-600 group-hover:border-gray-500'}`}>
                                                        {deleteReason === option.id && <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>}
                                                    </div>
                                                    <input 
                                                        type="radio" 
                                                        name="deleteReason" 
                                                        value={option.id}
                                                        checked={deleteReason === option.id}
                                                        onChange={(e) => setDeleteReason(e.target.value)}
                                                        className="hidden"
                                                    />
                                                    <span className={`text-sm font-medium ${deleteReason === option.id ? 'text-red-400' : 'text-gray-300'}`}>{option.label}</span>
                                                </label>
                                            ))}
                                        </div>

                                        {deleteReason === 'other' && (
                                            <textarea
                                                value={customReason}
                                                onChange={(e) => setCustomReason(e.target.value)}
                                                placeholder="Please tell us more..."
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none h-24 animate-in fade-in slide-in-from-top-2"
                                            />
                                        )}
                                    </div>

                                    <button 
                                        onClick={() => setDeleteStep(2)}
                                        className="w-full py-3.5 bg-white text-black hover:bg-gray-200 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-auto"
                                    >
                                        Continue <i className="ri-arrow-right-line"></i>
                                    </button>
                                </div>
                            )}

                            {/* Step 2: Password */}
                            {deleteStep === 2 && (
                                <form onSubmit={confirmDeleteAccount} className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300 flex-grow flex flex-col">
                                    <div className="relative z-0">
                                         <button 
                                            type="button"
                                            onClick={() => setDeleteStep(1)}
                                            className="text-gray-500 hover:text-white mb-4 flex items-center gap-1 text-sm transition-colors"
                                        >
                                            <i className="ri-arrow-left-line"></i> Back
                                        </button>
                                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6 border border-red-500/20 shadow-lg shadow-red-500/10">
                                            <i className="ri-shield-keyhole-line text-3xl"></i>
                                        </div>
                                        <h2 className="text-2xl font-bold text-white mb-2">Security Verification</h2>
                                        <p className="text-gray-400 text-sm leading-relaxed">Enter your password to verify your identity and confirm deletion.</p>
                                    </div>

                                    <div className="pt-2">
                                        <div className="relative">
                                            <i className="ri-lock-password-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
                                            <input
                                                type="password"
                                                value={deletePassword}
                                                onChange={(e) => setDeletePassword(e.target.value)}
                                                className={`w-full bg-black/40 border rounded-xl pl-11 pr-4 py-3.5 text-white text-sm focus:outline-none transition-all ${deletePassword ? 'border-red-500/50 focus:border-red-500 bg-red-500/5' : 'border-white/10 focus:border-white/20'}`}
                                                placeholder="Password"
                                                required
                                                autoComplete="off"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {deleteError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-in shake">
                                            <i className="ri-error-warning-fill text-red-500 text-lg"></i>
                                            <p className="text-red-500 text-sm font-medium">{deleteError}</p>
                                        </div>
                                    )}

                                    <div className="mt-auto pt-4">
                                        <button 
                                            type="submit" 
                                            disabled={loading || !deletePassword}
                                            className={`w-full py-3.5 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                                                !deletePassword 
                                                    ? 'bg-white/5 text-gray-500 cursor-not-allowed shadow-none' 
                                                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20 active:scale-95'
                                            }`}
                                        >
                                            {loading ? (
                                                <><i className="ri-loader-4-line animate-spin"></i> Deleting...</>
                                            ) : (
                                                <><i className="ri-delete-bin-line"></i> Delete Account</>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Rename Modal */}
            {isRenameModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50 animate-in fade-in duration-300">
                    <div className="bg-[#1c1c1c]/90 backdrop-blur-2xl p-8 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl relative transform transition-all scale-100">
                        <button 
                            onClick={() => setIsRenameModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <i className="ri-close-line text-xl"></i>
                        </button>
                        
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white mb-6 border border-white/5">
                            <i className="ri-edit-line text-2xl font-bold"></i>
                        </div>

                        <h2 className="text-xl font-bold mb-2 text-white">Rename Project</h2>
                        <p className="text-gray-400 text-sm mb-6">Give your project a fresh new identity.</p>

                        <form onSubmit={handleRenameProject}>
                            <div className="mb-8">
                                <label className="block text-sm font-medium text-gray-400 mb-2">New Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setIsRenameModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-sm font-medium border border-white/5">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all text-sm font-medium">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Home