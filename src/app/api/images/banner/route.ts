import { NextRequest, NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';

export async function GET() {
    try {
        const bannerPath = path.join(process.cwd(), 'public', 'images', 'banners');
        
        try {
            const files = await readdir(bannerPath);
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
            
            const images = files
                .filter(file => imageExtensions.some(ext => 
                    file.toLowerCase().endsWith(ext)
                ))
                .map(file => `/images/banners/${file}`)
                .sort();

            return NextResponse.json({
                success: true,
                data: {
                    images,
                    count: images.length
                }
            });
        } catch (dirError) {
            return NextResponse.json({
                success: true,
                data: {
                    images: [],
                    count: 0
                }
            });
        }
    } catch (error) {
        console.error('Banner images API error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to load banner images'
            },
            { status: 500 }
        );
    }
}
