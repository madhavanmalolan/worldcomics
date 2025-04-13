import { NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/db';

export async function POST(request) {
  try {
    const db = await getDatabase();
    const { title, description, artisticStyle } = await request.json();

    const comic = await db.collection('comics').insertOne({
      title,
      description,
      artisticStyle,
      characters: [],
      coverImage: '',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ 
      comicId: comic.insertedId.toString(),
      message: 'Comic created successfully' 
    });
  } catch (error) {
    console.error('Error creating comic:', error);
    return NextResponse.json(
      { error: 'Failed to create comic' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const db = await getDatabase();
    const comics = await db.collection('comics')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(comics);
  } catch (error) {
    console.error('Error fetching comics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comics' },
      { status: 500 }
    );
  }
} 