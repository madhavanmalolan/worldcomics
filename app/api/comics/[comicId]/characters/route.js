import { getDatabase } from '@/app/lib/db';
import { NextResponse } from 'next/server';

// GET handler to fetch characters for a comic
export async function GET(request, { params }) {
  try {
    const { comicId } = params;
    const db = await getDatabase();
    
    const characters = await db.collection('characters')
      .find({ comicId })
      .toArray();

    return NextResponse.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch characters' },
      { status: 500 }
    );
  }
}

// POST handler to create a new character
export async function POST(request, { params }) {
  console.log('POST request received', params);
  try {
    const { comicId } = await params;
    const body = await request.json();
    const { name, imageUrl, description } = body;

    // Validate required fields
    if (!name || !imageUrl || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Create new character document
    const character = {
      comicId,
      name,
      description,
      imageUrl,
      createdAt: new Date(),
      // These fields will be populated after the transaction
      creator: body.creator,
      txHash: body.txHash
    };

    // Insert the character into the database
    const result = await db.collection('characters').insertOne(character);

    return NextResponse.json({
      ...character,
      _id: result.insertedId
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json(
      { error: 'Failed to create character' },
      { status: 500 }
    );
  }
} 