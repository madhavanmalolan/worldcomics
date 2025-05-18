import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import contracts from '@/app/constants/contracts.json';
import { comics } from '@/app/constants/addresses.json';
import { getDatabase } from '@/app/lib/db';

export async function POST(request) {
  try {
    const { name, image, artisticStyle, txHash, comicId } = await request.json();

    if (!txHash) {
      console.log('No txHash in request body');
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

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

    // Create contract interface for decoding
    const comicsContract = new ethers.Contract(
      comics,
      contracts.comics.abi,
      provider
    );

    try {
      // Get the transaction details
      const tx = await provider.getTransaction(txHash);
      if (!tx) {
        console.log('Could not fetch transaction details');
        return NextResponse.json(
          { error: 'Could not fetch transaction details' },
          { status: 500 }
        );
      }

      console.log('\n=== Transaction Details ===');
      console.log('Transaction hash:', tx.hash);
      console.log('From:', tx.from);
      console.log('To:', tx.to);
      console.log('Data:', tx.data);
      console.log('Value:', tx.value.toString());

      console.log('\n=== All Events ===');
      let comicCreatedEvent = null;
      
      for (const log of receipt.logs) {
        console.log('\nEvent Log:');
        console.log('Address:', log.address);
        console.log('Topics:', log.topics);
        console.log('Data:', log.data);
        
        // Try to decode the event using the comics contract interface
        try {
          const decodedLog = comicsContract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          console.log('Decoded Event:', decodedLog);
          
          // Check if this is the ComicCreated event
          if (decodedLog.name === 'ComicCreated') {
            comicCreatedEvent = decodedLog;
          }
        } catch (e) {
          console.log('Could not decode with comics contract interface');
        }
      }

      if (!comicCreatedEvent) {
        console.log('No ComicCreated event found');
        return NextResponse.json(
          { error: 'No ComicCreated event found' },
          { status: 400 }
        );
      }

      // Verify the ComicCreated event parameters
      const [eventComicId, eventName, eventImage] = comicCreatedEvent.args;
      
      if (eventComicId !== BigInt(comicId)) {
        console.log('Comic ID does not match');
        return NextResponse.json(
          { error: 'Comic ID does not match' },
          { status: 400 }
        );
      }

      if (eventName !== name || eventImage !== image) {
        console.log('Name or image does not match');
        return NextResponse.json(
          { error: 'Name or image does not match' },
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

    const db = await getDatabase();
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