'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSwipeable } from 'react-swipeable'; // You'll need to install this package

export default function Feed() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [pages, setPages] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const comicId = params.id;

  useEffect(() => {
    loadComicPages();
  }, []);

  const loadComicPages = async (comicId) => {
    setIsLoading(true);
    try {
      // Generate dummy pages data
      const dummyPages = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        imageUrl: `https://source.unsplash.com/800x1200/?comic,manga,page${i}`,
        pageNumber: i + 1
      }));
      setPages(dummyPages);
    } catch (error) {
      console.error('Error loading comic pages:', error);
    } finally {
      setIsLoading(false);
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

  // ... existing generateFeedItems and other functions ...

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      {/* Header Bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-[#d0d7de] px-4 py-3">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4 text-[#24292f]">
            <span className="font-semibold">Comic Viewer</span>
            <span className="text-[#57606a]">•</span>
            <span className="text-[#57606a]">Page {currentPage} of {pages.length}</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={() => handleNavigation(`/comics/${comicId}/characters`)}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm text-[#24292f] hover:bg-[#f6f8fa] rounded-md transition-colors"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
              </svg>
              <span>Characters</span>
            </button>
            <button
              onClick={() => handleNavigation(`/comics/${comicId}/props`)}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm text-[#24292f] hover:bg-[#f6f8fa] rounded-md transition-colors"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
              </svg>
              <span>Props</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 hover:bg-[#f6f8fa] rounded-md transition-colors"
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M2.5 12a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5zm0-4a.5.5 0 01.5-.5h10a.5.5 0 010 1H3a.5.5 0 01-.5-.5z"/>
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-[#d0d7de] p-2">
            <button
              onClick={() => handleNavigation(`/comics/${comicId}/characters`)}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-[#24292f] hover:bg-[#f6f8fa] rounded-md transition-colors"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
              </svg>
              <span>Characters</span>
            </button>
            <button
              onClick={() => handleNavigation(`/comics/${comicId}/props`)}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-[#24292f] hover:bg-[#f6f8fa] rounded-md transition-colors"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
              </svg>
              <span>Props</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <div className="bg-white border border-[#d0d7de] rounded-md">
          <div className="relative flex items-center">
            {/* Left Navigation Button */}
            <div className="hidden md:block">
              <button
                onClick={() => navigatePage('prev')}
                className={`text-[#24292f] p-2 rounded hover:bg-[#f6f8fa] transition-colors absolute left-4 top-1/2 -translate-y-1/2 z-10 ${
                  currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={currentPage <= 1}
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z"/>
                </svg>
              </button>
            </div>

            {/* Image Container */}
            <div 
              className="relative w-full bg-white rounded-md overflow-hidden"
              {...swipeHandlers}
            >
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8">
                    <svg className="animate-spin" viewBox="0 0 16 16" fill="none">
                      <circle
                        className="opacity-25"
                        cx="8"
                        cy="8"
                        r="7"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M15 8a7 7 0 00-7-7v2a5 5 0 015 5h2z"
                      />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="relative mx-auto" style={{ 
                  width: 'min(80vh, 100%)',
                  height: 'min(80vh, 100%)',
                  maxWidth: '800px',
                  maxHeight: '800px',
                  aspectRatio: '1/1'
                }}>
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <img
                      src={pages[currentPage - 1]?.imageUrl || ''}
                      alt={`Page ${currentPage}`}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Navigation Button */}
            <div className="hidden md:block">
              <button
                onClick={() => navigatePage('next')}
                className={`text-[#24292f] p-2 rounded hover:bg-[#f6f8fa] transition-colors absolute right-4 top-1/2 -translate-y-1/2 z-10 ${
                  currentPage >= pages.length ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={currentPage >= pages.length}
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Bottom Navigation Bar */}
          <div className="border-t border-[#d0d7de] px-4 py-3 flex items-center justify-between bg-[#f6f8fa]">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(1)}
                className="px-3 py-1 text-sm border border-[#d0d7de] rounded-md bg-white hover:bg-[#f3f4f6] disabled:opacity-50"
                disabled={currentPage === 1}
              >
                First
              </button>
              <button
                onClick={() => navigatePage('prev')}
                className="px-3 py-1 text-sm border border-[#d0d7de] rounded-md bg-white hover:bg-[#f3f4f6] disabled:opacity-50"
                disabled={currentPage <= 1}
              >
                Previous
              </button>
              <button
                onClick={() => navigatePage('next')}
                className="px-3 py-1 text-sm border border-[#d0d7de] rounded-md bg-white hover:bg-[#f3f4f6] disabled:opacity-50"
                disabled={currentPage >= pages.length}
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(pages.length)}
                className="px-3 py-1 text-sm border border-[#d0d7de] rounded-md bg-white hover:bg-[#f3f4f6] disabled:opacity-50"
                disabled={currentPage === pages.length}
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}