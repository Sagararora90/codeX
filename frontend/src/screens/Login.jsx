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

            navigate('/dashboard')
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
        <div className="min-h-screen bg-black text-white font-sans flex flex-col md:flex-row overflow-hidden">
            {/* Left Section - Content */}
            <div className="hidden md:flex flex-1 flex-col justify-center px-12 lg:px-24 bg-gradient-to-br from-black to-[#050505] relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-purple-600/5 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="relative z-10 animate-in fade-in slide-in-from-left-8 duration-1000">
                    <div className="mb-12">
                        <img src="/logo.png" alt="codeX" className="w-16 h-16 object-contain mix-blend-screen drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter mb-6 leading-[1.1]">
                        Welcome Back to <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">codeX</span>
                    </h1>
                    <p className="text-gray-400 text-lg lg:text-xl max-w-md leading-relaxed mb-10 font-medium opacity-80">
                        Continue your developer journey with our high-fidelity workspace. Sign in to access your projects and AI integrations.
                    </p>

                    <div className="flex flex-col gap-5">
                        <div className="flex items-center gap-4 group cursor-default">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 group-hover:scale-150 transition-transform"></div>
                            <span className="text-sm font-bold tracking-widest uppercase text-gray-500 group-hover:text-emerald-400 transition-colors">Secure Login</span>
                        </div>
                        <div className="flex items-center gap-4 group cursor-default">
                            <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:scale-150 transition-transform"></div>
                            <span className="text-sm font-bold tracking-widest uppercase text-gray-500 group-hover:text-blue-400 transition-colors">Fast Access</span>
                        </div>
                        <div className="flex items-center gap-4 group cursor-default">
                            <div className="w-2 h-2 rounded-full bg-purple-500 group-hover:scale-150 transition-transform"></div>
                            <span className="text-sm font-bold tracking-widest uppercase text-gray-500 group-hover:text-purple-400 transition-colors">Cloud Sync</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Section - Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
                {/* Mobile Logo */}
                <div className="md:hidden absolute top-8 left-8">
                    <img src="/logo.png" alt="codeX" className="w-10 h-10 object-contain mix-blend-screen" />
                </div>

                <div className="w-full max-w-md bg-[#0f0f0f] border border-white/5 p-10 rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-8 duration-1000 relative">
                    {/* Glowing effect behind card */}
                    <div className="absolute inset-0 bg-blue-500/5 blur-[80px] rounded-[2.5rem] pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome Back</h2>
                            <p className="text-gray-500 text-sm font-medium">Sign in to your codeX account</p>
                        </div>

                        <form onSubmit={submitHandler} className="space-y-6">
                            <div>
                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2.5 ml-1" htmlFor="email">
                                    Email or Username
                                </label>
                                <input
                                    onChange={handleInputChange(setEmail)}
                                    type="email"
                                    id="email"
                                    className="w-full bg-[#181818] border border-white/5 p-4 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-gray-700"
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2.5 ml-1" htmlFor="password">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        onChange={handleInputChange(setPassword)}
                                        type="password"
                                        id="password"
                                        className="w-full bg-[#181818] border border-white/5 p-4 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-gray-700"
                                        placeholder="Enter your password"
                                        required
                                    />
                                    <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                                        <i className="ri-eye-off-line"></i>
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-in shake duration-500">
                                    <div className="flex items-center gap-2">
                                        <i className="ri-error-warning-fill text-base"></i>
                                        <span>{error}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between px-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className="w-5 h-5 rounded-full border-2 border-white/10 flex items-center justify-center group-hover:border-blue-500/50 transition-all">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 opacity-0 transition-opacity"></div>
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-500 group-hover:text-gray-300 transition-colors">Remember me</span>
                                </label>
                                <a href="#" className="text-[11px] font-bold text-gray-500 hover:text-blue-400 transition-colors">Forgot password?</a>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 rounded-2xl bg-white text-black text-sm font-black hover:bg-gray-200 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_20px_40px_-10px_rgba(255,255,255,0.1)]"
                            >
                                Sign In
                            </button>
                        </form>

                        <div className="mt-10 text-center">
                            <p className="text-gray-600 text-[11px] font-bold">
                                Don't have an account? <Link to="/register" className="text-white hover:text-blue-400 transition-colors ml-1">Sign up</Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Branding */}
                <div className="mt-auto pt-10 text-center opacity-40">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">&copy; 2026 codeX. All rights reserved.</p>
                </div>
            </div>
        </div>
    )
}

export default Login