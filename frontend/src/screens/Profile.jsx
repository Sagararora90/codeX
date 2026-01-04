import React, { useContext, useState, useEffect } from 'react'
import { UserContext } from '../context/user.context'
import axios from '../config/axios'
import { useNavigate } from 'react-router-dom'

const Profile = () => {
    const { user, setUser } = useContext(UserContext)
    const [ newUsername, setNewUsername ] = useState('')
    
    // Separate state for Username Update
    const [ userNameMessage, setUserNameMessage ] = useState(null)
    const [ userNameError, setUserNameError ] = useState(null)
    const [ isEditingUsername, setIsEditingUsername ] = useState(false)
    
    // Separate state for Image Upload
    const [ imageMessage, setImageMessage ] = useState(null)
    const [ imageError, setImageError ] = useState(null)
    
    const [ loading, setLoading ] = useState(false)
    const navigate = useNavigate()
    const fileInputRef = React.useRef(null)

    const handleUpdateUsername = async (e) => {
        e.preventDefault()
        setLoading(true)
        setUserNameMessage(null)
        setUserNameError(null)
        try {
            const res = await axios.put('/users/update-username', { username: newUsername })
            setUser(res.data.user)
            localStorage.setItem('user', JSON.stringify(res.data.user))
            localStorage.setItem('token', res.data.token)
            setUserNameMessage(res.data.message)
            setNewUsername('')
            setTimeout(() => {
                setIsEditingUsername(false)
                setUserNameMessage(null)
            }, 2000)
        } catch (err) {
            setUserNameError(err.response?.data?.error || 'Failed to update username')
        } finally {
            setLoading(false)
        }
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        const formData = new FormData()
        formData.append('image', file)

        setLoading(true)
        setImageMessage(null)
        setImageError(null)

        try {
            const res = await axios.post('/users/upload-image', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            setUser(res.data.user)
            localStorage.setItem('user', JSON.stringify(res.data.user))
            setImageMessage('Profile image updated successfully')
        } catch (err) {
            setImageError(err.response?.data?.error || 'Failed to upload image')
        } finally {
            setLoading(false)
        }
    }

    const CooldownDisplay = () => {
        if (!user.lastUsernameChange) return null
        const lastChange = new Date(user.lastUsernameChange)
        const now = new Date()
        const daysDiff = (now - lastChange) / (1000 * 60 * 60 * 24)
        if (daysDiff >= 30) return null

        return (
            <p className="text-sm text-yellow-600 mt-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                Last changed on {lastChange.toLocaleDateString()}. You can change it again in {Math.ceil(30 - daysDiff)} days.
            </p>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="max-w-2xl mx-auto">
                <button 
                    onClick={() => navigate('/')} 
                    className="mb-6 flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-md shadow-sm border border-slate-200"
                >
                    <i className="ri-arrow-left-line"></i> Back to Home
                </button>

                <div className="bg-white p-8 rounded-lg shadow-xl border border-slate-200">
                    <h1 className="text-3xl font-bold mb-8 flex items-center gap-3 text-slate-800">
                        <i className="ri-user-settings-line text-blue-600"></i> User Profile
                    </h1>

                    <div className="flex flex-col items-center mb-8">
                        <div 
                            className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-md group cursor-pointer"
                            onClick={() => fileInputRef.current.click()}
                        >
                            {user.profileImage ? (
                                <img 
                                    src={user.profileImage.startsWith('http') ? user.profileImage : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${user.profileImage}`} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-4xl text-slate-400 font-bold">
                                    {(user?.username || user?.email)?.[0]?.toUpperCase() || 'U'}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <i className="ri-camera-line text-white text-2xl"></i>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 mt-2">Click to change profile photo</p>
                        
                        {/* Image Upload Status Messages */}
                        {imageMessage && <p className="text-green-600 text-sm mt-2 font-medium">{imageMessage}</p>}
                        {imageError && <p className="text-red-600 text-sm mt-2 font-medium">{imageError}</p>}

                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                    </div>

                    <div className="space-y-6">
                        <div className="divide-y divide-slate-100">
                             <div className="p-4 bg-slate-50 rounded-md border border-slate-200 mb-4">
                                <p className="text-slate-500 text-sm uppercase tracking-wider mb-1 font-semibold">Email Address</p>
                                <p className="text-xl font-medium text-slate-800">{user?.email}</p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-md border border-slate-200 flex justify-between items-center">
                                <div>
                                    <p className="text-slate-500 text-sm uppercase tracking-wider mb-1 font-semibold">Current Username</p>
                                    <p className="text-xl font-medium text-slate-800">@{user?.username || user?.email?.split('@')[0] || 'Not set'}</p>
                                </div>
                                <button 
                                    onClick={() => setIsEditingUsername(!isEditingUsername)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    title="Edit Username"
                                >
                                    <i className="ri-pencil-line text-xl"></i>
                                </button>
                            </div>
                        </div>

                        {isEditingUsername && (
                            <div className="pt-8 border-t border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                                <header className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-semibold text-slate-800">Edit Username</h2>
                                    <button onClick={() => setIsEditingUsername(false)} className="text-slate-400 hover:text-slate-600">
                                        <i className="ri-close-line text-xl"></i>
                                    </button>
                                </header>
                                <form onSubmit={handleUpdateUsername} className="space-y-4">
                                    <div>
                                        <input
                                            type="text"
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value)}
                                            placeholder="Enter new username"
                                            className="w-full p-3 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 transition-all placeholder:text-slate-400"
                                            required
                                        />
                                        <CooldownDisplay />
                                    </div>
                                    
                                    {userNameMessage && <p className="text-green-600 bg-green-50 p-3 rounded text-sm border border-green-200">{userNameMessage}</p>}
                                    {userNameError && <p className="text-red-600 bg-red-50 p-3 rounded text-sm border border-red-200">{userNameError}</p>}

                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className={`px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-all shadow-md active:scale-95 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {loading ? 'Updating...' : 'Save Changes'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingUsername(false)}
                                            className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-md font-semibold hover:bg-slate-50 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Profile
