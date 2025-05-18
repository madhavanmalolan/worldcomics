import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import contracts from '@/app/constants/contracts.json';
import addresses from '@/app/constants/addresses.json';
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

    // Create contract interface for decoding
    const propsContract = new ethers.Contract(
      addresses.props,
      contracts.props.abi,
      provider
    );

    try {
      console.log('Transaction logs:', receipt.logs);
      
      // Find the log from the Props contract
      const propLog = receipt.logs.find(log => 
        log.address.toLowerCase() === addresses.props.toLowerCase()
      );

      if (!propLog) {
        console.log('No log found from Props contract');
        return NextResponse.json(
          { error: 'No log found from Props contract' },
          { status: 400 }
        );
      }

      // Decode the log data
      const decodedLog = propsContract.interface.parseLog({
        topics: propLog.topics,
        data: propLog.data
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
      const tokenURI = await propsContract.tokenURI(tokenId);
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
    const prop = await db.collection('props'+process.env.DATABASE_VERSION).insertOne({
      txHash,
      name: providedName,
      image: providedImage,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ prop });
  } catch (error) {
    console.error('Error processing prop:', error);
    return NextResponse.json(
      { error: 'Failed to process prop' },
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
    const props = await db.collection('props'+process.env.DATABASE_VERSION).find({
      name: { $regex: searchQuery || '', $options: 'i' }
    }).toArray();
    
    return NextResponse.json(props);
  } catch (error) {
    console.error('Error fetching props:', error);
    return NextResponse.json(
      { error: 'Failed to fetch props' },
      { status: 500 }
    );
  }
}
