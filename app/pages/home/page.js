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

  const filteredItems = comics.filter(item => true || 
    item.theme.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.prompt.toLowerCase().includes(searchQuery.toLowerCase())
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

      {/* Image Generator */}
      <div className="mb-6">
        <div className="bg-white rounded-md border border-[#d0d7de] p-6">
          <h2 className="text-xl font-semibold text-[#24292f] mb-4">Generate Comic Art</h2>
          <ImageGenerator 
            onImageSelected={(imageUrl) => {
              // Handle generated image if needed
            }}
          />
        </div>
      </div>

      {/* Grid of Thumbnails */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredItems.map((item) => (
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
              {/* Overlay with text */}
              <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-90 transition-all duration-200 flex flex-col justify-between p-4">
                <h3 className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {item.title}
                </h3>
                <div className="flex flex-col gap-2">
                  <span className="text-white text-sm bg-[#1f232826] bg-opacity-90 px-2 py-1 rounded-full self-start opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {item.comicId}
                  </span>
                  <span className="text-white text-sm bg-[#1f232826] bg-opacity-90 px-2 py-1 rounded-full self-start opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
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
