import { NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/db';

export async function POST(request) {
  try {
    const db = await getDatabase();
    const { name, image, artisticStyle, txHash, comicId } = await request.json();

    //TODO tx is valid?

    const comic = await db.collection('comics'+ process.env.DATABASE_VERSION).insertOne({
      comicId,
      name,
      image,
      artisticStyle,
      txHash,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ 
      comicId: comic.comicId,
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
    const comics = await db.collection('comics'+ process.env.DATABASE_VERSION)
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