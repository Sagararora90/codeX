import React from 'react';
import { motion } from 'framer-motion';

const PageTransition = ({ children }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ 
                duration: 0.4, 
                ease: [0.23, 1, 0.32, 1] 
            }}
            className="w-full min-h-screen"
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
