'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, authFetch } from '@/lib/client_auth';

export function useFavorites() {
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState<Set<string>>(new Set());
    const { user, isAuthenticated } = useAuth();
    const router = useRouter();

    const loadFavorites = useCallback(async () => {
        if (!user) return;
        try {
            const response = await authFetch(`/api/users/${user.id}/favorites?pageSize=50`);
            if (response.ok) {
                const data = await response.json();
                const favoriteIds = new Set<string>(
                    data.data.favorites.map((fav: any) => fav.card.id as string)
                );
                setFavorites(favoriteIds);
            }
        } catch (error) {
            console.error('Failed to load favorites:', error);
        }
    }, [user]);

    useEffect(() => {
        if (isAuthenticated && user) {
            loadFavorites();
        } else {
            setFavorites(new Set());
        }
    }, [isAuthenticated, user, loadFavorites]);

    const toggleFavorite = useCallback(async (cardId: string) => {
        if (!isAuthenticated) {
            router.push('/auth/login');
            return;
        }

        if (!user || loading.has(cardId)) return;

        setLoading(prev => new Set(prev).add(cardId));

        try {
            const isFavorited = favorites.has(cardId);
            const method = isFavorited ? 'DELETE' : 'POST';

            const response = await authFetch(`/api/users/${user.id}/favorites`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardId }),
            });

            if (response.ok) {
                setFavorites(prev => {
                    const newSet = new Set(prev);
                    if (isFavorited) {
                        newSet.delete(cardId);
                    } else {
                        newSet.add(cardId);
                    }
                    return newSet;
                });
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        } finally {
            setLoading(prev => {
                const newSet = new Set(prev);
                newSet.delete(cardId);
                return newSet;
            });
        }
    }, [favorites, user, isAuthenticated, loading, router]);

    return {
        favorites,
        loading,
        isAuthenticated,
        toggleFavorite,
        isFavorited: (cardId: string) => favorites.has(cardId),
        isLoading: (cardId: string) => loading.has(cardId),
    };
}