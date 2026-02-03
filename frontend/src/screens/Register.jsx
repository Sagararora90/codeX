import React, { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserContext } from '../context/user.context'
import axios from '../config/axios'

const Register = () => {

    const [ fullname, setFullname ] = useState('')

    function submitHandler(e) {

        e.preventDefault()
        setError('') // Clear any previous errors

        axios.post('/users/register', {
            email,
            username,
            fullname,
            password
        }).then((res) => {
            console.log(res.data)
            localStorage.setItem('token', res.data.token)
            localStorage.setItem('user', JSON.stringify(res.data.user))
            setUser(res.data.user)
            navigate('/dashboard')
        }).catch((err) => {
            console.log(err.response.data)
            const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Registration failed. Please try again.'
            setError(errorMessage)
        })
    }

    // Clear error when user starts typing
    const handleInputChange = (setter) => (e) => {
        setError('')
        setter(e.target.value)
    }


    return (
        <div className="min-h-screen bg-black text-white font-sans flex flex-col md:flex-row overflow-hidden">
            {/* Left Section - Content */}
            <div className="hidden md:flex flex-1 flex-col justify-center px-12 lg:px-24 bg-gradient-to-br from-black to-[#050505] relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>
                
                <div className="relative z-10 animate-in fade-in slide-in-from-left-8 duration-1000">
                    <div className="mb-12">
                        <img src="/logo.png" alt="codeX" className="w-16 h-16 object-contain mix-blend-screen drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter mb-6 leading-[1.1]">
                        Start Your Journey with <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">codeX</span>
                    </h1>
                    <p className="text-gray-400 text-lg lg:text-xl max-w-md leading-relaxed mb-10 font-medium opacity-80">
                        Join thousands of developers who are already using codeX to ship production-ready code faster with AI.
                    </p>

                    <div className="grid grid-cols-2 gap-y-5 gap-x-8">
                        <div className="flex items-center gap-4 group cursor-default">
                            <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:scale-150 transition-transform"></div>
                            <span className="text-[11px] font-bold tracking-widest uppercase text-gray-500 group-hover:text-blue-400 transition-colors">Free to Start</span>
                        </div>
                        <div className="flex items-center gap-4 group cursor-default">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 group-hover:scale-150 transition-transform"></div>
                            <span className="text-[11px] font-bold tracking-widest uppercase text-gray-500 group-hover:text-emerald-400 transition-colors">Enterprise Grade</span>
                        </div>
                        <div className="flex items-center gap-4 group cursor-default">
                            <div className="w-2 h-2 rounded-full bg-purple-500 group-hover:scale-150 transition-transform"></div>
                            <span className="text-[11px] font-bold tracking-widest uppercase text-gray-500 group-hover:text-purple-400 transition-colors">AI Powered</span>
                        </div>
                        <div className="flex items-center gap-4 group cursor-default">
                            <div className="w-2 h-2 rounded-full bg-cyan-500 group-hover:scale-150 transition-transform"></div>
                            <span className="text-[11px] font-bold tracking-widest uppercase text-gray-500 group-hover:text-cyan-400 transition-colors">Cloud First</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Section - Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative">
                <div className="w-full max-w-2xl bg-[#0f0f0f] border border-white/5 p-10 lg:p-12 rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-8 duration-1000 relative">
                    <div className="absolute inset-0 bg-blue-500/5 blur-[80px] rounded-[3rem] pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-bold tracking-tight mb-2">Create Account</h2>
                            <p className="text-gray-500 text-sm font-medium">Join codeX and start building amazing apps</p>
                        </div>

                        <form onSubmit={submitHandler} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2.5 ml-1" htmlFor="fullname">
                                        Full Name
                                    </label>
                                    <input
                                        onChange={handleInputChange(setFullname)}
                                        type="text"
                                        id="fullname"
                                        className="w-full bg-[#181818] border border-white/5 p-4 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-700"
                                        placeholder="Your full name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2.5 ml-1" htmlFor="username">
                                        Username
                                    </label>
                                    <input
                                        onChange={handleInputChange(setUsername)}
                                        type="text"
                                        id="username"
                                        className="w-full bg-[#181818] border border-white/5 p-4 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-700"
                                        placeholder="Choose a username"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2.5 ml-1" htmlFor="email">
                                        Email
                                    </label>
                                    <input
                                        onChange={handleInputChange(setEmail)}
                                        type="email"
                                        id="email"
                                        className="w-full bg-[#181818] border border-white/5 p-4 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-700"
                                        placeholder="your@email.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2.5 ml-1">
                                        Date of Birth
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full bg-[#181818] border border-white/5 p-4 rounded-2xl text-white text-sm focus:outline-none transition-all placeholder:text-gray-700 cursor-not-allowed"
                                            placeholder="dd-mm-yyyy"
                                            disabled
                                        />
                                        <i className="ri-calendar-line absolute right-4 top-1/2 -translate-y-1/2 text-gray-600"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2.5 ml-1" htmlFor="password">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            onChange={handleInputChange(setPassword)}
                                            type="password"
                                            id="password"
                                            className="w-full bg-[#181818] border border-white/5 p-4 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-700"
                                            placeholder="Create a password"
                                            required
                                        />
                                        <i className="ri-eye-off-line absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 cursor-pointer"></i>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2.5 ml-1">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            className="w-full bg-[#181818] border border-white/5 p-4 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-700"
                                            placeholder="Confirm password"
                                            required
                                        />
                                        <i className="ri-eye-off-line absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 cursor-pointer"></i>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-2">
                                    <i className="ri-error-warning-fill text-base"></i>
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="flex items-center gap-3 px-1">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="w-5 h-5 rounded-full border-2 border-white/10 flex items-center justify-center group-hover:border-blue-500/50 transition-all">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 opacity-0 transition-opacity"></div>
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-500 group-hover:text-gray-300 transition-colors">I agree to the <a href="#" className="underline text-gray-400">Privacy Policy</a></span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 rounded-2xl bg-white text-black text-sm font-black hover:bg-gray-200 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-[0_20px_40px_-10px_rgba(255,255,255,0.1)] mt-4"
                            >
                                Create Account
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-gray-600 text-[11px] font-bold">
                                Already have an account? <Link to="/login" className="text-white hover:text-blue-400 transition-colors ml-1">Sign in</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Register