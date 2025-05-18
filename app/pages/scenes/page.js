'use client';

import React, { useState, useEffect } from 'react';
import ImageGenerator from '@/app/components/ImageGenerator';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import contracts from '@/app/constants/contracts.json';
import addresses from '@/app/constants/addresses.json';
import axios from 'axios';

export default function ScenesPage() {
  const [sceneName, setSceneName] = useState('');
  const [sceneImage, setSceneImage] = useState('');
  const [artisticStyle, setArtisticStyle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [scenes, setScenes] = useState([]);
  const { address, isConnected } = useAccount();

  // Get Scenes contract address from Admin
  const adminAddress = addresses.admin;

  const { data: scenesAddress, isLoading: isLoadingAddress, error: addressError } = useReadContract({
    address: adminAddress,
    abi: contracts.admin.abi,
    functionName: 'getScenesAddress',
  });
  console.log("scenes address", scenesAddress);
  console.log("isLoadingAddress", isLoadingAddress);
  console.log("addressError", addressError);

  // Get the current mint price
  const { data: mintPrice, isLoading: isLoadingPrice, error: priceError } = useReadContract({
    address: scenesAddress,
    abi: contracts.scenes.abi,
    functionName: 'getMintPrice',
    query: {
      enabled: !!scenesAddress,
    }
  });
  console.log("mint price", mintPrice);
  console.log("isLoadingPrice", isLoadingPrice);
  console.log("priceError", priceError);

  // Prepare the mint scene transaction
  const { writeContractAsync: mintScene, data: mintData } = useWriteContract();

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: mintData?.hash,
  });

  // Refresh scenes when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      const fetchScenes = async () => {
        try {
          const response = await axios.get('/api/scenes');
          setScenes(response.data);
        } catch (error) {
          console.error('Error fetching scenes:', error);
        }
      };
      fetchScenes();
    }
  }, [isConfirmed]);

  // Fetch scenes on component mount
  useEffect(() => {
    const fetchScenes = async () => {
      try {
        const response = await axios.get('/api/scenes');
        setScenes(response.data);
      } catch (error) {
        console.error('Error fetching scenes:', error);
      }
    };

    fetchScenes();
  }, []);

  const handleNameChange = (e) => {
    const value = e.target.value;
    const formattedName = value
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, '_');
    setSceneName(formattedName);
  };

  const handleSaveScene = async () => {
    if (!sceneName || !sceneImage) {
      alert('Please provide both a name and an image for the scene');
      return;
    }

    if (!isConnected) {
      alert('Please connect your wallet to save a scene');
      return;
    }

    if (!scenesAddress) {
      alert('Could not get Scenes contract address');
      return;
    }

    if (mintPrice === undefined) {
      alert('Could not get mint price');
      return;
    }

    setIsSaving(true);
    try {
      const tx = await mintScene({
        address: scenesAddress,
        abi: contracts.scenes.abi,
        functionName: 'mintScene',
        args: [sceneName, sceneImage, artisticStyle],
        value: mintPrice,
      });

      console.log('Transaction:', tx);
      console.log("Scenes Address:", scenesAddress);
      setTxHash(tx);

      // Call the API route to save the scene
      const response = await axios.post('/api/scenes', { 
        txHash: tx, 
        name: sceneName, 
        image: sceneImage,
        artisticStyle: artisticStyle 
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('API Response:', response.data);
      window.location.reload();
      // Reset form
      setSceneName('');
      setSceneImage('');
      setArtisticStyle('');
    } catch (error) {
      console.error('Error saving scene:', error);
      alert('Failed to save scene. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Scene Creation Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Add a Scene</h2>
          
          {!isConnected && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Please connect your wallet to create a scene.
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
              <label htmlFor="sceneName" className="block text-sm font-medium text-gray-700 mb-1">
                Scene Name
              </label>
              <input
                type="text"
                id="sceneName"
                value={sceneName}
                onChange={handleNameChange}
                placeholder="Enter scene name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Name will be converted to lowercase with underscores (e.g., "sunset_beach")
              </p>
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
                placeholder="Enter artistic style (e.g., 'pixel art', 'watercolor', '3D render')"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Image Generator */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scene Image
              </label>
              <ImageGenerator 
                imageType="scene"
                onImageSelected={(imageUrl) => setSceneImage(imageUrl)}
                artisticStyle={artisticStyle}
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveScene}
              disabled={!sceneName || !sceneImage || !isConnected || isSaving || mintPrice === undefined}
              className={`w-full px-4 py-2 text-white rounded-md ${
                (!sceneName || !sceneImage || !isConnected || isSaving || mintPrice === undefined)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Scene'}
            </button>
          </div>
        </div>

        {/* Scenes Grid */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">All Scenes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {scenes.map((scene) => (
              <div key={scene._id} className="bg-gray-50 rounded-lg overflow-hidden shadow-sm">
                <img 
                  src={scene.image} 
                  alt={scene.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900">{scene.name}</h3>
                  <p className="text-sm text-gray-500">Style: {scene.artisticStyle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 