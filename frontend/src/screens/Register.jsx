import React, { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserContext } from '../context/user.context'
import axios from '../config/axios'
import { motion } from 'framer-motion'

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.96 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { 
            type: "spring",
            damping: 25,
            stiffness: 120,
            mass: 0.8
        }
    }
}

const Register = () => {
    const [ email, setEmail ] = useState('')
    const [ username, setUsername ] = useState('')
    const [ fullname, setFullname ] = useState('')
    const [ password, setPassword ] = useState('')
    const [ error, setError ] = useState('')
    const [ showPassword, setShowPassword ] = useState(false)
    const [ rememberMe, setRememberMe ] = useState(false)

    // Focus states for hiding messages on blur
    const [ isUsernameFocused, setIsUsernameFocused ] = useState(false)
    const [ isPasswordFocused, setIsPasswordFocused ] = useState(false)
    
    // Validation states
    const [ usernameValidation, setUsernameValidation ] = useState({ valid: false, message: '' })
    const [ passwordStrength, setPasswordStrength ] = useState({ 
        score: 0, 
        message: '', 
        color: '',
        requirements: {
            length: false,
            uppercase: false,
            lowercase: false,
            number: false,
            special: false
        }
    })
    
    const { setUser } = useContext(UserContext)
    const navigate = useNavigate()

    // Username validation
    const validateUsername = (value) => {
        if (value.length === 0) {
            setUsernameValidation({ valid: false, message: '' })
        } else if (value.length < 3) {
            const msg = `Need ${3 - value.length} more character${3 - value.length > 1 ? 's' : ''}`
            setUsernameValidation({ 
                valid: false, 
                message: msg
            })
        } else if (value.length >= 3 && value.length < 6) {
            setUsernameValidation({ 
                valid: true, 
                message: 'Good! Consider adding more characters for uniqueness' 
            })
        } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
            setUsernameValidation({ 
                valid: false, 
                message: 'Only letters, numbers, and underscores allowed' 
            })
        } else {
            setUsernameValidation({ 
                valid: true, 
                message: 'Perfect! Username looks great ✓' 
            })
        }
    }

    // Password strength checker
    const checkPasswordStrength = (pwd) => {
        if (pwd.length === 0) {
            setPasswordStrength({ 
                score: 0, 
                message: '', 
                color: '',
                requirements: {
                    length: false,
                    uppercase: false,
                    lowercase: false,
                    number: false,
                    special: false
                }
            })
            return
        }

        const requirements = {
            length: pwd.length >= 8,
            uppercase: /[A-Z]/.test(pwd),
            lowercase: /[a-z]/.test(pwd),
            number: /[0-9]/.test(pwd),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
        }

        // Calculate score
        let score = 0
        if (requirements.length) score += 20
        if (requirements.uppercase) score += 20
        if (requirements.lowercase) score += 20
        if (requirements.number) score += 20
        if (requirements.special) score += 20

        // Determine strength
        let message = ''
        let color = ''
        
        if (score <= 20) {
            message = 'Weak'
            color = 'bg-red-500'
        } else if (score <= 40) {
            message = 'Fair'
            color = 'bg-orange-500'
        } else if (score <= 60) {
            message = 'Good'
            color = 'bg-yellow-500'
        } else if (score <= 80) {
            message = 'Strong'
            color = 'bg-emerald-500'
        } else {
            message = 'Excellent'
            color = 'bg-green-500'
        }

        setPasswordStrength({ score, message, color, requirements })
    }

    const submitHandler = (e) => {
        e.preventDefault()
        setError('')

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
            console.log(err.response?.data)
            const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Registration failed. Please try again.'
            setError(errorMessage)
        })
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
            {/* Navbar */}
            <motion.nav 
                initial={{ y: -80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="fixed z-50 top-0 left-0 w-full h-20 border-b border-white/20 bg-black/50 backdrop-blur-xl px-6 lg:px-24"
            >
                <div className="h-full flex items-center justify-between mx-auto max-w-7xl">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 transition-all duration-500 cursor-pointer group-hover:scale-110">
                            <img src="/logo.png" alt="codeX" className="w-full h-full object-contain mix-blend-screen" />
                        </div>
                    </Link>

                    <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center text-sm font-semibold transition-colors duration-500">
                        <Link to="/" className="relative group text-white/50 hover:text-white transition-all">
                            Home
                            <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-white transition-all duration-300 group-hover:w-full"></span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-8">
                        <Link to="/login" className="text-sm font-bold text-white hover:text-blue-500 transition-colors">Login</Link>
                        <Link to="/register" className="px-6 py-2.5 rounded-lg bg-white text-black text-sm font-bold hover:bg-gray-200 transition-all duration-300 hover:scale-105 active:scale-95">Sign Up</Link>
                    </div>
                </div>
            </motion.nav>

            <motion.div 
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="min-h-screen bg-[#0a0a0a] text-white font-sans flex flex-col pt-20 relative overflow-hidden"
            >
                <div className="flex-grow flex flex-col md:flex-row items-center justify-center px-6 lg:px-24 gap-12 lg:gap-20">
                    {/* Left Section - Branding */}
                    <motion.div 
                        variants={itemVariants}
                        className="flex-1 max-w-xl text-left"
                    >
                        <h1 className="text-5xl lg:text-6xl font-bold tracking-tighter mb-8 leading-[1.1]">
                            Join the Future of <br />
                            <span className="text-white">codeX</span>
                        </h1>
                        <p className="text-gray-400 text-base lg:text-lg leading-relaxed mb-10 opacity-70 font-medium max-w-md">
                            Start your creative journey with our powerful code generation tools. Create an account to access your workspace and build new projects.
                        </p>
                        <div className="flex items-center gap-8">
                            <div className="flex items-center gap-2 group cursor-default">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] group-hover:scale-125 transition-transform"></div>
                                <span className="text-[11px] font-bold tracking-widest uppercase text-gray-500 group-hover:text-gray-300 transition-colors">Secure Login</span>
                            </div>
                            <div className="flex items-center gap-2 group cursor-default">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] group-hover:scale-125 transition-transform"></div>
                                <span className="text-[11px] font-bold tracking-widest uppercase text-gray-500 group-hover:text-gray-300 transition-colors">Fast Access</span>
                            </div>
                            <div className="flex items-center gap-2 group cursor-default">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#a855f7] group-hover:scale-125 transition-transform"></div>
                                <span className="text-[11px] font-bold tracking-widest uppercase text-gray-500 group-hover:text-gray-300 transition-colors">Cloud Sync</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Section - Form Card */}
                    <motion.div 
                        variants={itemVariants}
                        className="w-full max-w-[440px] bg-white/[0.03] backdrop-blur-3xl border border-white/10 p-10 lg:p-12 rounded-3xl shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] relative"
                    >
                        <div className="text-center mb-10">
                            <h2 className="text-2xl font-bold tracking-tight mb-2">Create Account</h2>
                            <p className="text-gray-500 text-xs font-medium tracking-tight">Join codeX and start building</p>
                        </div>

                        <form onSubmit={submitHandler} className="space-y-5 text-left">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2.5 ml-1">Full Name</label>
                                    <input 
                                        value={fullname}
                                        onChange={(e) => setFullname(e.target.value)} 
                                        type="text" 
                                        autoComplete="off" 
                                        className="w-full bg-[#181818] border border-white/5 p-3.5 rounded-2xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/10 transition-all placeholder:text-gray-700" 
                                        placeholder="NAME" 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2.5 ml-1">Username</label>
                                    <div className="relative">
                                        <input 
                                            value={username}
                                            onChange={(e) => {
                                                setError('')
                                                setUsername(e.target.value)
                                                validateUsername(e.target.value)
                                            }}
                                            type="text" 
                                            autoComplete="off" 
                                            className={`w-full bg-[#181818] border ${username && (usernameValidation.valid ? 'border-emerald-500/50' : 'border-red-500/50')} ${!username && 'border-white/5'} p-3.5 rounded-2xl text-white text-xs focus:outline-none focus:ring-1 ${username && (usernameValidation.valid ? 'focus:ring-emerald-500/50' : 'focus:ring-red-500/50')} ${!username && 'focus:ring-white/10'} transition-all placeholder:text-gray-700`} 
                                            placeholder="USER" 
                                            required 
                                            onFocus={() => setIsUsernameFocused(true)}
                                            onBlur={() => setIsUsernameFocused(false)}
                                        />
                                        {isUsernameFocused && usernameValidation.message && (
                                            <div className="absolute left-0 top-full mt-2 w-full z-50">
                                                <div className="flex items-center gap-2 bg-[#181818] border border-white/10 px-3 py-2 rounded-xl shadow-xl">
                                                    <i className={`${usernameValidation.valid ? 'ri-checkbox-circle-fill text-emerald-400' : 'ri-close-circle-fill text-red-400'} text-xs`}></i>
                                                    <span className={`text-[9px] font-bold ${usernameValidation.valid ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                        {usernameValidation.message}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2.5 ml-1">Identity Gateway</label>
                                <input 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    type="email" 
                                    autoComplete="off" 
                                    className="w-full bg-[#181818] border border-white/5 p-3.5 rounded-2xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/10 transition-all placeholder:text-gray-700 font-medium" 
                                    placeholder="EMAIL@EXAMPLE.COM" 
                                    required 
                                />
                            </div>

                            <div className="relative">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2.5 ml-1">Access Key</label>
                                <div className="relative">
                                    <input 
                                        value={password}
                                        onChange={(e) => {
                                            setError('')
                                            setPassword(e.target.value)
                                            checkPasswordStrength(e.target.value)
                                        }}
                                        type={showPassword ? "text" : "password"} 
                                        autoComplete="new-password" 
                                        className="w-full bg-[#181818] border border-white/5 p-3.5 rounded-2xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/10 transition-all placeholder:text-gray-700" 
                                        placeholder="••••••••••••" 
                                        required 
                                        onFocus={() => setIsPasswordFocused(true)}
                                        onBlur={() => setIsPasswordFocused(false)}
                                    />
                                    <button onClick={() => setShowPassword(!showPassword)} type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                                        <i className={showPassword ? "ri-eye-off-line text-base" : "ri-eye-line text-base"}></i>
                                    </button>

                                    {isPasswordFocused && password && (
                                        <div className="absolute left-0 top-full mt-2 w-full z-50 bg-[#0f0f0f] border border-white/10 p-3 rounded-xl shadow-2xl">
                                            <div className="space-y-1">
                                                {/* Individual Requirements */}
                                                <div className="flex items-center gap-2">
                                                    <i className={`${passwordStrength.requirements?.length ? 'ri-checkbox-circle-fill text-emerald-400' : 'ri-close-circle-fill text-red-400'} text-xs`}></i>
                                                    <span className={`text-[9px] font-bold ${passwordStrength.requirements?.length ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                        At least 8 characters
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <i className={`${passwordStrength.requirements?.uppercase ? 'ri-checkbox-circle-fill text-emerald-400' : 'ri-close-circle-fill text-red-400'} text-xs`}></i>
                                                    <span className={`text-[9px] font-bold ${passwordStrength.requirements?.uppercase ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                        One uppercase letter (A-Z)
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <i className={`${passwordStrength.requirements?.lowercase ? 'ri-checkbox-circle-fill text-emerald-400' : 'ri-close-circle-fill text-red-400'} text-xs`}></i>
                                                    <span className={`text-[9px] font-bold ${passwordStrength.requirements?.lowercase ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                        One lowercase letter (a-z)
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <i className={`${passwordStrength.requirements?.number ? 'ri-checkbox-circle-fill text-emerald-400' : 'ri-close-circle-fill text-red-400'} text-xs`}></i>
                                                    <span className={`text-[9px] font-bold ${passwordStrength.requirements?.number ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                        One number (0-9)
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <i className={`${passwordStrength.requirements?.special ? 'ri-checkbox-circle-fill text-emerald-400' : 'ri-close-circle-fill text-red-400'} text-xs`}></i>
                                            <span className={`text-[9px] font-bold ${passwordStrength.requirements?.special ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                One special character (!@#$%...)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            </div>
                        </div>

                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                                <label className="flex items-center gap-2 text-gray-500 cursor-pointer group select-none">
                                    <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} className="hidden" />
                                    <div className={`w-3.5 h-3.5 rounded-full border border-gray-800 flex items-center justify-center transition-colors ${rememberMe ? 'bg-white border-white' : 'group-hover:border-gray-600'}`}>
                                        {rememberMe && <i className="ri-check-line text-[10px] text-black"></i>}
                                        {!rememberMe && <div className="w-1.5 h-1.5 rounded-full bg-white opacity-0 group-hover:opacity-5 transition-opacity"></div>}
                                    </div>
                                    Remember me
                                </label>
                                <button type="button" onClick={() => alert('Password recovery protocol initiated. Please check your secure terminal.')} className="text-gray-500 hover:text-white transition-colors">Recovery</button>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500 text-[10px] text-center font-black uppercase tracking-widest">
                                    {error}
                                </div>
                            )}

                            <button type="submit" className="w-full py-4 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-[0.3em] hover:bg-gray-200 transition-all active:scale-[0.98] mt-4 shadow-xl shadow-white/5">
                                Initialize
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">
                                Already provisioned? 
                                <Link to="/login" className="text-white hover:text-blue-400 transition-colors ml-2 border-b border-white/20 hover:border-blue-400">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Internal Footer */}
                <footer className="py-8 px-6 lg:px-24 flex items-center justify-between opacity-50 border-t border-white/20 mt-auto bg-[#0a0a0a]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-600">&copy; 2026 codeX. Global Protocol</div>
                    <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-gray-600">
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">System Guide</a>
                        <a href="#" className="hover:text-white transition-colors">Support</a>
                    </div>
                </footer>
            </motion.div>
        </div>
    )
}

export default Register