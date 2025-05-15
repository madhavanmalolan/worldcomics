'use client';

import React, { useState, useEffect } from 'react';
import ImageGenerator from '@/app/components/ImageGenerator';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import contracts from '@/app/constants/contracts.json';
import { admin } from '@/app/constants/addresses.json';
import axios from 'axios';

export default function PropsPage() {
  const [propName, setPropName] = useState('');
  const [propImage, setPropImage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [props, setProps] = useState([]);
  const { address, isConnected } = useAccount();

  // Get Props contract address from Admin
  const adminAddress = admin;

  const { data: propsAddress, isLoading: isLoadingAddress, error: addressError } = useReadContract({
    address: adminAddress,
    abi: contracts.admin.abi,
    functionName: 'getPropsAddress',
  });
  console.log("props address", propsAddress);
  console.log("isLoadingAddress", isLoadingAddress);
  console.log("addressError", addressError);

  // Get the current mint price
  const { data: mintPrice, isLoading: isLoadingPrice, error: priceError } = useReadContract({
    address: propsAddress,
    abi: contracts.props.abi,
    functionName: 'getMintPrice',
    query: {
      enabled: !!propsAddress,
    }
  });
  console.log("mint price", mintPrice);
  console.log("isLoadingPrice", isLoadingPrice);
  console.log("priceError", priceError);


  // Prepare the mint prop transaction
  const { writeContractAsync: mintProp, data: mintData } = useWriteContract();

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: mintData?.hash,
  });

  // Refresh props when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      const fetchProps = async () => {
        try {
          const response = await axios.get('/api/props');
          setProps(response.data);
        } catch (error) {
          console.error('Error fetching props:', error);
        }
      };
      fetchProps();
    }
  }, [isConfirmed]);

  // Fetch props on component mount
  useEffect(() => {
    const fetchProps = async () => {
      try {
        const response = await axios.get('/api/props');
        setProps(response.data);
      } catch (error) {
        console.error('Error fetching props:', error);
      }
    };

    fetchProps();
  }, []);

  const handleNameChange = (e) => {
    const value = e.target.value;
    const formattedName = value
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, '_');
    setPropName(formattedName);
  };

  const handleSaveProp = async () => {
    if (!propName || !propImage) {
      alert('Please provide both a name and an image for the prop');
      return;
    }

    if (!isConnected) {
      alert('Please connect your wallet to save a prop');
      return;
    }

    if (!propsAddress) {
      alert('Could not get Props contract address');
      return;
    }

    if (mintPrice === undefined) {
      alert('Could not get mint price');
      return;
    }

    setIsSaving(true);
    try {
      const tx = await mintProp({
        address: propsAddress,
        abi: contracts.props.abi,
        functionName: 'mintProp',
        args: [propName, propImage],
        value: mintPrice,
      });

      console.log('Transaction:', tx);
      console.log("Props Address:", propsAddress);
      setTxHash(tx);

      // Call the API route to save the prop
      const response = await axios.post('/api/props', { txHash: tx, name: propName, image: propImage }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('API Response:', response.data);
      window.location.reload();
      // Reset form
      setPropName('');
      setPropImage('');
    } catch (error) {
      console.error('Error saving prop:', error);
      alert('Failed to save prop. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  console.log(!propName , !propImage , !isConnected, isSaving ,mintPrice === undefined)

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Prop Creation Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Add a Prop</h2>
          
          {!isConnected && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Please connect your wallet to create a prop.
              </p>
            </div>
          )}

          {txHash && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                Transaction sent! Hash: {txHash}
                {isConfirming && ' (Confirming...)'}
                {isConfirmed && ' (Confirmed!)'}
              </p>
            </div>
          )}

          <div className="space-y-6">
            {/* Name Input */}
            <div>
              <label htmlFor="propName" className="block text-sm font-medium text-gray-700 mb-1">
                Prop Name
              </label>
              <input
                type="text"
                id="propName"
                value={propName}
                onChange={handleNameChange}
                placeholder="Enter prop name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Name will be converted to lowercase with underscores (e.g., "magic_sword")
              </p>
            </div>

            {/* Image Generator */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prop Image
              </label>
              <ImageGenerator 
                imageType="prop"
                onImageSelected={(imageUrl) => setPropImage(imageUrl)}
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveProp}
              disabled={!propName || !propImage || !isConnected || isSaving || mintPrice === undefined}
              className={`w-full px-4 py-2 text-white rounded-md ${
                (!propName || !propImage || !isConnected || isSaving || mintPrice === undefined)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Prop'}
            </button>
          </div>
        </div>

        {/* Props Grid */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">All Props</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {props.map((prop) => (
              <div key={prop._id} className="bg-gray-50 rounded-lg overflow-hidden shadow-sm">
                <img 
                  src={prop.image} 
                  alt={prop.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {prop.name.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Created: {new Date(prop.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
