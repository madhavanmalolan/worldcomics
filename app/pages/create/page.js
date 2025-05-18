'use client';

import React, { useState, useEffect } from 'react';
import ImageGenerator from '@/app/components/ImageGenerator';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther } from 'viem';
import contracts from '@/app/constants/contracts.json';
import addresses from '@/app/constants/addresses.json';
import axios from 'axios';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';

export default function CreateComicPage() {
  const [comicName, setComicName] = useState('');
  const [comicImage, setComicImage] = useState('');
  const [artisticStyle, setArtisticStyle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [comicData, setComicData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(true);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const router = useRouter();

  // Load initial state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('createHowItWorksExpanded');
    if (savedState !== null) {
      setIsHowItWorksExpanded(JSON.parse(savedState));
    }
  }, []);

  // Save state to localStorage when it changes
  const toggleHowItWorks = () => {
    const newState = !isHowItWorksExpanded;
    setIsHowItWorksExpanded(newState);
    localStorage.setItem('createHowItWorksExpanded', JSON.stringify(newState));
  };

  // Get Comics contract address from Admin
  const adminAddress = addresses.admin;

  const { data: comicsAddress, isLoading: isLoadingAddress, error: addressError } = useReadContract({
    address: adminAddress,
    abi: contracts.admin.abi,
    functionName: 'getComicsAddress',
  });

  // Get the current mint price
  const { data: mintPrice, isLoading: isLoadingPrice, error: priceError } = useReadContract({
    address: comicsAddress,
    abi: contracts.comics.abi,
    functionName: 'getComicCreationFee',
    query: {
      enabled: !!comicsAddress,
    }
  });

  // Prepare the mint comic transaction
  const { writeContractAsync: mintComic, data: mintData } = useWriteContract();

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: mintData?.hash,
  });


  const handleNameChange = (e) => {
    const value = e.target.value;
    setComicName(value);
  };

  const handleCreateComic = async () => {
    if (!comicName || !comicImage) {
      alert('Please provide both a name and an image for the comic');
      return;
    }

    if (!isConnected) {
      alert('Please connect your wallet to create a comic');
      return;
    }

    if (!comicsAddress) {
      alert('Could not get Comics contract address');
      return;
    }

    if (mintPrice === undefined) {
      alert('Could not get mint price');
      return;
    }

    setIsCreating(true);
    try {
      const tx = await mintComic({
        address: comicsAddress,
        abi: contracts.comics.abi,
        functionName: 'createComic',
        args: [comicName, comicImage],
        value: mintPrice,
      });

      console.log('Transaction:', tx);
      setTxHash(tx);

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      console.log('Transaction receipt:', receipt);
      
      // Get the comic ID from the event logs
      const iface = new ethers.Interface(contracts.comics.abi);
      const comicCreatedEvent = receipt.logs.find(log => 
        log.topics[0] === iface.getEvent('ComicCreated').topicHash
      );
      
      if (!comicCreatedEvent) {
        throw new Error('ComicCreated event not found in transaction logs');
      }

      const comicId = BigInt(comicCreatedEvent.topics[1]);
      console.log('Comic ID:', comicId);

      // Call the API route to save the comic
      const response = await axios.post('/api/comics', {
        txHash: tx,
        comicId: comicId.toString(),
        name: comicName,
        image: comicImage,
        artisticStyle: artisticStyle,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('API Response:', response.data);
      
      // Reset form
      setComicName('');
      setComicImage('');
      setArtisticStyle('');
      router.push(`/pages/comics/${comicId}`);
    } catch (error) {
      console.error('Error creating comic:', error);
      alert('Failed to create comic. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* How Does This Work Section */}
        <div className="mt-4 mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <button 
            onClick={toggleHowItWorks}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-yellow-800">How Does This Work?</h2>
            <svg 
              className={`w-5 h-5 transform transition-transform ${isHowItWorksExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isHowItWorksExpanded && (
            <ul className="mt-4 space-y-2 text-yellow-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Create a new comic by providing a name and cover image. The comic will be stored on the blockchain as an NFT.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Once created, anyone can add new strips to your comic by creating characters, props, and scenes.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Each strip needs to get enough votes to be published. The vote threshold increases with each strip added.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>The person who has contributed more than half of all the votes in a comic becomes the owner of its IP rights.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>The current cost to create a comic is {mintPrice ? ethers.formatEther(mintPrice) : '0.01'} ETH.</span>
              </li>
            </ul>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {comicData ? 'Edit Comic' : 'Create a New Comic'}
          </h2>
          
          {isLoading && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">Loading comic data...</p>
            </div>
          )}

          {!isConnected && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Please connect your wallet to create a comic.
              </p>
            </div>
          )}

          {txHash && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                Transaction sent! Hash: {txHash}
                {isConfirming && ' (Confirming...)'}
                {isConfirmed && ' (Confirmed!)'}
              </p>
            </div>
          )}

          <div className="space-y-6">
            {/* Name Input */}
            <div>
              <label htmlFor="comicName" className="block text-sm font-medium text-gray-700 mb-1">
                Comic Name
              </label>
              <input
                type="text"
                id="comicName"
                value={comicName}
                onChange={handleNameChange}
                placeholder="Enter comic name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Artistic Style Input */}
            <div>
              <label htmlFor="artisticStyle" className="block text-sm font-medium text-gray-700 mb-1">
                Artistic Style
              </label>
              <input
                type="text"
                id="artisticStyle"
                value={artisticStyle}
                onChange={(e) => setArtisticStyle(e.target.value)}
                placeholder="e.g., 'anime style', 'realistic', 'watercolor'"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Describe the artistic style you want for your comic cover
              </p>
            </div>

            {/* Image Generator */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comic Cover Image
              </label>
              <ImageGenerator 
                imageType="root"
                artisticStyle={artisticStyle}
                onImageSelected={(imageUrl) => setComicImage(imageUrl)}
              />
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateComic}
              disabled={!comicName || !comicImage || !isConnected || isCreating || mintPrice === undefined}
              className={`w-full px-4 py-2 text-white rounded-md ${
                (!comicName || !comicImage || !isConnected || isCreating || mintPrice === undefined)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isCreating ? 'Creating...' : 'Create Comic'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
