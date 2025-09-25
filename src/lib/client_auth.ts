'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    profileImageUrl?: string;
}

export interface AuthState {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;
}

/**
 * Simple auth hook for frontend teams new to React/Next.js
 * Handles all auth complexity behind the scenes
 */
export function useAuth(): AuthState & {
    login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
} {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        getCurrentUser();
    }, []);

    const getCurrentUser = async () => {
        try {
            const response = await authFetch('/api/users/me', {
                method: 'GET',
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.data);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Failed to get current user:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            setLoading(true);

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include',
            });

            const data = await response.json();

            if (data.success) {
                // Get user data after successful login
                await getCurrentUser();
                return { success: true, message: 'Login successful' };
            } else {
                return { success: false, message: data.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Network error occurred' };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            router.push('/auth/login');
        }
    };

    const refreshUser = async () => {
        await getCurrentUser();
    };

    return {
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
    };
}

/**
 * Higher-order component that requires authentication
 * Automatically redirects to login if not authenticated
 */
export function withAuthRequired<P extends object>(
    Component: React.ComponentType<P>,
    redirectTo: string = '/login'
) {
    return function AuthRequired(props: P) {
        const { user, loading } = useAuth();
        const router = useRouter();
        const pathname = usePathname();

        useEffect(() => {
            if (!loading && !user) {
                const returnUrl = pathname !== '/login' ? pathname : '/';
                router.push(`${redirectTo}?returnUrl=${encodeURIComponent(returnUrl)}`);
            }
        }, [user, loading, router, pathname]);

        if (loading) {
            return React.createElement('div', {
                className: 'flex items-center justify-center min-h-screen'
            }, React.createElement('div', {
                className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'
            }));
        }
        if (!user) {
            return null;
        }

        return React.createElement(Component, props);
    };
}

/**
 * Higher-order component that requires specific role
 */
export function withRoleRequired<P extends object>(
    Component: React.ComponentType<P>,
    requiredRole: string,
    fallbackComponent?: React.ComponentType
) {
    return function RoleRequired(props: P) {
        const { user, loading } = useAuth();

        if (loading) {
            return React.createElement('div', {
                className: 'flex items-center justify-center min-h-screen'
            }, React.createElement('div', {
                className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'
            }));
        }

        if (!user || (user.role !== requiredRole && user.role !== 'ADMIN')) {
            if (fallbackComponent) {
                const FallbackComponent = fallbackComponent;
                return React.createElement(FallbackComponent, props);
            }

            return React.createElement('div', {
                className: 'flex items-center justify-center min-h-screen'
            }, React.createElement('div', {
                className: 'text-center'
            }, [
                React.createElement('h2', {
                    key: 'title',
                    className: 'text-2xl font-bold text-gray-900 mb-2'
                }, 'Access Denied'),
                React.createElement('p', {
                    key: 'message',
                    className: 'text-gray-600'
                }, 'You don\'t have permission to access this page.')
            ]));
        }

        return React.createElement(Component, props);
    };
}

/**
 * Simple authenticated fetch wrapper
 * Automatically handles 401s and token refresh
 */
export async function authFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const defaultOptions: RequestInit = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    let response = await fetch(url, defaultOptions);

    if (response.status === 401) {
        const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
        });

        if (refreshResponse.ok) {
            response = await fetch(url, defaultOptions);
        }
    }

    return response;
}

/**
 * Hook for API calls with automatic auth handling
 */
export function useAuthFetch() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async <T>(
        url: string,
        options: RequestInit = {}
    ): Promise<T | null> => {
        try {
            setLoading(true);
            setError(null);

            const response = await authFetch(url, options);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.data || data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { fetchData, loading, error };
}