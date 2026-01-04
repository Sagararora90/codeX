import React, { useContext, useState, useEffect } from 'react'
import { UserContext } from '../context/user.context'
import axios from "../config/axios"
import { useNavigate } from 'react-router-dom'
import { initializeSocket, receiveMessage } from '../config/socket'

const Home = () => {

    const { user, setUser } = useContext(UserContext)
    const [ isModalOpen, setIsModalOpen ] = useState(false)
    const [ projectName, setProjectName ] = useState(null)
    const [ project, setProject ] = useState([])
    const [ invitations, setInvitations ] = useState([])
    const [ showNotifications, setShowNotifications ] = useState(false)

    const navigate = useNavigate()

    function createProject(e) {
        e.preventDefault()
        console.log({ projectName })

        axios.post('/projects/create', {
            name: projectName,
        })
            .then((res) => {
                console.log(res)
                setIsModalOpen(false)
                // Real-time update: add new project to list instantly
                // Backend returns project object directly, not wrapped in { project: ... }
                setProject(prev => [...prev, res.data])
                setProjectName(null)
            })
            .catch((error) => {
                console.log(error)
            })
    }

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

    return (
        <main className='p-8 min-h-screen bg-slate-50'>
            
            <header className='flex justify-between items-center mb-8 p-6 bg-white rounded-xl shadow-sm border border-slate-200'>
                <div className='flex items-center gap-4'>
                    <div className='w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-blue-200 shadow-md'>
                        <i className="ri-user-line text-xl"></i>
                    </div>
                    <div>
                        <h1 className='font-bold text-xl text-slate-800'>Welcome, {user?.username || user?.email?.split('@')[0] || 'User'}</h1>
                        <p className='text-sm text-slate-500'>Manage your projects and collaborators</p>
                    </div>
                </div>
                <div className='flex gap-4 items-center'>
                    <div className="relative">
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className='w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-600 relative'
                            title="Notifications"
                        >
                            <i className="ri-notification-3-line text-lg"></i>
                            {invitations.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-50 shadow-sm font-bold">
                                    {invitations.length}
                                </span>
                            )}
                        </button>
                        
                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-slate-900/5">
                                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                    <h3 className="font-semibold text-sm text-slate-800">Notifications</h3>
                                    {invitations.length > 0 && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">{invitations.length} pending</span>}
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {invitations.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-sm italic">No new notifications</div>
                                    ) : (
                                        invitations.map(invitation => (
                                           <div key={invitation._id} className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                                                    <span className="font-semibold text-slate-900">@{invitation.sender?.username || 'User'}</span> invited you to <span className="font-semibold text-blue-600">{invitation.project?.name || 'Project'}</span>
                                                </p>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleAcceptInvitation(invitation, 'accepted')}
                                                        className="flex-1 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 font-semibold shadow-sm transition-colors"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAcceptInvitation(invitation, 'rejected')}
                                                        className="flex-1 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs rounded-md hover:bg-slate-50 font-semibold transition-colors"
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

                    <button onClick={() => navigate('/profile')} className='flex items-center gap-2 p-2 px-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-700 font-medium'>
                        <i className="ri-settings-3-line"></i> Profile
                    </button>
                    <button onClick={handleLogout} className='flex items-center gap-2 p-2 px-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all text-red-600 font-medium'>
                        <i className="ri-logout-box-line"></i> Logout
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="group p-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center gap-3 min-h-[160px] text-slate-500 hover:text-blue-600">
                    <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                        <i className="ri-add-line text-2xl"></i>
                    </div>
                    <span className="font-semibold">Creat New Project</span>
                </button>

                {
                    project.map((project) => (
                        <div key={project._id}
                            className="project bg-white p-6 border border-slate-200 rounded-xl shadow-sm hover:shadow-lg hover:border-blue-200 hover:-translate-y-1 transition-all cursor-pointer relative group flex flex-col justify-between min-h-[160px]"
                            onClick={() => {
                                navigate(`/project?id=${project._id}`, {
                                    state: { project }
                                })
                            }}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h2 className='font-bold text-lg text-slate-800 truncate pr-8'>{project.name}</h2>
                            </div>

                            <div className="flex gap-2 items-center text-sm text-slate-500 mt-auto">
                                <i className="ri-team-line text-blue-500"></i>
                                <p><span className="font-medium text-slate-700">{project.users.length}</span> <span className="text-xs">Collaborators</span></p>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent navigation
                                    if(confirm("Are you sure you want to delete this project?")) {
                                        axios.delete(`/projects/delete/${project._id}`)
                                            .then(res => {
                                                console.log(res);
                                                setProject(prev => prev.filter(p => p._id !== project._id));
                                            })
                                            .catch(err => console.error(err));
                                    }
                                }}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                title="Delete Project"
                            >
                                <i className="ri-delete-bin-line text-lg"></i>
                            </button>
                        </div>
                    ))
                }
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-50">
                    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-100 relative overflow-hidden">
                         {/* Decorative background circle */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full blur-2xl pointer-events-none"></div>

                        <h2 className="text-2xl font-bold mb-6 text-slate-800 relative z-10">Create New Project</h2>
                        <form onSubmit={createProject} className="relative z-10">
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-slate-600 mb-2">Project Name</label>
                                <input
                                    onChange={(e) => setProjectName(e.target.value)}
                                    value={projectName}
                                    type="text" 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" 
                                    placeholder="e.g. My Awesome App"
                                    autoFocus
                                    required 
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" className="px-5 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 hover:border-slate-400 font-medium transition-colors" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm shadow-blue-200 transition-colors">Create Project</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Home