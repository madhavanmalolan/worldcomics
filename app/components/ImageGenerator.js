'use client';

import { useState } from 'react';
import axios from 'axios';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, IMAGE_GENERATION_PRICE } from '@/app/constants/contract';

export default function ImageGenerator({ onImageSelected, currentImage }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(currentImage || null);
  const { address } = useAccount();

  // Contract write hook for payment
  const { writeContractAsync, data: hash, error: writeError } = useWriteContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS
  });

  const { data: receipt, isLoading: isTransactionPending } = useWaitForTransactionReceipt({
    hash,
  });

  const generateImage = async () => {
    try {
      setIsLoading(true);
      setError('');

      if (!address) {
        setError('Please connect your wallet first');
        return;
      }

      // First, make the payment
      const value = ethers.parseEther(IMAGE_GENERATION_PRICE);
      const tx = await writeContractAsync({
        abi: CONTRACT_ABI,
        address: CONTRACT_ADDRESS,
        functionName: 'payForPrompt',
        value,
      });

      // Wait for the transaction to be confirmed
      if (!receipt) {
        setError('Waiting for payment confirmation...');
        return;
      }

      // After payment is confirmed, generate the image
      const response = await axios.post('/api/generate-image', {
        prompt,
      });

      setGeneratedImage(response.data.image);
      if (response.data.text) {
        setGeneratedText(response.data.text);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      setError(error.message || 'Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseImage = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Convert base64 to blob
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const file = new File([blob], 'generated-image.png', { type: 'image/png' });

      // Upload to backend
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imageUrl = uploadResponse.data.url;
      setSelectedImage(imageUrl);
      onImageSelected(imageUrl);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {selectedImage ? (
        <div className="relative group">
          <img
            src={selectedImage}
            alt="Selected"
            className="w-48 h-48 object-cover rounded-lg"
          />
          <button
            onClick={() => {
              setGeneratedImage(selectedImage);
              setIsDialogOpen(true);
            }}
            className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-800 px-3 py-1 rounded-md text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Edit
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsDialogOpen(true)}
          className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-600"
        >
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span className="mt-2 block text-sm font-medium">Add Image</span>
          </div>
        </button>
      )}

      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Generate Image</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="w-full h-32 p-3 border rounded-md"
                rows={4}
              />

              <div className="flex gap-4">
                <button
                  onClick={generateImage}
                  disabled={isLoading || isTransactionPending || !prompt || !address}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading || isTransactionPending ? 'Processing...' : `Generate (${IMAGE_GENERATION_PRICE} ETH)`}
                </button>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>

              {generatedText && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <p className="text-gray-700 whitespace-pre-wrap">{generatedText}</p>
                </div>
              )}

              {generatedImage && (
                <div className="mt-4">
                  <div className="relative">
                    <img
                      src={generatedImage}
                      alt="Generated"
                      className="w-full rounded-lg"
                    />
                    <button
                      onClick={handleUseImage}
                      disabled={isLoading}
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-800 px-3 py-1 rounded-md text-sm font-medium"
                    >
                      Use
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 