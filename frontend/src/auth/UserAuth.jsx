import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '../context/user.context'
import axios from '../config/axios'

const UserAuth = ({ children }) => {

    const { user, setUser } = useContext(UserContext)
    const [ loading, setLoading ] = useState(true)
    const token = localStorage.getItem('token')
    const navigate = useNavigate()

    useEffect(() => {
        if (user) {
            setLoading(false)
        }

        if (!token) {
            navigate('/login')
        }

        if (!user) {
            navigate('/login')
        }

        // Verify token with backend to support manual DB deletions
        if (token) {
            axios.get('/users/profile')
                .then(res => {
                    setUser(res.data.user)
                    setLoading(false)
                })
                .catch(err => {
                    console.log("Token validation failed:", err)
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    setUser(null)
                    navigate('/login')
                })
        }

    }, [])

    if (loading) {
        return <div>Loading...</div>
    }


    return (
        <>
            {children}</>
    )
}

export default UserAuth