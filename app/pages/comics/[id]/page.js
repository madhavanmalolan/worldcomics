'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSwipeable } from 'react-swipeable'; // You'll need to install this package
import ComicCanvas from '@/app/components/ComicCanvas';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { ethers } from 'ethers';
import contracts from '@/app/constants/contracts.json';
import addresses from '@/app/constants/addresses.json';

export default function Feed() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [pages, setPages] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [strips, setStrips] = useState([]);
  const [voteAmounts, setVoteAmounts] = useState({});
  const [isVoting, setIsVoting] = useState({});
  const router = useRouter();
  const params = useParams();
  const comicId = params.id;

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Get Comics contract address from Admin
  const { data: comicsAddress } = useReadContract({
    address: addresses.admin,
    abi: contracts.admin.abi,
    functionName: 'getComicsAddress',
  });

  // Get vote counts for all candidates
  const { data: voteCounts } = useReadContract({
    address: comicsAddress,
    abi: contracts.comics.abi,
    functionName: 'getVoteCount',
    args: [candidates.map(c => c.stripId)],
    enabled: candidates.length > 0,
  });

  useEffect(() => {
    loadComicPages();
    loadCandidates();
  }, []);

  // Initialize vote amounts when candidates change
  useEffect(() => {
    const initialAmounts = {};
    candidates.forEach(candidate => {
      initialAmounts[candidate.stripId] = '0.01';
    });
    setVoteAmounts(initialAmounts);
  }, [candidates]);

  const loadComicPages = async () => {
    setIsLoading(true);
    /*try {
      const response = await fetch(`/api/comics/${comicId}/pages`);
      if (!response.ok) {
        throw new Error('Failed to load pages');
      }
      const data = await response.json();
      setPages(data);
    } catch (error) {
      console.error('Error loading comic pages:', error);
    } finally {
      setIsLoading(false);
    }*/
    setIsLoading(false);
  };

  const loadCandidates = async () => {
    try {
      console.log("comicId", comicId);
      const response = await fetch(`/api/comics/${comicId}/candidates`);
      const data = await response.json();
      console.log("data", data);
      setCandidates(data.candidates.filter(candidate => candidate.imageUrls && candidate.imageUrls.length > 0));
      setStrips(data.strips);
      console.log("candidates", candidates);
      console.log("strips", strips);
    } catch (error) {
      console.error('Error loading candidates:', error);
    }
  };

  const handleSavePage = async (pageData) => {
    try {
      const response = await fetch(`/api/comics/${comicId}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: pageData.image,
          pageNumber: pages.length + 1,
          elements: pageData.elements
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save page');
      }

      // Reload pages after saving
      await loadComicPages();
      setCurrentPage(pages.length + 1);
    } catch (error) {
      console.error('Error saving page:', error);
    }
  };
  
  const navigatePage = (direction) => {
    if (direction === 'next' && currentPage < pages.length) {
      setCurrentPage(prev => prev + 1);
    } else if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // Swipe handlers for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => navigatePage('next'),
    onSwipedRight: () => navigatePage('prev'),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavigation = (path) => {
    setIsMenuOpen(false);
    router.push(path);
  };

  const handleVoteAmountChange = (stripId, value) => {
    // Ensure value is a valid number and not negative
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setVoteAmounts(prev => ({
        ...prev,
        [stripId]: value
      }));
    }
  };

  const adjustVoteAmount = (stripId, delta) => {
    const currentAmount = parseFloat(voteAmounts[stripId] || '0');
    const newAmount = Math.max(0, currentAmount + delta);
    setVoteAmounts(prev => ({
      ...prev,
      [stripId]: newAmount.toFixed(2)
    }));
  };

  const handleVote = async (stripId) => {
    console.log("handleVote", stripId);
    if (!isConnected) {
      alert('Please connect your wallet to vote');
      return;
    }
    if (!comicsAddress) {
      alert('Could not get Comics contract address');
      return;
    }

    setIsVoting(prev => ({ ...prev, [stripId]: true }));
    try {
      const amount = ethers.parseEther(voteAmounts[stripId]);
      console.log("amount", amount, stripId);
      const tx = await writeContractAsync({
        address: comicsAddress,
        abi: contracts.comics.abi,
        functionName: 'vote',
        args: [stripId],
        value: amount,
      });

      console.log('Vote transaction:', tx);
      // Reset vote amount after successful vote
      setVoteAmounts(prev => ({
        ...prev,
        [stripId]: '0.01'
      }));
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote. Please try again.');
    } finally {
      setIsVoting(prev => ({ ...prev, [stripId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] p-6 flex items-center justify-center">
        <div className="text-[#57606a]">Loading pages...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <div className="px-4 sm:px-6 lg:px-8">
        {strips && strips.length > 0 ? (
          <div className="mt-4 space-y-8">
            {strips.map((strip, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-center w-full">
                  <div className="flex gap-4 w-full">
                    {strip.imageUrls.map((imageUrl, imgIndex) => (
                      <div 
                        key={imgIndex} 
                        className="flex-1 aspect-square min-w-0"
                      >
                        <img
                          src={imageUrl}
                          alt={`Strip ${index + 1} Panel ${imgIndex + 1}`}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                    ))}
                    {Array.from({ length: 4 - strip.imageUrls.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="flex-1" />
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Published {new Date(strip.createdAt).toLocaleDateString()}
                  </div>
                  {strip.voteCount && (
                    <div className="text-sm text-gray-600">
                      Total votes: {ethers.formatEther(strip.voteCount)} ETH
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 text-gray-500">
            No published strips yet.
          </div>
        )}

        <h2 className="text-lg font-medium text-gray-900 mt-8">Candidates for tomorrow's strip</h2>
        {!isConnected ? (
          <div className="mt-2 text-sm text-gray-600">
            Connect your wallet to vote
          </div>
        ) : <></>}

        {candidates && candidates.length > 0 ? (
          <div className="mt-4 space-y-8">
            {candidates.map((candidate, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-center w-full">
                  <div className="flex gap-4 w-full">
                    {candidate.imageUrls.map((imageUrl, imgIndex) => (
                      <div 
                        key={imgIndex} 
                        className="flex-1 aspect-square min-w-0"
                      >
                        <img
                          src={imageUrl}
                          alt={`Strip ${index + 1} Panel ${imgIndex + 1}`}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                    ))}
                    {Array.from({ length: 4 - candidate.imageUrls.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="flex-1" />
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Created {new Date(candidate.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => adjustVoteAmount(candidate.stripId, -0.01)}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={voteAmounts[candidate.stripId] || '0.01'}
                        onChange={(e) => handleVoteAmountChange(candidate.stripId, e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-20 px-2 py-1 border rounded text-right"
                      />
                      <button
                        onClick={() => adjustVoteAmount(candidate.stripId, 0.01)}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        +
                      </button>
                      <span className="text-sm text-gray-600">ETH</span>
                    </div>
                    <button
                      onClick={() => handleVote(candidate.stripId)}
                      disabled={isVoting[candidate.stripId] || !isConnected}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isVoting[candidate.stripId] ? 'Voting...' : 'Vote'}
                    </button>
                  </div>
                </div>
                {voteCounts && voteCounts[index] && (
                  <div className="mt-2 text-sm text-gray-600">
                    Current votes: {ethers.formatEther(voteCounts[index])} ETH
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 text-gray-500">
            No candidates available yet. Create a new strip to get started!
          </div>
        )}

        <div className="mt-4 mb-12">
          <Link
            href={`/pages/comics/${comicId}/create-strip`}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add a new strip
          </Link>
        </div>
      </div>
    </div>
  );
}