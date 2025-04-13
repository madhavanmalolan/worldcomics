'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/app/constants/contract';
import ImageGenerator from '../ImageGenerator';

export default function Step3CoverImage({ onNext, comicId, title, description }) {
  const [coverImage, setCoverImage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { writeContractAsync, data: hash } = useWriteContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS
  });

  const { data: receipt, isLoading: isTransactionPending } = useWaitForTransactionReceipt({
    hash,
  });

  const handleImageSelected = (imageUrl) => {
    setCoverImage(imageUrl);
  };

  const handleAddCoverImage = async () => {
    if (!coverImage) {
      setError('Please generate a cover image');
      return;
    }

    try {
      setIsLoading(true);
      setError('');


      // Create cover image on-chain
      const tx = await writeContractAsync({
        abi: CONTRACT_ABI,
        address: CONTRACT_ADDRESS,
        functionName: 'createCoverImage',
        args: [
          comicId,
          coverImage
        ],
      });
      // First, store cover image in the backend
      const response = await fetch(`/api/comics/${comicId}/cover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coverImage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to store cover image in backend');
      }

      // Proceed to next step
      onNext(coverImage);
    } catch (error) {
      console.error('Error creating cover image:', error);
      setError(error.message || 'Error creating cover image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[#24292f]">Step 3: Add Cover Image</h2>
      
      {error && (
        <div className="p-4 bg-[#ffebe9] border border-[#ffa198] rounded-md">
          <p className="text-sm text-[#cf222e]">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#24292f]">
            Cover Image
          </label>
          <ImageGenerator
            onImageSelected={handleImageSelected}
            currentImage={coverImage}
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleAddCoverImage}
            disabled={isLoading || isTransactionPending || !coverImage}
            className="px-4 py-2 bg-[#0969da] text-white rounded-md hover:bg-[#0a58ca] disabled:opacity-50"
          >
            {isLoading || isTransactionPending ? 'Adding Cover Image...' : 'Add Cover Image'}
          </button>
        </div>
      </div>
    </div>
  );
} 