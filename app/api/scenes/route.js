import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import contracts from '@/app/constants/contracts.json';
import { scenes } from '@/app/constants/addresses.json';
import { getDatabase } from '@/app/lib/db';

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
    const providedArtisticStyle = body.artisticStyle;
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

    // Get database connection
    const db = await getDatabase();
    const scene = await db.collection('scenes'+process.env.DATABASE_VERSION).insertOne({
      txHash,
      name: providedName,
      image: providedImage,
      artisticStyle: providedArtisticStyle,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Scene inserted:', scene);
    return NextResponse.json({ scene });
  } catch (error) {
    console.error('Error processing scene:', error);
    return NextResponse.json(
      { error: 'Failed to process scene' },
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
    const scenes = await db.collection('scenes'+process.env.DATABASE_VERSION).find({
      name: { $regex: searchQuery || '', $options: 'i' }
    }).toArray();
    
    return NextResponse.json(scenes);
  } catch (error) {
    console.error('Error fetching scenes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scenes' },
      { status: 500 }
    );
  }
} 