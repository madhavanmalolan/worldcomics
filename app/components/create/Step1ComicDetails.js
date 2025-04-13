'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, MINT_PRICE } from '@/app/constants/contract';

export default function Step1ComicDetails({ onNext, comicId, setComicId }) {
  const [comicName, setComicName] = useState('');
  const [overview, setOverview] = useState('');
  const [artisticStyle, setArtisticStyle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { writeContractAsync, data: hash } = useWriteContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS
  });

  const { data: receipt, isLoading: isTransactionPending } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // First, store comic details in the backend

      // Then create the comic on-chain
      const value = ethers.parseEther(MINT_PRICE);
      const tx = await writeContractAsync({
        abi: CONTRACT_ABI,
        address: CONTRACT_ADDRESS,
        functionName: 'createComic',
        args: [comicName, overview, artisticStyle],
        value,
      });
    } catch (error) {
      console.error('Error creating comic:', error);
      setError(error.message || 'Error creating comic. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle transaction receipt
  useEffect(() => {
    if (receipt) {
      // Extract comicId from the event logs
      const comicCreatedEvent = receipt.logs.find(log => 
        log.topics[0] === ethers.id('ComicCreated(uint256,address,string)')
      );
      
      if (comicCreatedEvent) {
        const newComicId = ethers.toNumber(comicCreatedEvent.topics[1]);
        setComicId(newComicId);
        fetch('/api/comics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: comicName,
            description: overview,
            artisticStyle: artisticStyle,
            comicId: newComicId,
          }),
        }).then(response => {
          if (!response.ok) {
            throw new Error('Failed to store comic details in backend');
          }
          onNext();
        });
      }
    }
  }, [receipt]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[#24292f]">Step 1: Comic Details</h2>
      
      {error && (
        <div className="p-4 bg-[#ffebe9] border border-[#ffa198] rounded-md">
          <p className="text-sm text-[#cf222e]">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="comicName" className="block text-sm font-medium text-[#24292f]">
            Comic Name
          </label>
          <input
            type="text"
            id="comicName"
            value={comicName}
            onChange={(e) => setComicName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-[#d0d7de] shadow-sm focus:border-[#0969da] focus:ring-[#0969da]"
            required
            pattern="[a-z0-9-]+"
          />
          <p className="mt-1 text-sm text-[#57606a]">
            This will be your comic's unique identifier. Use lowercase letters, numbers, and hyphens only.
          </p>
        </div>

        <div>
          <label htmlFor="overview" className="block text-sm font-medium text-[#24292f]">
            Short Overview
          </label>
          <textarea
            id="overview"
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-[#d0d7de] shadow-sm focus:border-[#0969da] focus:ring-[#0969da]"
            required
          />
        </div>

        <div>
          <label htmlFor="artisticStyle" className="block text-sm font-medium text-[#24292f]">
            Artistic Style
          </label>
          <input
            type="text"
            id="artisticStyle"
            value={artisticStyle}
            onChange={(e) => setArtisticStyle(e.target.value)}
            className="mt-1 block w-full rounded-md border border-[#d0d7de] shadow-sm focus:border-[#0969da] focus:ring-[#0969da]"
            placeholder="e.g., Manga, Superhero, Graphic Novel"
            required
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || isTransactionPending}
            className="px-4 py-2 bg-[#0969da] text-white rounded-md hover:bg-[#0a58ca] disabled:opacity-50"
          >
            {isLoading || isTransactionPending ? 'Creating...' : 'Create Comic'}
          </button>
        </div>
      </form>
    </div>
  );
} 