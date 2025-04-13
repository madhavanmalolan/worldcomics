'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt, useChainId, useReadContract } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/app/constants/contract';
import { baseSepolia } from 'wagmi/chains';

export default function NewCharacterPage() {
  const [characterName, setCharacterName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [characterPrice, setCharacterPrice] = useState('0');
  const router = useRouter();
  const params = useParams();
  const comicId = params.id;
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const chainId = useChainId();

  // Read contract hook for getting character price
  const { data: price } = useReadContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    functionName: 'getCharacterPrice',
    args: [comicId],
    watch: true,
  });

  useEffect(() => {
    if (price) {
      setCharacterPrice(ethers.formatEther(price));
    }
  }, [price]);

  // Contract write hook
  const { writeContractAsync, data: hash, error: writeError } = useWriteContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    onError(error) {
      console.error('Contract write error:', error);
      setError(error.message);
    },
    onSuccess(data) {
      console.log('Contract write success:', data);
    }
  });

  // Wait for transaction receipt
  const { isLoading: isTransactionPending } = useWaitForTransactionReceipt({
    hash,
    onSuccess(data) {
      console.log('Transaction receipt:', data);
    },
    onError(error) {
      console.error('Transaction receipt error:', error);
      setError(error.message);
    }
  });

  const verifyContract = async () => {
    try {
      console.log("Verifying contract at address:", CONTRACT_ADDRESS);
      const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const code = await provider.getCode(CONTRACT_ADDRESS);
      if (code === '0x') {
        throw new Error('No contract found at this address');
      }
      console.log("Contract code exists at address");

      const owner = await contract.owner();
      console.log("Contract owner:", owner);
      
      return true;
    } catch (error) {
      console.error("Contract verification failed:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    console.log('Submit button clicked');
    console.log('Current state:', {
      address,
      chainId,
      CONTRACT_ADDRESS,
      characterName,
      description,
      prompt,
      characterPrice
    });

    if (!CONTRACT_ADDRESS) {
      setError('Contract address not configured. Please check your environment variables.');
      console.error('No contract address configured');
      return;
    }

    if (!address) {
      if (connectors.length > 0) {
        console.log('Connecting wallet...');
        await connect({ connector: connectors[0] });
        return;
      } else {
        setError('Please install a wallet to create a character');
        return;
      }
    }

    if (chainId !== baseSepolia.id) {
      setError(`Please connect to the Base Sepolia network (Chain ID: ${baseSepolia.id})`);
      console.error('Wrong network. Current chainId:', chainId);
      return;
    }

    setIsLoading(true);
    
    try {
      console.log("Starting character creation process");
      console.log("Chain ID:", chainId);
      console.log("Contract Address:", CONTRACT_ADDRESS);
      
      await verifyContract();
      
      // Create character on blockchain
      const args = [comicId, characterName, description, prompt, `ipfs://${characterName}`];
      const value = 0; //ethers.parseEther(characterPrice);
      
      const tx = await writeContractAsync({
        abi: CONTRACT_ABI,
        address: CONTRACT_ADDRESS,
        functionName: 'createCharacter',
        args,
        value,
      });
      
      console.log("Transaction hash:", tx);
      
      if (writeError) {
        console.error("Write contract error:", writeError);
        throw writeError;
      }

      if (!tx) {
        throw new Error('Transaction failed to initiate');
      }

      // Store in MongoDB
      const response = await fetch(`/api/comics/${comicId}/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: characterName,
          prompt,
          description,
          creator: address,
          txHash: tx,
          imageUrl: `ipfs://${characterName}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to store character in database');
      }

      const data = await response.json();
      console.log('Character created:', data);
      router.push(`/comics/${comicId}/characters`);
    } catch (error) {
      console.error('Error creating character:', error);
      setError(error.message || 'Error creating character. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fa] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg border border-[#d0d7de] p-6">
          <h1 className="text-2xl font-semibold text-[#24292f] mb-6">Create a new character</h1>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                {error}
              </p>
            </div>
          )}
          
          {!address && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Please connect your wallet to create a character.
              </p>
            </div>
          )}
          
          {chainId !== baseSepolia.id && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Please connect to the Base Sepolia network to create a character.
              </p>
            </div>
          )}

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              Current price to create a character: <span className="font-semibold">{characterPrice} ETH</span>
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Character Name */}
            <div>
              <label htmlFor="characterName" className="block text-sm font-medium text-[#24292f] mb-2">
                Character Name
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-[#d0d7de] bg-[#f6f8fa] text-[#57606a] text-sm">
                  character/
                </span>
                <input
                  type="text"
                  id="characterName"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  className="flex-1 block w-full rounded-none rounded-r-md border border-[#d0d7de] px-3 py-2 text-sm focus:border-[#0969da] focus:outline-none focus:ring-1 focus:ring-[#0969da]"
                  placeholder="my-awesome-character"
                  required
                  pattern="[a-z0-9-]+"
                />
              </div>
              <p className="mt-1 text-sm text-[#57606a]">
                This is the name of your character. It can only contain lowercase letters, numbers, and hyphens.
              </p>
            </div>

            {/* Character Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-[#24292f] mb-2">
                Character Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="block w-full rounded-md border border-[#d0d7de] px-3 py-2 text-sm focus:border-[#0969da] focus:outline-none focus:ring-1 focus:ring-[#0969da]"
                placeholder="Describe your character's personality, background, and role in the story..."
                required
              />
              <p className="mt-1 text-sm text-[#57606a]">
                Provide a detailed description of your character's personality, background, and role in the story.
              </p>
            </div>

            {/* Image Prompt */}
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-[#24292f] mb-2">
                Character Image Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="block w-full rounded-md border border-[#d0d7de] px-3 py-2 text-sm focus:border-[#0969da] focus:outline-none focus:ring-1 focus:ring-[#0969da]"
                placeholder="Describe how your character should look..."
                required
              />
              <p className="mt-1 text-sm text-[#57606a]">
                Provide a detailed description of how you want your character to look. Be specific about appearance, style, and any unique features.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || isTransactionPending || !address}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#2da44e] hover:bg-[#2c974b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2da44e] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading || isTransactionPending ? 'Creating...' : address ? `Create Character (${characterPrice} ETH)` : 'Connect Wallet'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 