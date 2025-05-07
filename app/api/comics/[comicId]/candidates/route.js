import { NextResponse } from 'next/server';
import { getDatabase } from '@/app/lib/db';
import { ethers } from 'ethers';
import contracts from '@/app/constants/contracts.json';
import { admin } from '@/app/constants/addresses.json';

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
      admin,
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

    // Get all candidates for this comic
    const candidates = await db.collection('candidates'+ process.env.DATABASE_VERSION)
      .find({ comicId: comicId })
      .sort({ createdAt: -1 })
      .toArray();
    console.log("All candidates:", candidates);

    const dayCandidates = [];
    const strips = [];
    for( let i = 0; i < currentDay; i++) {
      const dayCandidates = candidates.filter(candidate => candidate.day === i.toString());
      console.log("dayCandidates", dayCandidates);
      let maxVotes = 0; 
      let maxVotedCandidate = null;
      for( let j = 0; j < dayCandidates.length; j++) {
        const candidate = dayCandidates[j];
        console.log("candidate", candidate);
        // get votes for candidate
        const votes = await comicsContract.getVoteCount(candidate.stripId);
        if(votes >= maxVotes) {
          maxVotes = votes;
          maxVotedCandidate = candidate;
        }
      }
      console.log("maxVotedCandidate", maxVotedCandidate);
      strips.push(maxVotedCandidate);
    }

    // Filter candidates for current day
    const currentDayCandidates = candidates.filter(candidate => 
      candidate.imageUrls && 
      candidate.imageUrls.length > 0 && 
      candidate.day === currentDay.toString()
    );
    console.log("Filtered candidates:", currentDayCandidates);

    return NextResponse.json({
      candidates: currentDayCandidates,
      strips: strips
    });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidates' },
      { status: 500 }
    );
  }
} 