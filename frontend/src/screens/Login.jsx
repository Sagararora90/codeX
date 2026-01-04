import React, { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from '../config/axios'
import { UserContext } from '../context/user.context'

const Login = () => {


    const [ email, setEmail ] = useState('')
    const [ password, setPassword ] = useState('')
    const [ error, setError ] = useState('')

    const { setUser } = useContext(UserContext)

    const navigate = useNavigate()

    function submitHandler(e) {

        e.preventDefault()
        setError('') // Clear any previous errors

        axios.post('/users/login', {
            email,
            password
        }).then((res) => {
            console.log(res.data)

            localStorage.setItem('token', res.data.token)
            localStorage.setItem('user', JSON.stringify(res.data.user))
            setUser(res.data.user)

            navigate('/')
        }).catch((err) => {
            console.log(err.response.data)
            const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Invalid credentials. Please try again.'
            setError(errorMessage)
        })
    }

    // Clear error when user starts typing
    const handleInputChange = (setter) => (e) => {
        setError('')
        setter(e.target.value)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md border border-slate-200">
                <h2 className="text-3xl font-bold text-slate-800 mb-6 text-center">Welcome Back</h2>
                <form
                    onSubmit={submitHandler}
                >
                    <div className="mb-4">
                        <label className="block text-slate-600 mb-2 font-medium" htmlFor="email">Email</label>
                        <input
                            onChange={handleInputChange(setEmail)}
                            type="email"
                            id="email"
                            className="w-full p-3 rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Enter your email"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-slate-600 mb-2 font-medium" htmlFor="password">Password</label>
                        <input
                            onChange={handleInputChange(setPassword)}
                            type="password"
                            id="password"
                            className="w-full p-3 rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Enter your password"
                            required
                        />
                    </div>
                    
                    {error && (
                        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 transition-all">
                            <span className="text-lg">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full p-3 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm"
                    >
                        Login
                    </button>
                </form>
                <p className="text-slate-500 mt-6 text-center text-sm">
                    Don't have an account? <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">Create one</Link>
                </p>
            </div>
        </div>
    )
}

export default Login