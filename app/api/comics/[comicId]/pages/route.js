import { NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/db';

export async function GET(request, { params }) {
  try {
    const { comicId } = params;
    const db = await getDatabase();
    
    const pages = await db.collection('pages')
      .find({ comicId })
      .sort({ pageNumber: 1 })
      .toArray();

    return NextResponse.json(pages);
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { comicId } = await params;
    const { imageUrl, pageNumber, elements } = await request.json();

    const db = await getDatabase();
    
    const page = {
      comicId,
      imageUrl,
      pageNumber,
      elements: elements || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('pages').insertOne(page);

    return NextResponse.json({
      ...page,
      _id: result.insertedId
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating page:', error);
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    );
  }
} 