import { NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/db';
import { ethers } from 'ethers';
import contracts from '@/app/constants/contracts.json';
import addresses from '@/app/constants/addresses.json';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const imageUrls = formData.getAll('imageUrls');
    const elements = JSON.parse(formData.get('elements'));
    const stripId = formData.get('stripId');
    const comicId = formData.get('comicId');
    const txHash = formData.get('txHash');

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    if (!txHash) {
      return NextResponse.json({ error: 'Transaction hash is required' }, { status: 400 });
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

    // Check if transaction is within last 24 minutes
    const tx = await provider.getTransaction(txHash);
 
    // Get Comics contract address from Admin
    const adminContract = new ethers.Contract(
      addresses.admin,
      contracts.admin.abi,
      provider
    );
    const comicsAddress = await adminContract.getComicsAddress();

    // Create contract interface for decoding
    const comicsContract = new ethers.Contract(
      comicsAddress,
      contracts.comics.abi,
      provider
    );

    try {
      console.log('\n=== Transaction Details ===');
      console.log('Transaction hash:', tx.hash);
      console.log('From:', tx.from);
      console.log('To:', tx.to);
      console.log('Data:', tx.data);
      console.log('Value:', tx.value.toString());

      console.log('\n=== All Events ===');
      let stripCreatedEvent = null;
      
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
          
          // Check if this is the StripCreated event
          if (decodedLog.name === 'StripCreated') {
            stripCreatedEvent = decodedLog;
          }
        } catch (e) {
          console.log('Could not decode with comics contract interface');
        }
      }

      if (!stripCreatedEvent) {
        console.log('No StripCreated event found');
        return NextResponse.json(
          { error: 'No StripCreated event found' },
          { status: 400 }
        );
      }

      // Verify the StripCreated event parameters
      // StripCreated(uint256 stripId, uint256 comicId, address creator, uint256 day)
      const [eventStripId, eventComicId, eventCreator, eventDay] = stripCreatedEvent.args;
      
      if (eventStripId !== BigInt(stripId)) {
        console.log('Strip ID does not match');
        return NextResponse.json(
          { error: 'Strip ID does not match' },
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

    // Save candidate to database
    const candidate = {
      comicId: formData.get('comicId'),
      stripId: formData.get('stripId'),
      day: formData.get('day'),
      imageUrls: imageUrls,
      elements,
      createdAt: new Date(),
      status: 'pending'
    };

    console.log("candidate", candidate);

    await db.collection('candidates'+ process.env.DATABASE_VERSION).insertOne(candidate);

    return NextResponse.json(candidate);
  } catch (error) {
    console.error('Error saving candidate:', error);
    return NextResponse.json(
      { error: 'Failed to save candidate' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { comicId } = params;
    const db = await getDatabase();
    console.log("comicId", comicId);

    // Get provider from environment
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    
    // Get Comics contract address from Admin
    const adminContract = new ethers.Contract(
      addresses.admin,
      contracts.admin.abi,
      provider
    );
    const comicsAddress = await adminContract.getComicsAddress();

    // Get current day from Comics contract
    const comicsContract = new ethers.Contract(
      comicsAddress,
      contracts.comics.abi,
      provider
    );
    const currentDay = await comicsContract.getCurrentDay(comicId);
    console.log("comicId", comicId, "currentDay", currentDay.toString());

    // Get vote threshold for current day
    const voteThreshold = await comicsContract.getVoteThreshold(currentDay);

    // Get all candidates for this comic
    const candidates = await db.collection('candidates'+ process.env.DATABASE_VERSION)
      .find({ comicId: comicId })
      .sort({ createdAt: -1 })
      .toArray();
    console.log("All candidates:", candidates);

    // Filter candidates for current day
    const currentDayCandidates = candidates.filter(candidate => 
      candidate.imageUrls && 
      candidate.imageUrls.length > 0 && 
      candidate.day === currentDay.toString()
    );
    console.log("Filtered candidates:", currentDayCandidates);

    // Get vote counts for current day candidates
    const candidatesWithVotes = await Promise.all(
      currentDayCandidates.map(async (candidate) => {
        const voteCount = await comicsContract.getVoteCount(candidate.stripId);
        return {
          ...candidate,
          voteCount: voteCount.toString(),
          voteThreshold: voteThreshold.toString(),
        };
      })
    );

    // Get winning strips for previous days from database
    const winningStrips = await Promise.all(
      Array.from({ length: Number(currentDay) }, (_, i) => i).map(async (day) => {
        // Get all candidates for this day
        const dayCandidates = candidates.filter(candidate => 
          candidate.imageUrls && 
          candidate.imageUrls.length > 0 && 
          candidate.day === day.toString()
        );

        if (dayCandidates.length > 0) {
          // Get vote counts for all candidates of this day
          const candidatesWithVotes = await Promise.all(
            dayCandidates.map(async (candidate) => {
              const voteCount = await comicsContract.getVoteCount(candidate.stripId);
              return {
                ...candidate,
                voteCount: voteCount.toString(),
              };
            })
          );

          // Find the candidate with highest votes
          const winningCandidate = candidatesWithVotes.reduce((prev, current) => 
            Number(current.voteCount) > Number(prev.voteCount) ? current : prev
          );

          return {
            stripId: winningCandidate.stripId,
            day,
            imageUrls: winningCandidate.imageUrls,
            voteCount: winningCandidate.voteCount,
            createdAt: winningCandidate.createdAt,
          };
        }
        return null;
      })
    );

    return NextResponse.json({
      candidates: candidatesWithVotes,
      strips: winningStrips.filter(Boolean),
    });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidates' },
      { status: 500 }
    );
  }
} 