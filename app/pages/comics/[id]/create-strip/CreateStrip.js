'use client';
import { useState, useEffect } from 'react';
import ImageGenerator from '@/app/components/ImageGenerator';
import ComicCanvas from '@/app/components/ComicCanvas';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useReadContract } from 'wagmi';
import { ethers } from 'ethers';
import contracts from '@/app/constants/contracts.json';
import { admin } from '@/app/constants/addresses.json';

export default function CreateStrip({ comicId }) {
  const router = useRouter();
  const [images, setImages] = useState([null, null, null, null]);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [comic, setComic] = useState(null);
  const [isLoadingComic, setIsLoadingComic] = useState(false);
  const [txHash, setTxHash] = useState('');
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  // Get Comics contract address from Admin
  const { data: comicsAddress } = useReadContract({
    address: admin,
    abi: contracts.admin.abi,
    functionName: 'getComicsAddress',
  });

  console.log('comics address:', comicsAddress);
  // Get mint price from Comics contract
  const { data: mintPrice } = useReadContract({
    address: comicsAddress,
    abi: contracts.comics.abi,
    functionName: 'getComicCreationFee',
  });

  // Write contract for creating strip
  const { writeContractAsync } = useWriteContract();

  // Wait for transaction receipt
  const { isConfirming, isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Load comic data when component mounts
  useEffect(() => {
    const loadComic = async () => {
      if (!comicId) return;
      
      setIsLoadingComic(true);
      try {
        const response = await axios.get(`/api/comics/${comicId}`);
        setComic(response.data);
      } catch (error) {
        console.error('Error loading comic:', error);
        alert('Failed to load comic data');
      } finally {
        setIsLoadingComic(false);
      }
    };

    loadComic();
  }, [comicId]);

  const handleImageGenerated = (imageUrl, index) => {
    const newImages = [...images];
    newImages[index] = imageUrl;
    setImages(newImages);
  };

  const handleCanvasSave = (imageUrl, index) => {
    const newImages = [...images];
    newImages[index] = imageUrl;
    setImages(newImages);
    setEditingIndex(null);
  };

  const handleSave = async () => {
    if (images.every(img => img === null)) return;
    alert('Saving strip...');
    if (!isConnected) {
      alert('Please connect your wallet to create a strip');
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

    setLoading(true);
    try {
      // Create on-chain transaction
      const tx = await writeContractAsync({
        address: comicsAddress,
        abi: contracts.comics.abi,
        functionName: 'createStrip',
        args: [
          images.filter(img => img !== null),
          [], // Empty character IDs array for now
          comicId
        ],
      });

      console.log('Transaction:', tx);
      setTxHash(tx);

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      console.log('Transaction receipt:', receipt);
      
      // Get the strip ID from the event logs
      const iface = new ethers.Interface(contracts.comics.abi);
      const stripCreatedEvent = receipt.logs.find(log => 
        log.topics[0] === iface.getEvent('StripCreated').topicHash
      );
      
      if (!stripCreatedEvent) {
        throw new Error('StripCreated event not found in transaction logs');
      }

      // Decode the event data
      const decodedEvent = iface.parseLog({
        topics: stripCreatedEvent.topics,
        data: stripCreatedEvent.data
      });
      
      const stripId = decodedEvent.args.stripId;
      const currentDay = decodedEvent.args.day;
      console.log('Strip ID:', stripId);
      console.log('Current day:', currentDay);
      console.log('Strip created event:', decodedEvent);

      // Call the API route to save the strip
      const formData = new FormData();
      images.forEach(imageUrl => {
        if (imageUrl) {
          formData.append('imageUrls', imageUrl);
        }
      });
      formData.append('elements', JSON.stringify([]));
      formData.append('stripId', stripId.toString());
      formData.append('txHash', tx);
      formData.append('comicId', comicId);
      formData.append('day', currentDay);
      const response = await fetch(`/api/comics/${comicId}/candidates`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save strip');
      }

      const data = await response.json();
      console.log('Strip saved:', data);
      
      // Redirect back to the comic page
      //router.push(`/comics/${comicId}`);
    } catch (error) {
      console.error('Error saving strip:', error);
      alert('Failed to save strip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (editingIndex !== null) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Edit Image {editingIndex + 1}</h1>
        <ComicCanvas
          artisticStyle={comic?.artisticStyle}
          initialImage={images[editingIndex]}
          onSave={(imageUrl) => handleCanvasSave(imageUrl, editingIndex)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {isLoadingComic ? 'Loading Comic...' : `Create Strip for ${comic?.name || 'Comic'}`}
      </h1>
      
      {isLoadingComic && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">Loading comic data...</p>
        </div>
      )}

      {!isConnected && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            Please connect your wallet to create a strip.
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {images.map((imageUrl, index) => (
          <div key={index} className="relative group">
            {imageUrl ? (
              <div className="relative">
                <img
                  src={imageUrl}
                  alt={`Strip image ${index + 1}`}
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  onClick={() => setEditingIndex(index)}
                  className="absolute top-2 right-2 bg-blue-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✎
                </button>
                <button
                  onClick={() => {
                    const newImages = [...images];
                    newImages[index] = null;
                    setImages(newImages);
                  }}
                  className="absolute top-2 right-12 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center h-64">
                <ImageGenerator
                  artisticStyle={comic?.artisticStyle}
                  onImageSelected={(url) => handleImageGenerated(url, index)}
                  currentImage={null}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {images.some(img => img !== null) && (
        <div className="flex justify-center">
          <button
            onClick={handleSave}
            disabled={loading || isLoadingComic || !isConnected}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Strip'}
          </button>
        </div>
      )}
    </div>
  );
} 