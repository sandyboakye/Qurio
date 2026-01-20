import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme] = useState('light');

    useEffect(() => {
        const root = window.document.documentElement;

        // Ensure clean slate
        root.classList.remove('dark');
        root.classList.add('light');
    }, []);

    // No-op functions to maintain API compatibility without functionality
    const toggleTheme = () => { };
    const setMode = () => { };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
