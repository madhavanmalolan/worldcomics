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
    
    // Wait for transaction to be confirmed
    let receipt;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between attempts
      attempts++;
    }

    if (!receipt) {
      console.log('Transaction not found or not confirmed');
      return NextResponse.json(
        { error: 'Transaction not found or not confirmed' },
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

    // Get the transaction details
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      console.log('Could not fetch transaction details');
      return NextResponse.json(
        { error: 'Could not fetch transaction details' },
        { status: 500 }
      );
    }

    // Create contract interface for decoding
    const charactersContract = new ethers.Contract(
      characters,
      contracts.characters.abi,
      provider
    );

    try {
      console.log('Transaction logs:', receipt.logs);
      
      // Find the log from the Characters contract
      const characterLog = receipt.logs.find(log => 
        log.address.toLowerCase() === characters.toLowerCase()
      );

      if (!characterLog) {
        console.log('No log found from Characters contract');
        return NextResponse.json(
          { error: 'No log found from Characters contract' },
          { status: 400 }
        );
      }

      // Decode the log data
      const decodedLog = charactersContract.interface.parseLog({
        topics: characterLog.topics,
        data: characterLog.data
      });

      console.log('Decoded log:', decodedLog);

      if (!decodedLog) {
        console.log('Could not decode log data');
        return NextResponse.json(
          { error: 'Invalid log data' },
          { status: 400 }
        );
      }

      // Verify it's a MetadataUpdate event
      if (decodedLog.name !== 'MetadataUpdate') {
        console.log('Not a MetadataUpdate event');
        return NextResponse.json(
          { error: 'Invalid event type' },
          { status: 400 }
        );
      }

      // Get the token ID from the event
      const tokenId = decodedLog.args[0];
      console.log('Token ID:', tokenId);

      // Get the token URI to verify the metadata
      const tokenURI = await charactersContract.tokenURI(tokenId);
      console.log('Token URI:', tokenURI);

      // The token URI should be a base64 encoded JSON string
      const metadata = JSON.parse(Buffer.from(tokenURI.split(',')[1], 'base64').toString());
      console.log('Decoded metadata:', metadata);

      // Verify the metadata matches
      if (metadata.name !== providedName || metadata.image !== providedImage) {
        console.log('Metadata does not match provided data');
        return NextResponse.json(
          { error: 'Metadata does not match provided data' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error decoding transaction:', error);
      return NextResponse.json(
        { error: 'Invalid transaction data' },
        { status: 400 }
      );
    }

    // Get database connection
    const db = await getDatabase();
    const character = await db.collection('characters'+ process.env.DATABASE_VERSION).insertOne({
      txHash,
      name: providedName,
      image: providedImage,
      creatorAddress: body.creatorAddress,
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


