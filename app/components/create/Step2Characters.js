'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/app/constants/contract';
import ImageGenerator from '../ImageGenerator';

export default function Step2Characters({ onNext, comicId }) {
  const [characters, setCharacters] = useState([]);
  const [currentCharacter, setCurrentCharacter] = useState({
    name: '',
    description: '',
    imageUrl: ''
  });
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
    setCurrentCharacter(prev => ({
      ...prev,
      imageUrl
    }));
  };

  const handleAddCharacter = async () => {
    if (!currentCharacter.name || !currentCharacter.description || !currentCharacter.imageUrl) {
      setError('Please fill in all character details');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Create character on-chain
      const tx = await writeContractAsync({
        abi: CONTRACT_ABI,
        address: CONTRACT_ADDRESS,
        functionName: 'createCharacter',
        args: [
          comicId,
          currentCharacter.name,
          currentCharacter.description,
          currentCharacter.description, // Using description as prompt
          currentCharacter.imageUrl
        ],
      });

          // First, store character in the backend
        const response = await fetch(`/api/comics/${comicId}/characters`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: currentCharacter.name,
            description: currentCharacter.description,
            imageUrl: currentCharacter.imageUrl,
          }),
        });
  
        if (!response.ok) {
          throw new Error('Failed to store character in backend');
        }
      
      

      // Update local state with the new character
      setCharacters([...characters, currentCharacter]);
      
      // Clear all fields
      setCurrentCharacter({
        name: '',
        description: '',
        imageUrl: ''
      });
    } catch (error) {
      console.error('Error creating character:', error);
      setError(error.message || 'Error creating character. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[#24292f]">Step 2: Add Characters</h2>
      
      {error && (
        <div className="p-4 bg-[#ffebe9] border border-[#ffa198] rounded-md">
          <p className="text-sm text-[#cf222e]">{error}</p>
        </div>
      )}

      {characters.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-[#24292f] mb-4">Added Characters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {characters.map((character, index) => (
              <div key={index} className="border border-[#d0d7de] rounded-md p-4">
                <img
                  src={character.imageUrl}
                  alt={character.name}
                  className="w-full h-48 object-cover rounded-md mb-2"
                />
                <h4 className="font-medium text-[#24292f]">{character.name}</h4>
                <p className="text-sm text-[#57606a]">{character.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="characterName" className="block text-sm font-medium text-[#24292f]">
            Character Name
          </label>
          <input
            type="text"
            id="characterName"
            value={currentCharacter.name}
            onChange={(e) => setCurrentCharacter(prev => ({ ...prev, name: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-[#d0d7de] shadow-sm focus:border-[#0969da] focus:ring-[#0969da]"
            required
          />
        </div>

        <div>
          <label htmlFor="characterDescription" className="block text-sm font-medium text-[#24292f]">
            Character Description
          </label>
          <textarea
            id="characterDescription"
            value={currentCharacter.description}
            onChange={(e) => setCurrentCharacter(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-md border border-[#d0d7de] shadow-sm focus:border-[#0969da] focus:ring-[#0969da]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#24292f]">
            Character Image
          </label>
          <ImageGenerator
            onImageSelected={handleImageSelected}
            currentImage={currentCharacter.imageUrl}
          />
        </div>

        <div className="flex justify-between">
          <button
            onClick={handleAddCharacter}
            disabled={isLoading || isTransactionPending}
            className="px-4 py-2 bg-[#0969da] text-white rounded-md hover:bg-[#0a58ca] disabled:opacity-50"
          >
            {isLoading || isTransactionPending ? 'Adding Character...' : 'Add Character'}
          </button>
          <button
            onClick={() => onNext(characters)}
            disabled={characters.length === 0}
            className="px-4 py-2 bg-[#0969da] text-white rounded-md hover:bg-[#0a58ca] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
} 