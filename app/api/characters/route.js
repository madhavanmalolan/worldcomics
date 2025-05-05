import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import contracts from '@/app/constants/contracts.json';
import { characters } from '@/app/constants/addresses.json';
import { getDatabase } from '@/app/lib/db';

// Define Character Schema
const characterSchema = {
  name: String,
  image: String,
  txHash: String,
  createdAt: { type: Date, default: Date.now }
};

export async function POST(request) {
  try {
    console.log('Request received');
    const body = await request.json();
    console.log('Request body:', body);

    if (!body.txHash) {
      console.log('No txHash in request body');
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    const txHash = body.txHash;
    const providedName = body.name;
    const providedImage = body.image;
    console.log('Processing transaction hash:', txHash);

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    await new Promise(resolve => setTimeout(resolve, 3000));
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    console.log('Transaction receipt:', receipt);
    if (!receipt) {
      console.log('Transaction not found');
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    if (!receipt.status) {
      console.log('Transaction failed');
      return NextResponse.json(
        { error: 'Transaction failed' },
        { status: 400 }
      );
    }

    
    
    // Verify it's a Characters contract transaction
    // TODO



    // Get database connection
    const db = await getDatabase();
    const character = await db.collection('characters'+ process.env.DATABASE_VERSION).insertOne({
      txHash,
      name: providedName,
      image: providedImage,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ character });
  } catch (error) {
    console.error('Error processing character:', error);
    return NextResponse.json(
      { error: 'Failed to process character' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');

    // Get database connection
    const db = await getDatabase();
    const characters = await db.collection('characters'+ process.env.DATABASE_VERSION).find({
        name: { $regex: searchQuery || '', $options: 'i' }
    }).toArray();
    
    return NextResponse.json(characters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch characters' },
      { status: 500 }
    );
  }
}


