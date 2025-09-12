import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'uploads', 'images');

const MIME_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
};

/**
 * Simple image serving by hash/filename
 * GET /api/images/[hash] - returns the stored image file
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    try {
        const { filename } = await params;

        if (!filename || typeof filename !== 'string') {
            return new NextResponse('Invalid filename', { status: 400 });
        }

        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-_]/g, '');
        if (sanitizedFilename !== filename) {
            return new NextResponse('Invalid filename format', { status: 400 });
        }

        const originalExt = path.extname(filename).toLowerCase();
        if (!MIME_TYPES[originalExt]) {
            return new NextResponse('Unsupported file type', { status: 400 });
        }

        const filePath = path.join(IMAGES_DIR, sanitizedFilename);

        try {
            await fs.access(filePath);
        } catch {
            return new NextResponse('Image not found', { status: 404 });
        }

        const buffer = await fs.readFile(filePath);
        const mimeType = MIME_TYPES[originalExt];
        const etag = `"${buffer.length}-${Date.now()}"`;

        const headers: Record<string, string> = {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Content-Length': buffer.length.toString(),
            'ETag': etag,
            'Accept-Ranges': 'bytes',
        };

        const ifNoneMatch = req.headers.get('if-none-match');
        if (ifNoneMatch === etag) {
            return new NextResponse(null, { status: 304, headers });
        }

        return new NextResponse(buffer, {
            status: 200,
            headers,
        });

    } catch (error) {
        console.error('Image serving error:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}