'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function CandidateGallery({ onSelect }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await fetch('/api/comics/candidates');
      if (!response.ok) {
        throw new Error('Failed to fetch candidates');
      }
      const data = await response.json();
      setCandidates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading candidates...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">Error: {error}</div>;
  }

  if (candidates.length === 0) {
    return <div className="text-center p-4">No candidates available</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {candidates.map((candidate) => (
        <div
          key={candidate._id}
          className="border rounded-lg overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => onSelect(candidate)}
        >
          <div className="relative aspect-[3/4]">
            <Image
              src={candidate.imageUrls[0]}
              alt={`Candidate page ${candidate.pageNumber}`}
              fill
              className="object-cover"
            />
            {candidate.imageUrls.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                +{candidate.imageUrls.length - 1} more
              </div>
            )}
          </div>
          <div className="p-2 bg-white">
            <p className="text-sm text-gray-600">
              Page {candidate.pageNumber} - {new Date(candidate.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
} 