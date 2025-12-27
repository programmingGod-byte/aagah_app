import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut as googleSignOut, configureGoogleSignIn } from '../services/auth';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Configure Google Sign In on startup
        configureGoogleSignIn();

        // Check for persisted user
        const loadUser = async () => {
            try {
                const storedUser = await AsyncStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (e) {
                console.error('Failed to load user', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();
    }, []);

    const login = async (userData) => {
        setUser(userData);
        try {
            await AsyncStorage.setItem('user', JSON.stringify(userData));
        } catch (e) {
            console.error('Failed to save user', e);
        }
    };

    const logout = async () => {
        setUser(null);
        await googleSignOut(); // Sign out from Google if applicable
        try {
            await AsyncStorage.removeItem('user');
        } catch (e) {
            console.error('Failed to remove user', e);
        }
    };

    return (
        <UserContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
