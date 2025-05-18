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

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
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