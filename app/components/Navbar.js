'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletComponents } from './WalletComponents';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter(Boolean);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Breadcrumbs */}
          <div className="flex items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-900">WorldComics</span>
            </Link>

            {/* Breadcrumbs - Hidden on mobile */}
            {pathSegments.length > 0 && (
              <div className="ml-4 hidden md:flex items-center">
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <Link href="/" className="hover:text-gray-700">
                    Home
                  </Link>
                  {pathSegments.map((segment, index) => (
                    <div key={segment} className="flex items-center">
                      <span className="mx-2">/</span>
                      <Link
                        href={`/${pathSegments.slice(0, index + 1).join('/')}`}
                        className="hover:text-gray-700 capitalize"
                      >
                        {segment}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right side - Navigation and Sign In */}
          <div className="flex items-center">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <Link
                href="/pages/props"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Props
              </Link>
              <Link
                href="/pages/characters"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Characters
              </Link>
              <Link
                href="/explore"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Explore
              </Link>
              <Link
                href="/create"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Create
              </Link>
              <WalletComponents />
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={toggleMenu}
                className="p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {isMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {/* Mobile Breadcrumbs */}
              {pathSegments.length > 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Link href="/" className="hover:text-gray-700">
                      Home
                    </Link>
                    {pathSegments.map((segment, index) => (
                      <div key={segment} className="flex items-center">
                        <span className="mx-2">/</span>
                        <Link
                          href={`/${pathSegments.slice(0, index + 1).join('/')}`}
                          className="hover:text-gray-700 capitalize"
                        >
                          {segment}
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile Navigation Links */}
              <Link
                href="/pages/props"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Props
              </Link>
              <Link
                href="/pages/characters"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Characters
              </Link>
              <Link
                href="/explore"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Explore
              </Link>
              <Link
                href="/create"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Create
              </Link>
              
              {/* Mobile Wallet Component */}
              <div className="px-3 py-2">
                <WalletComponents />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 