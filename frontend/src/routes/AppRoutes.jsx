import React from 'react'
import { Route, BrowserRouter, Routes, useLocation } from 'react-router-dom'
import Login from '../screens/Login'
import Register from '../screens/Register'
import Home from '../screens/Home'
import Project from '../screens/Project'

import UserAuth from '../auth/UserAuth'
import Landing from '../screens/Landing'

import PageTransition from '../components/PageTransition'

const AnimatedRoutes = () => {
    const location = useLocation();
    
    return (
        <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
            <Route path="/login" element={<PageTransition><Landing /></PageTransition>} />
            <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
            <Route path="/dashboard" element={<UserAuth><PageTransition><Home /></PageTransition></UserAuth>} />
            <Route path="/project" element={<UserAuth><PageTransition><Project /></PageTransition></UserAuth>} />
        </Routes>
    );
};

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <AnimatedRoutes />
        </BrowserRouter>
    )
}

export default AppRoutes