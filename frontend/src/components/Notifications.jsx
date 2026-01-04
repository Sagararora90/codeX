import React, { useState, useEffect, useContext } from 'react'
import axios from '../config/axios'
import { UserContext } from '../context/user.context'

const Notifications = () => {
    const [ invitations, setInvitations ] = useState([])
    const [ loading, setLoading ] = useState(true)
    const { user } = useContext(UserContext)

    const fetchInvitations = async () => {
        if (!user) {
            setLoading(false)
            return
        }
        try {
            const res = await axios.get('/users/invitations/get')
            setInvitations(res.data.invitations)
        } catch (err) {
            console.error('Error fetching invitations:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchInvitations()
    }, [ user ])

    const handleAction = async (invitationId, action) => {
        try {
            await axios.post('/users/invitations/accept', { invitationId, action })
            setInvitations(prev => prev.filter(inv => inv._id !== invitationId))
        } catch (err) {
            console.error(`Error ${action} invitation:`, err)
        }
    }

    if (loading) return null

    if (invitations.length === 0) return null

    return (
        <div className="fixed top-4 right-4 z-50 w-80 space-y-2">
            {invitations.map(invitation => (
                <div key={invitation._id} className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-2xl animate-in slide-in-from-right">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-white font-semibold text-sm">Project Invitation</h3>
                        <button onClick={() => setInvitations(prev => prev.filter(i => i._id !== invitation._id))} className="text-gray-500 hover:text-white">
                            <i className="ri-close-line"></i>
                        </button>
                    </div>
                    <p className="text-gray-400 text-xs mb-4">
                        <span className="text-blue-400">@{invitation.sender.username}</span> invited you to join <span className="text-white font-medium">{invitation.project.name}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleAction(invitation._id, 'accepted')}
                            className="flex-grow py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-medium transition-colors"
                        >
                            Accept
                        </button>
                        <button
                            onClick={() => handleAction(invitation._id, 'rejected')}
                            className="flex-grow py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded font-medium transition-colors"
                        >
                            Decline
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default Notifications
