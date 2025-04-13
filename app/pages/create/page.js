'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useChainId } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import Step1ComicDetails from '@/app/components/create/Step1ComicDetails';
import Step2Characters from '@/app/components/create/Step2Characters';
import Step3CoverImage from '@/app/components/create/Step3CoverImage';

export default function CreatePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [comicId, setComicId] = useState(null);
  const { address } = useAccount();
  const chainId = useChainId();
  const router = useRouter();

  const handleStep1Complete = () => {
    setCurrentStep(2);
  };

  const handleStep2Complete = () => {
    setCurrentStep(3);
  };

  const handleStep3Complete = () => {

    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#f6f8fa] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg border border-[#d0d7de] p-6">
          <h1 className="text-2xl font-semibold text-[#24292f] mb-6">Create a new comic</h1>
          
          {!address && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Please connect your wallet to create a comic.
              </p>
            </div>
          )}
          
          {chainId !== baseSepolia.id && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Please connect to the Base Sepolia network to create a comic.
              </p>
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className={`flex items-center ${currentStep >= 1 ? 'text-[#0969da]' : 'text-[#57606a]'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-[#0969da] text-white' : 'bg-[#f6f8fa] border border-[#d0d7de]'}`}>
                  1
                </div>
                <span className="ml-2">Comic Details</span>
              </div>
              <div className={`flex-1 h-1 mx-4 ${currentStep >= 2 ? 'bg-[#0969da]' : 'bg-[#f6f8fa] border border-[#d0d7de]'}`}></div>
              <div className={`flex items-center ${currentStep >= 2 ? 'text-[#0969da]' : 'text-[#57606a]'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-[#0969da] text-white' : 'bg-[#f6f8fa] border border-[#d0d7de]'}`}>
                  2
                </div>
                <span className="ml-2">Characters</span>
              </div>
              <div className={`flex-1 h-1 mx-4 ${currentStep >= 3 ? 'bg-[#0969da]' : 'bg-[#f6f8fa] border border-[#d0d7de]'}`}></div>
              <div className={`flex items-center ${currentStep >= 3 ? 'text-[#0969da]' : 'text-[#57606a]'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-[#0969da] text-white' : 'bg-[#f6f8fa] border border-[#d0d7de]'}`}>
                  3
                </div>
                <span className="ml-2">Cover Image</span>
              </div>
            </div>
          </div>

          {currentStep === 1 && (
            <Step1ComicDetails 
              onNext={handleStep1Complete} 
              comicId={comicId} 
              setComicId={setComicId} 
            />
          )}

          {currentStep === 2 && (
            <Step2Characters 
              comicId={comicId} 
              onNext={handleStep2Complete} 
            />
          )}

          {currentStep === 3 && (
            <Step3CoverImage 
              comicId={comicId} 
              onNext={handleStep3Complete}
            />
          )}
        </div>
      </div>
    </div>
  );
}
