import { NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/db';

export async function POST(request, { params }) {
  try {
    const { comicId } = await params;
    console.log('comicId', comicId);
    const db = await getDatabase();
    const { coverImage } = await request.json();

    // First, verify the comic exists
    const comic = await db.collection('comics').findOne({ comicId: comicId });
    if (!comic) {
      return NextResponse.json(
        { error: 'Comic not found' },
        { status: 404 }
      );
    }

    // Update the cover image
    const result = await db.collection('comics').updateOne(
      { comicId: comicId },
      {
        $set: {
          coverImage,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Failed to update cover image');
    }

    return NextResponse.json({ 
      message: 'Cover image updated successfully' 
    });
  } catch (error) {
    console.error('Error updating cover image:', error);
    return NextResponse.json(
      { error: 'Failed to update cover image' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { comicId } = params;
    const db = await getDatabase();

    const comic = await db.collection('comics').findOne(
      { comicId: comicId },
      { projection: { coverImage: 1 } }
    );

    if (!comic) {
      return NextResponse.json(
        { error: 'Comic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ coverImage: comic.coverImage });
  } catch (error) {
    console.error('Error fetching cover image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cover image' },
      { status: 500 }
    );
  }
} 