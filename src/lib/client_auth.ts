export interface UserData {
    id: string;
    name: string | null;
    role: string;
    isEmailVerified: boolean;
}

/**
 * Get user data from client-accessible cookie
 * @returns UserData object or null if not logged in
 */
export function getUserData(): UserData | null {
    if (typeof window === 'undefined') {
        return null; 
    }

    try {
        const cookies = document.cookie.split(';');
        const userDataCookie = cookies.find(cookie => 
            cookie.trim().startsWith('user_data=')
        );

        if (!userDataCookie) {
            return null;
        }

        const userDataValue = userDataCookie.split('=')[1];
        if (!userDataValue) {
            return null;
        }

        return JSON.parse(decodeURIComponent(userDataValue));
    } catch (error) {
        console.error('Error parsing user data cookie:', error);
        return null;
    }
}

/**
 * Check if user is logged in by verifying user_data cookie exists
 * @returns boolean indicating authentication status
 */
export function isAuthenticated(): boolean {
    return getUserData() !== null;
}

/**
 * Client-side logout function
 * Calls the logout API and reloads the page to clear state
 */
export async function logout(): Promise<void> {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
        });

        if (response.ok) {
            window.location.href = '/login'; // TODO: change to whatever the login page is going to be
        } else {
            console.error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login';
    }
}

/**
 * Check if user has a specific role
 * @param requiredRole The role to check for
 * @returns boolean indicating if user has the role
 */
export function hasRole(requiredRole: string): boolean {
    const userData = getUserData();
    return userData?.role === requiredRole;
}

/**
 * Make authenticated API requests with automatic cookie handling
 * @param url API endpoint URL
 * @param options Fetch options
 * @returns Promise<Response>
 */
export async function authenticatedFetch(
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

    const response = await fetch(url, defaultOptions);

    if (response.status === 401) {
        const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
        });

        if (refreshResponse.ok) {
            return fetch(url, defaultOptions);
        } else {
            window.location.href = '/login';
            throw new Error('Authentication expired');
        }
    }

    return response;
} 