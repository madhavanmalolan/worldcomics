import { NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/db';

export async function GET(request, { params }) {
  try {
    const { comicId } = params;
    const db = await getDatabase();
    
    const comic = await db.collection('comics'+ process.env.DATABASE_VERSION).findOne({ comicId });
    
    if (!comic) {
      return NextResponse.json(
        { error: 'Comic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(comic);
  } catch (error) {
    console.error('Error fetching comic:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comic' },
      { status: 500 }
    );
  }
}
