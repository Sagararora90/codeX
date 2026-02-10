import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from '../config/axios';
import { UserContext } from '../context/user.context';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

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
};

const fadeUp = {
    hidden: { opacity: 0, y: 60, scale: 0.98 },
    visible: { 
        opacity: 1, 
        y: 0,
        scale: 1,
        transition: { 
            duration: 1.2, 
            ease: [0.16, 1, 0.3, 1],
            delay: 0.4
        }
    }
};

const Landing = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setUser } = useContext(UserContext);

    const [isScrolled, setIsScrolled] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [activeFile, setActiveFile] = useState('index.js');
    const [activeView, setActiveView] = useState('landing'); // 'landing', 'login', 'register'

    // Auth Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [fullname, setFullname] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const hasAnimated = useRef(false);

    useEffect(() => {
        // Redirect to dashboard if logged in and trying to access auth pages
        const token = localStorage.getItem('token');
        if (token && (location.pathname === '/login' || location.pathname === '/register')) {
            navigate('/dashboard');
        }

        if (location.pathname === '/login') setActiveView('login');
        else if (location.pathname === '/register') setActiveView('register');
        else setActiveView('landing');
        
        // Reset scroll when switching views
        window.scrollTo(0, 0);
        setError('');
    }, [location.pathname]);

    const handleInputChange = (setter) => (e) => {
        setError('');
        setter(e.target.value);
    };

    const submitHandlerLogin = (e) => {
        e.preventDefault();
        setError('');
        axios.post('/users/login', { email, password }).then((res) => {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
            navigate('/dashboard');
        }).catch((err) => {
            setError(err.response?.data?.message || err.response?.data?.error || 'Invalid credentials');
        });
    };

    const submitHandlerRegister = (e) => {
        e.preventDefault();
        setError('');
        axios.post('/users/register', { email, username, fullname, password }).then((res) => {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
            navigate('/dashboard');
        }).catch((err) => {
            setError(err.response?.data?.message || err.response?.data?.error || 'Registration failed');
        });
    };

    const mockupFiles = {
        'index.js': {
            icon: 'ri-javascript-line',
            iconColor: 'text-yellow-500',
            content: [
                { line: 1, text: "import React from 'react';", color: 'text-purple-400' },
                { line: 2, text: "import { Infinity } from 'codex-ai';", color: 'text-purple-400' },
                { line: 3, text: "" },
                { line: 4, text: "const app = () => {", color: 'text-blue-400' },
                { line: 5, text: "  const [speed, setSpeed] = useState(Infinity);", color: 'text-blue-400' },
                { line: 6, text: "// AI Suggestion: Optimize render cycle", color: 'text-blue-300', highlight: true },
                { line: 7, text: "  return <Project />;", color: 'text-purple-400', highlight: true },
                { line: 8, text: "};", color: 'text-blue-400' },
            ]
        },
        'styles.css': {
            icon: 'ri-css3-line',
            iconColor: 'text-blue-400',
            content: [
                { line: 1, text: ".app {", color: 'text-yellow-400' },
                { line: 2, text: "  background: #000;", color: 'text-blue-300' },
                { line: 3, text: "  display: flex;", color: 'text-blue-300' },
                { line: 4, text: "  justify-content: center;", color: 'text-blue-300' },
                { line: 5, text: "  align-items: center;", color: 'text-blue-300' },
                { line: 6, text: "  min-height: 100vh;", color: 'text-blue-300' },
                { line: 7, text: "  backdrop-filter: blur(20px);", color: 'text-blue-300', highlight: true },
                { line: 8, text: "}", color: 'text-yellow-400' },
            ]
        },
        'package.json': {
            icon: 'ri-file-list-3-line',
            iconColor: 'text-gray-400',
            content: [
                { line: 1, text: "{", color: 'text-gray-400' },
                { line: 2, text: '  "name": "codex-project",', color: 'text-blue-300' },
                { line: 3, text: '  "version": "1.0.0",', color: 'text-blue-300' },
                { line: 4, text: '  "dependencies": {', color: 'text-gray-400' },
                { line: 5, text: '    "react": "^18.0.0",', color: 'text-green-400' },
                { line: 6, text: '    "codex-ai": "latest"', color: 'text-green-400', highlight: true },
                { line: 7, text: '  }', color: 'text-gray-400' },
                { line: 8, text: "}", color: 'text-gray-400' },
            ]
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (window.scrollY / totalHeight) * 100;
            setScrollProgress(progress);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const renderLandingContent = () => {
        const shouldAnimate = !hasAnimated.current;
        if (shouldAnimate) hasAnimated.current = true;
        
        return (
        <motion.div 
            initial={shouldAnimate ? "hidden" : false}
            animate="visible"
            variants={containerVariants}
            className="w-full"
        >
            {/* Hero Section */}
            <section className="relative pt-28 pb-20 px-6 overflow-hidden flex flex-col items-center text-center">
                <motion.div variants={itemVariants} className="mb-4">
                     <div className="w-32 h-32 flex items-center justify-center hover:scale-110 transition-transform duration-500 cursor-pointer">
                        <img src="/logo.png" alt="codeX" className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] mix-blend-screen" />
                    </div>
                </motion.div>

                <div className="max-w-4xl mx-auto relative z-10">
                    <motion.p variants={itemVariants} className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-12 font-medium leading-relaxed tracking-tight">
                        High-performance teams deserve tools that match their ambition.
                        <br className="hidden md:block" />
                        This is the intelligent code editor built to deliver.
                    </motion.p>

                    <motion.div 
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.5 } }
                        }}
                        whileHover={{ scale: 1.02, y: -10 }}
                        className="relative max-w-7xl mx-auto rounded-xl bg-[#e5e5e5] shadow-2xl cursor-pointer hover:shadow-[0_40px_80px_rgba(255,255,255,0.08)]"
                    >
                        <motion.div 
                            variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } }}
                            className="h-8 flex items-center justify-center relative border-b border-gray-300"
                        >
                            <div className="absolute left-4 flex gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
                            </div>
                            <span className="text-[11px] font-semibold text-gray-500 hidden sm:inline">codeX Editor - Active</span>
                        </motion.div>

                        <motion.div 
                            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
                            className="bg-[#1e1e1e] p-0 rounded-b-xl border-[6px] border-[#e5e5e5] flex flex-col overflow-hidden"
                        >
                            <motion.div 
                                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.2 } } }}
                                className="h-8 bg-[#252526] border-b border-[#1e1e1e] flex items-center px-3 justify-between"
                            >
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="flex items-center gap-2 text-xs font-medium text-white pb-1 border-b border-blue-500 mt-1">
                                        <i className="ri-file-code-line text-blue-400"></i>
                                        <span>index.js</span>
                                    </div>
                                    <div className="hidden md:flex items-center gap-2 text-xs font-medium text-gray-500">
                                        <i className="ri-file-list-3-line text-gray-400"></i>
                                        <span>package.json</span>
                                    </div>
                                    <div className="hidden md:flex items-center gap-2 text-xs font-medium text-gray-500">
                                        <i className="ri-css3-line text-orange-400"></i>
                                        <span>styles.css</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="px-3 py-1 rounded bg-[#0e639c] text-white text-[10px] font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/10">
                                        <i className="ri-play-fill text-xs"></i> Run
                                    </div>
                                    <div className="w-6 h-6 rounded flex items-center justify-center text-gray-400">
                                        <i className="ri-more-2-fill"></i>
                                    </div>
                                </div>
                            </motion.div>

                            <div className="flex flex-grow overflow-hidden">
                                <motion.div 
                                    variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}
                                    className="w-10 bg-[#252526] border-r border-[#1e1e1e] flex flex-col items-center py-4 gap-6 text-gray-500"
                                >
                                    <i className="ri-file-copy-2-line text-lg text-white"></i>
                                    <i className="ri-search-2-line text-lg"></i>
                                    <i className="ri-git-branch-line text-lg"></i>
                                    <i className="ri-chat-3-line text-lg"></i>
                                    <div className="mt-auto">
                                        <i className="ri-settings-3-line text-lg"></i>
                                    </div>
                                </motion.div>

                                <motion.div 
                                    variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { delay: 0.1 } } }}
                                    className="w-48 bg-[#1e1e1e] border-r border-[#333] hidden lg:flex flex-col p-3 text-left"
                                >
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Explorer</div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-xs text-blue-400 font-medium">
                                            <i className="ri-arrow-down-s-line"></i>
                                            <i className="ri-folder-open-fill"></i>
                                            <span>src</span>
                                        </div>
                                        <div className="pl-6 space-y-2 opacity-80">
                                            <div className="flex items-center gap-2 text-xs text-white">
                                                <i className="ri-javascript-line text-yellow-500"></i>
                                                <span>index.js</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <i className="ri-css3-line text-blue-400"></i>
                                                <span>styles.css</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                <motion.div 
                                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { delay: 0.2 } } }}
                                    className="flex-grow bg-[#1e1e1e] p-3 md:p-6 font-mono text-sm overflow-x-auto relative text-left"
                                >
                                    <div className="space-y-1.5 opacity-90 scale-95 origin-top-left">
                                        <div className="flex gap-4"><span className="text-gray-600 w-4">1</span> <span className="text-purple-400">import</span> React <span className="text-purple-400">from</span> <span className="text-green-400">'react'</span>;</div>
                                        <div className="flex gap-4"><span className="text-gray-600 w-4">2</span> <span className="text-purple-400">import</span> {'{ Infinity }'} <span className="text-purple-400">from</span> <span className="text-green-400">'codex-ai'</span>;</div>
                                        <div className="flex gap-4"><span className="text-gray-600 w-4">3</span> </div>
                                        <div className="flex gap-4"><span className="text-gray-600 w-4">4</span> <span className="text-blue-400">const</span> <span className="text-yellow-300">app</span> = () =&gt; {'{'}</div>
                                        <div className="flex gap-4"><span className="text-gray-600 w-4">5</span> &nbsp;&nbsp;<span className="text-blue-400">const</span> [speed, setSpeed] = <span className="text-blue-500">useState</span>(<span className="text-orange-300">Infinity</span>);</div>
                                        <div className="flex gap-4 text-blue-300 bg-blue-500/10 -mx-6 px-6 border-l-2 border-blue-500 animate-pulse">
                                            <span className="text-gray-600 w-4">6</span> &nbsp;&nbsp;<span className="text-blue-300 font-bold">// AI Suggestion: Optimize render cycle</span>
                                        </div>
                                        <div className="flex gap-4 text-blue-300 bg-blue-500/10 -mx-6 px-6 border-l-2 border-blue-500 animate-pulse">
                                            <span className="text-gray-600 w-4">7</span> &nbsp;&nbsp;<span className="text-purple-400">return</span> &lt;<span className="text-blue-400 font-bold">Project</span> /&gt;</div>
                                        <div className="flex gap-4"><span className="text-gray-600 w-4">8</span> {'}'};</div>
                                    </div>

                                    <div className="absolute bottom-4 left-2 right-2 md:left-6 md:right-6 h-20 bg-[#252526] rounded-lg border border-white/5 p-3 font-mono text-[10px] shadow-2xl overflow-hidden group/term hover:h-32 hover:bg-[#2d2d2d] hover:border-white/10 transition-all duration-500 ease-out cursor-pointer">
                                         <div className="flex items-center gap-4 text-gray-500 mb-2 border-b border-white/5 pb-1">
                                            <span className="text-white border-b border-white">Terminal</span>
                                            <span className="group-hover/term:text-gray-300 transition-colors">Console</span>
                                         </div>
                                         <div className="flex flex-col group-hover/term:translate-x-1 transition-transform duration-500">
                                             <div className="text-green-400 flex items-center gap-2">
                                                <span className="text-blue-400">❯</span> npm run dev
                                                <span className="w-1.5 h-3 bg-blue-400 animate-pulse opacity-0 group-hover/term:opacity-100 transition-opacity"></span>
                                             </div>
                                             <div className="text-gray-400 mt-1 flex items-center gap-2">
                                                 Build successful. Server running at port 3000.
                                                 <span className="text-[8px] px-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded opacity-0 group-hover/term:opacity-100 transition-opacity delay-100">READY</span>
                                             </div>
                                         </div>
                                    </div>
                                </motion.div>

                                <motion.div 
                                    variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0, transition: { delay: 0.3 } } }}
                                    className="w-64 bg-[#1e1e1e] border-l border-[#333] hidden lg:flex flex-col group/chat cursor-pointer transition-all duration-500 hover:bg-[#252526]"
                                >
                                    <div className="p-3 border-b border-[#333] flex items-center justify-between bg-[#252526] group-hover/chat:bg-[#2d2d2d] transition-colors">
                                        <span className="text-[11px] font-bold text-gray-400">codeX Chat</span>
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40 group-hover/chat:bg-blue-500 animate-pulse"></div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40 group-hover/chat:bg-blue-500 animate-pulse delay-150"></div>
                                        </div>
                                    </div>
                                    <div className="flex-grow p-4 space-y-4 overflow-hidden relative">
                                        <div className="bg-[#2d2d2d] rounded-lg p-3 text-[10px] text-gray-200 ml-4 border border-white/5 shadow-lg group-hover/chat:bg-[#333] transition-colors">
                                            How do I implement a real-time web socket in this project?
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center p-0.5">
                                                <img src="/logo.png" alt="AI" className="w-full h-full object-contain mix-blend-screen" />
                                            </div>
                                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-[10px] text-blue-200 mr-4 transition-all duration-300 group-hover/chat:shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                                                I can help with that. First, initialize the socket in your project root...
                                            </div>
                                        </div>
                                        
                                        {/* Typing Welcome Message */}
                                        <div className="flex gap-4 opacity-0 group-hover/chat:opacity-100 transition-opacity duration-500 delay-300 translate-y-2 group-hover/chat:translate-y-0">
                                            <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center p-0.5">
                                                <img src="/logo.png" alt="AI" className="w-full h-full object-contain mix-blend-screen" />
                                            </div>
                                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-[10px] text-blue-200 mr-4 flex items-center gap-1">
                                                Welcome to codeX! Ready to build?
                                                <span className="w-1 h-3 bg-blue-400 animate-pulse"></span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-[#252526] border-t border-[#333]">
                                        <div className="bg-[#3c3c3c] rounded p-2 text-[10px] text-gray-500 flex items-center justify-between group/input overflow-hidden min-h-[32px]">
                                            <div className="relative flex-grow">
                                                <span className="absolute inset-0 transition-opacity duration-300 group-hover/chat:opacity-0">Ask anything...</span>
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover/chat:opacity-100 transition-opacity duration-300 delay-500 text-gray-300">
                                                    <span className="overflow-hidden whitespace-nowrap animate-[typing_1.5s_steps(20)_infinite] inline-block">how to implement socket.io...</span>
                                                    <span className="w-1.5 h-3 bg-blue-500 animate-pulse"></span>
                                                </div>
                                            </div>
                                            <i className="ri-send-plane-fill text-gray-600 group-hover/chat:text-blue-500 transition-colors"></i>
                                        </div>
                                    </div>
                                    <style>{`
                                        @keyframes typing {
                                            from { width: 0 }
                                            to { width: 100% }
                                        }
                                    `}</style>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="mt-16">
                         <motion.div
                            whileHover={{ scale: 1.05, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            className="inline-block"
                         >
                            <Link to="/register" className="inline-block px-10 py-2 rounded-full bg-white text-black text-lg font-semibold shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-shadow duration-300 hover:shadow-[0_0_60px_rgba(255,255,255,0.25)]">
                                Get Started Free 
                            </Link>
                         </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="pt-12 pb-32 px-6 bg-black">
                <div className="max-w-7xl mx-auto">
                    <motion.div variants={itemVariants} className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Why Choose codeX?</h2>
                        <p className="text-gray-400 text-xl font-light">Everything you need to ship production code.</p>
                    </motion.div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { icon: 'ri-flashlight-line', title: 'Lightning Fast', desc: 'Instant startup times with optimized cloud containers.' },
                            { icon: 'ri-robot-2-line', title: 'AI Driven', desc: 'Built-in LLMs that understand your codebase context.' },
                            { icon: 'ri-lock-2-line', title: 'Enterprise Secure', desc: 'Bank-grade encryption for all your intellectual property.' },
                            { icon: 'ri-global-line', title: 'Available 24/7', desc: 'Access your environment from any device, anytime.' }
                        ].map((feature, i) => (
                            <motion.div 
                                key={i} 
                                variants={itemVariants}
                                whileHover={{ y: -10, scale: 1.05 }}
                                className="group p-8 rounded-2xl bg-[#0a0a0a] border border-white/5 hover:border-white/20 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] relative overflow-hidden hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10 text-left">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center text-xl mb-4" style={{ perspective: '100px' }}>
                                        <i className={`${feature.icon} spin-on-hover`} style={{ transformStyle: 'preserve-3d' }}></i>
                                    </div>
                                    <h3 className="text-xl font-bold mb-4 text-white uppercase tracking-wider text-sm">{feature.title}</h3>
                                    <p className="text-gray-500 text-[12px] leading-relaxed transition-colors">{feature.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </motion.div>
    );
    };

    const renderAuthView = () => {
        const isLogin = activeView === 'login';
        return (
            <motion.div 
                key={activeView}
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
                            {isLogin ? "Welcome Back to" : "Join the Future of"} <br />
                            <span className="text-white">codeX</span>
                        </h1>
                        <p className="text-gray-400 text-base lg:text-lg leading-relaxed mb-10 opacity-70 font-medium max-w-md">
                            {isLogin 
                                ? "Continue your creative journey with our powerful code generation tools. Sign in to access your library and create new stories."
                                : "Start your creative journey with our powerful code generation tools. Create an account to access your workspace and build new projects."}
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
                            <h2 className="text-2xl font-bold tracking-tight mb-2">{isLogin ? "Welcome Back" : "Create Account"}</h2>
                            <p className="text-gray-500 text-xs font-medium tracking-tight">{isLogin ? "Sign in to your codeX account" : "Join codeX and start building"}</p>
                        </div>

                        <form onSubmit={isLogin ? submitHandlerLogin : submitHandlerRegister} className="space-y-5 text-left">
                            {!isLogin && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2.5 ml-1">Full Name</label>
                                        <input onChange={handleInputChange(setFullname)} type="text" autoComplete="off" className="w-full bg-[#181818] border border-white/5 p-3.5 rounded-2xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/10 transition-all placeholder:text-gray-700" placeholder="NAME" required />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2.5 ml-1">Username</label>
                                        <input onChange={handleInputChange(setUsername)} type="text" autoComplete="off" className="w-full bg-[#181818] border border-white/5 p-3.5 rounded-2xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/10 transition-all placeholder:text-gray-700" placeholder="USER" required />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2.5 ml-1">Identity Gateway</label>
                                <input onChange={handleInputChange(setEmail)} type="text" autoComplete="off" className="w-full bg-[#181818] border border-white/5 p-3.5 rounded-2xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/10 transition-all placeholder:text-gray-700 font-medium" placeholder="EMAIL OR USERNAME" required />
                            </div>

                            <div className="relative">
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2.5 ml-1">Access Key</label>
                                <input onChange={handleInputChange(setPassword)} type={showPassword ? "text" : "password"} autoComplete="new-password" className="w-full bg-[#181818] border border-white/5 p-3.5 rounded-2xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-white/10 transition-all placeholder:text-gray-700" placeholder="••••••••••••" required />
                                <button onClick={() => setShowPassword(!showPassword)} type="button" className="absolute right-4 bottom-3.5 text-gray-600 hover:text-white transition-colors">
                                    <i className={showPassword ? "ri-eye-off-line text-base" : "ri-eye-line text-base"}></i>
                                </button>
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
                                {isLogin ? "Authenticate" : "Initialize"}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">
                                {isLogin ? "New to the system?" : "Already provisioned?"} 
                                <Link to={isLogin ? "/register" : "/login"} className="text-white hover:text-blue-400 transition-colors ml-2 border-b border-white/20 hover:border-blue-400">
                                    {isLogin ? "Join now" : "Sign in"}
                                </Link>
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Internal Footer for Login */}
                <footer className="py-8 px-6 lg:px-24 flex items-center justify-between opacity-50 border-t border-white/20 mt-auto bg-[#0a0a0a]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-600">&copy; 2026 codeX. Global Protocol</div>
                    <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-gray-600">
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">System Guide</a>
                        <a href="#" className="hover:text-white transition-colors">Support</a>
                    </div>
                </footer>
            </motion.div>
        );
    };


    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
            {/* Unified Navbar */}
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

            {activeView === 'landing' ? renderLandingContent() : renderAuthView()}

            {activeView === 'landing' && (
                <footer className="py-12 px-6 border-t border-white/20 bg-black">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 opacity-60">
                        <div className="text-sm text-gray-500">&copy; 2026 codeX. All rights reserved.</div>
                        <div className="flex items-center gap-8 text-sm text-gray-500">
                            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                            <a href="#" className="hover:text-white transition-colors">Twitter</a>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
};

export default Landing;
