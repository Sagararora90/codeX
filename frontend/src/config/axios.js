import axios from 'axios';


const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
})

axiosInstance.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add a response interceptor to handle 401 Unauthorized errors globally
axiosInstance.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            const originalRequest = error.config;
            
            // Don't redirect if we're already on the login page or trying to login/register
            const isAuthRoute = originalRequest.url.includes('/users/login') || 
                                originalRequest.url.includes('/users/register');
                                
            if (!isAuthRoute) {
                console.warn("Session expired or unauthorized. Redirecting to login...");
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // Use window.location instead of navigate since we're outside a component
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);


export default axiosInstance;