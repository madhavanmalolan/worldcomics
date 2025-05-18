'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect } from 'wagmi';
import ImageGenerator from '@/app/components/ImageGenerator';
export default function Feed() {
  const [searchQuery, setSearchQuery] = useState('');
  const [comics, setComics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { address } = useAccount();
  const { connect, connectors } = useConnect();

  useEffect(() => {
    const fetchComics = async () => {
      try {
        const response = await fetch('/api/comics');
        if (!response.ok) {
          throw new Error('Failed to fetch comics');
        }
        const data = await response.json();
        console.log('Comics:', data);
        setComics(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching comics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchComics();
  }, []);

  const filteredItems = comics.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleItemClick = (item) => {
    router.push(`/pages/comics/${item.comicId}`);
  };

  const handleCreateNew = () => {
    router.push('/pages/create');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] p-6 flex items-center justify-center">
        <div className="text-[#57606a]">Loading comics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] p-6 flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] p-6">
      <div className="px-4 sm:px-6 lg:px-8">
        {/* How Does This Work Section */}
        <div className="mt-4 mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-4">How Does This Work?</h2>
          <ul className="space-y-2 text-yellow-700">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Every comic is on the blockchain and is free to read. But everything else on this site is paid! Be sure to setup <u><a href="https://coinbase.com/wallet" target="_blank" rel="noopener noreferrer">Coinbase wallet</a></u> and top it up with ETH and connect wallet to this site to participate in creating comics. You don't need to do this, if all you want to do is read!</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Users collaborate to create <u><a href="/pages/characters">Characters</a></u>, <u><a href="/pages/props">Props</a></u> and <u><a href="/pages/scenes">Scenes</a></u>, which can then be used in comic strips.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Anyone can create a new comic strip in a comic to continue the story, one strip at a time.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Each strip needs a minimum vote count to be published. The vote count increases with each added strip.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Winning strips are permanently recorded on the blockchain, and available for anyone to read.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>The person who has contributed more than half of all the votes inside a comic is the owner of the IP of the comic at any time! They can create merch, movies, and monteize the comics in any way they choose.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Search Bar and Create Button */}
      <div className="sticky top-0 z-10 bg-white shadow-sm rounded-md p-4 mb-6 border border-[#d0d7de]">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search comics by theme or prompt..."
              className="w-full px-4 py-2 rounded-md border border-[#d0d7de] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#2da44e] border border-transparent rounded-md hover:bg-[#2c974b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2da44e]"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="mr-2">
              <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
            </svg>
            Create New
          </button>
        </div>
      </div>



      {/* Grid of Thumbnails */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredItems.map((item) => (
          <div>
            <div
              key={item._id}
              className="aspect-square rounded-md border border-[#d0d7de] overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer bg-white"
              onClick={() => handleItemClick(item)}
            >
              <div className="relative w-full h-full group">
                {/* Image */}
                <img
                  src={item.image}
                  alt={item.image}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="font-semibold">
                {item.name}
              </h3>
              <p className="text-sm text-[#57606a]">
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* No Results Message */}
      {filteredItems.length === 0 && (
        <div className="text-center text-[#57606a] mt-8">
          No comics found matching your search.
        </div>
      )}
    </div>
  );
}
