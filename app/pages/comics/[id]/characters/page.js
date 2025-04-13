'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function CharactersPage() {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [price, setPrice] = useState('0.1'); // Default price in ETH
  const [selectedImage, setSelectedImage] = useState(null);
  const params = useParams();
  const comicId = params.id;

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await fetch(`/api/comics/${comicId}/characters`);
        if (!response.ok) {
          throw new Error('Failed to fetch characters');
        }
        const data = await response.json();
        setCharacters(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching characters:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacters();
  }, [comicId]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
      }
    };

    if (selectedImage) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [selectedImage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] p-6 flex items-center justify-center">
        <div className="text-[#57606a]">Loading characters...</div>
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
      <div className="max-w-7xl mx-auto">
        {/* Header Bar */}
        <div className="bg-white border border-[#d0d7de] rounded-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-[#24292f]">Characters</h1>
              <div className="flex items-center space-x-4 text-sm text-[#57606a]">
                <span className="flex items-center">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="mr-1">
                    <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
                  </svg>
                  {characters.length} characters
                </span>
                <span className="flex items-center">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="mr-1">
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM4.5 7.5a.5.5 0 000 1h5.793L8.146 10.354a.5.5 0 11-.708-.708l3-3a.5.5 0 010 .708l-3 3a.5.5 0 11-.708-.708L10.293 7.5H4.5z"/>
                  </svg>
                  {price} ETH to create
                </span>
              </div>
            </div>
            <button
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#2da44e] border border-transparent rounded-md hover:bg-[#2c974b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2da44e]"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="mr-2">
                <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
              </svg>
              Create new character
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {characters.map((character) => (
            <div
              key={character._id}
              className="bg-white border border-[#d0d7de] rounded-md overflow-hidden hover:shadow-md transition-all duration-200"
            >
              {/* Image Container */}
              <div 
                className="aspect-square relative group cursor-pointer"
                onClick={() => setSelectedImage(character.imageUrl)}
              >
                <img
                  src={character.imageUrl}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
                {/* Overlay with details */}
                <div className="absolute inset-0 bg-[#0969da] bg-opacity-0 group-hover:bg-opacity-90 transition-all duration-200 flex flex-col justify-between p-4">
                  <div>
                    <h3 className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {character.name}
                    </h3>
                    <p className="text-white text-sm mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 line-clamp-2">
                      {character.prompt}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-white text-xs bg-[#1f232826] bg-opacity-90 px-2 py-1 rounded-full self-start">
                      {character.creator? `${character.creator.slice(0, 6)}...${character.creator.slice(-4)}` : 'N/A'}
                    </span>
                    <a
                      href={`https://etherscan.io/tx/${character.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white text-xs bg-[#1f232826] bg-opacity-90 px-2 py-1 rounded-full self-start hover:bg-opacity-100 transition-colors"
                    >
                      View on Etherscan
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {characters.length === 0 && (
          <div className="bg-white border border-[#d0d7de] rounded-md p-8 text-center">
            <div className="text-[#57606a]">No characters found for this comic.</div>
          </div>
        )}

        {/* Image Modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-7xl w-full h-full flex items-center justify-center">
              <img
                src={selectedImage}
                alt="Full size character"
                className="max-h-[90vh] max-w-full object-contain"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
