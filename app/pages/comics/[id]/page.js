'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSwipeable } from 'react-swipeable'; // You'll need to install this package
import ComicCanvas from '@/app/components/ComicCanvas';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, readContract } from 'wagmi';
import { ethers } from 'ethers';
import contracts from '@/app/constants/contracts.json';
import addresses from '@/app/constants/addresses.json';

// Add TheaterMode component at the top of the file
const TheaterMode = ({ 
  isOpen, 
  onClose, 
  currentImage, 
  currentStripIndex, 
  currentImageIndex, 
  strips,
  onNavigate 
}) => {
  const handleImageClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    if (x < width * 0.3) {
      // Left side click
      onNavigate('prev');
    } else if (x > width * 0.7) {
      // Right side click
      onNavigate('next');
    }
  };

  const handleOverlayClick = (e) => {
    // Only close if clicking the overlay itself, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center"
      onClick={handleOverlayClick}
    >
      <div 
        className="relative w-full h-full flex items-center justify-center"
      >
        <img
          src={currentImage}
          alt="Theater mode"
          className="max-h-[80vh] max-w-[90vw] object-contain"
          onClick={handleImageClick}
        />
      </div>
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 text-white/50">
        <button 
          onClick={() => onNavigate('prev')}
          className="hover:text-white/80 transition-colors"
        >
          Previous
        </button>
        <button 
          onClick={onClose}
          className="hover:text-white/80 transition-colors"
        >
          Close
        </button>
        <button 
          onClick={() => onNavigate('next')}
          className="hover:text-white/80 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};

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
  const [isPublishedStripsExpanded, setIsPublishedStripsExpanded] = useState(true);
  const [isCandidatesExpanded, setIsCandidatesExpanded] = useState(true);
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

  // Get current day for the comic
  const { data: currentDay } = useReadContract({
    address: comicsAddress,
    abi: contracts.comics.abi,
    functionName: 'getCurrentDay',
    args: [comicId],
    enabled: !!comicsAddress && !!comicId,
  });

  // Get vote threshold for current day
  const { data: voteThreshold } = useReadContract({
    address: comicsAddress,
    abi: contracts.comics.abi,
    functionName: 'getVoteThreshold',
    args: [currentDay],
    enabled: !!comicsAddress && currentDay !== undefined,
  });

  // Load initial states from localStorage
  useEffect(() => {
    const savedPublishedState = localStorage.getItem('publishedStripsExpanded');
    const savedCandidatesState = localStorage.getItem('candidatesExpanded');
    if (savedPublishedState !== null) {
      setIsPublishedStripsExpanded(JSON.parse(savedPublishedState));
    }
    if (savedCandidatesState !== null) {
      setIsCandidatesExpanded(JSON.parse(savedCandidatesState));
    }
  }, []);

  // Save states to localStorage when they change
  const togglePublishedStrips = () => {
    const newState = !isPublishedStripsExpanded;
    setIsPublishedStripsExpanded(newState);
    localStorage.setItem('publishedStripsExpanded', JSON.stringify(newState));
  };

  const toggleCandidates = () => {
    const newState = !isCandidatesExpanded;
    setIsCandidatesExpanded(newState);
    localStorage.setItem('candidatesExpanded', JSON.stringify(newState));
  };

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
      setIsLoading(true);

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
    } finally {
      setIsLoading(false);
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
      window.location.reload();
    }
  };

  // Component for displaying a single candidate
  const CandidateCard = ({ candidate, index }) => {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row justify-center w-full gap-4">
          {candidate.imageUrls.map((imageUrl, imgIndex) => (
            <div 
              key={imgIndex} 
              className="w-full sm:flex-1 aspect-square min-w-0"
            >
              <img
                src={imageUrl}
                alt={`Strip ${index + 1} Panel ${imgIndex + 1}`}
                className="w-full h-full object-cover rounded-md"
              />
            </div>
          ))}
          {Array.from({ length: 4 - candidate.imageUrls.length }).map((_, i) => (
            <div key={`empty-${i}`} className="w-full sm:flex-1" />
          ))}
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
        <div className="mt-2 space-y-2">
          {isLoading ? (
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div className="animate-shimmer h-full w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
            </div>
          ) : candidate.voteCount && candidate.voteThreshold ? (
            <>
              <div className="text-sm text-gray-600">
                Current votes: {ethers.formatEther(candidate.voteCount)} ETH
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, (Number(candidate.voteCount) / Number(candidate.voteThreshold)) * 100)}%` 
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0 ETH</span>
                <span>{ethers.formatEther(candidate.voteThreshold)} ETH</span>
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  };

  const [theaterMode, setTheaterMode] = useState({
    isOpen: false,
    currentStripIndex: 0,
    currentImageIndex: 0
  });
  const stripRefs = useRef({});

  // Add navigation handler
  const handleTheaterNavigation = (direction) => {
    const { currentStripIndex, currentImageIndex } = theaterMode;
    const currentStrip = strips[currentStripIndex];
    
    if (direction === 'next') {
      if (currentImageIndex < currentStrip.imageUrls.length - 1) {
        // Next image in current strip
        setTheaterMode(prev => ({
          ...prev,
          currentImageIndex: prev.currentImageIndex + 1
        }));
      } else if (currentStripIndex < strips.length - 1) {
        // First image of next strip
        setTheaterMode(prev => ({
          ...prev,
          currentStripIndex: prev.currentStripIndex + 1,
          currentImageIndex: 0
        }));
      } else {
        // Close if it's the last image of the last strip
        setTheaterMode(prev => ({ ...prev, isOpen: false }));
        handleTheaterClose();
      }
    } else {
      if (currentImageIndex > 0) {
        // Previous image in current strip
        setTheaterMode(prev => ({
          ...prev,
          currentImageIndex: prev.currentImageIndex - 1
        }));
      } else if (currentStripIndex > 0) {
        // Last image of previous strip
        setTheaterMode(prev => ({
          ...prev,
          currentStripIndex: prev.currentStripIndex - 1,
          currentImageIndex: strips[prev.currentStripIndex - 1].imageUrls.length - 1
        }));
      } else {
        // Close if it's the first image of the first strip
        setTheaterMode(prev => ({ ...prev, isOpen: false }));
        handleTheaterClose();
      }
    }
  };

  // Add scroll handler
  const handleTheaterClose = () => {
    setTheaterMode(prev => ({ ...prev, isOpen: false }));
    // Scroll to the strip after a short delay to ensure the DOM has updated
    setTimeout(() => {
      const stripElement = stripRefs.current[theaterMode.currentStripIndex];
      if (stripElement) {
        stripElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div className="text-[#57606a]">Loading comics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Published Strips How Does This Work Section */}
        <div className="mt-4 mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <button 
            onClick={togglePublishedStrips}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-yellow-800">How Does This Work?</h2>
            <svg 
              className={`w-5 h-5 transform transition-transform ${isPublishedStripsExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isPublishedStripsExpanded && (
            <ul className="mt-4 space-y-2 text-yellow-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Below are the finalized strips. These are published on the blockchain. </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>With each passing strip added to the comic, it becomes more expensive to add another strip to the evolving store. We don't want someone to come and mess up the story.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><u><a href={`/pages/comics/${comicId}/create-strip`}>Anyone can create</a></u> the next strip in the comic. But it needs to get enough votes to be published.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>What you are seeing below is a truly world-wide collaborative comic. No one is in control of it. It is created by the community, for the community.</span>
              </li>
            </ul>
          )}
        </div>

        {strips && strips.length > 0 ? (
          <div className="mt-4 space-y-8">
            {strips.map((strip, index) => (
              <div 
                key={index} 
                className="bg-white p-4 rounded-lg shadow"
                ref={el => stripRefs.current[index] = el}
              >
                <div className="flex flex-col sm:flex-row justify-center w-full gap-4">
                  {strip.imageUrls.map((imageUrl, imgIndex) => (
                    <div 
                      key={imgIndex} 
                      className="w-full sm:flex-1 aspect-square min-w-0 cursor-pointer"
                      onClick={() => setTheaterMode({
                        isOpen: true,
                        currentStripIndex: index,
                        currentImageIndex: imgIndex
                      })}
                    >
                      <img
                        src={imageUrl}
                        alt={`Strip ${index + 1} Panel ${imgIndex + 1}`}
                        className="w-full h-full object-cover rounded-md"
                      />
                    </div>
                  ))}
                  {Array.from({ length: 4 - strip.imageUrls.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="w-full sm:flex-1" />
                  ))}
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
          <div className="mt-4 bg-white p-8 rounded-lg shadow text-center">
            <div className="text-gray-500 text-lg">No strips finalized yet</div>
            <div className="mt-2 text-gray-400">Be the first to create a strip that gets enough votes!</div>
          </div>
        )}

        <h2 className="text-lg font-medium text-gray-900 mt-8">Candidates for tomorrow's strip</h2>
        {/* Candidates How Does This Work Section */}
        <div className="mt-4 mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <button 
            onClick={toggleCandidates}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-yellow-800">How Does This Work?</h2>
            <svg 
              className={`w-5 h-5 transform transition-transform ${isCandidatesExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isCandidatesExpanded && (
            <ul className="mt-4 space-y-2 text-yellow-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Below are the candidates for the next strip. The first strip to pass the threshold votes will be added permanently to the comic, and published on the blockchain. </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>You can vote for your favorite candidate for the next strip in this comic with ETH. </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>The first strip to pass the threshold ETH in votes will be added permanently to the comic, and published on the blockchain. </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>When the strip is published, the ETH collected via the votes are distributed to the creator of the strip, and the creators of the characters, props and scenes used in the strip.</span>
              </li>
            </ul>
          )}
        </div>
        {!isConnected ? (
          <div className="mt-2 text-sm text-gray-600">
            Connect your wallet to vote
          </div>
        ) : <></>}

        {candidates && candidates.length > 0 ? (
          <div className="mt-4 space-y-8">
            {candidates.map((candidate, index) => (
              <CandidateCard key={index} candidate={candidate} index={index} />
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

        {/* Add TheaterMode component */}
        <TheaterMode
          isOpen={theaterMode.isOpen}
          onClose={handleTheaterClose}
          currentImage={strips[theaterMode.currentStripIndex]?.imageUrls[theaterMode.currentImageIndex]}
          currentStripIndex={theaterMode.currentStripIndex}
          currentImageIndex={theaterMode.currentImageIndex}
          strips={strips}
          onNavigate={handleTheaterNavigation}
        />
      </div>
    </div>
  );
}