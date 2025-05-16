'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, IMAGE_GENERATION_PRICE } from '@/app/constants/contract';

export default function ImageGenerator({ onImageSelected, currentImage, artisticStyle, imageType }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generatedText, setGeneratedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(currentImage || null);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCharacters, setSelectedCharacters] = useState([]);
  const [selectedProps, setSelectedProps] = useState([]);
  const [selectedScenes, setSelectedScenes] = useState([]);
  const [searchType, setSearchType] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const { address } = useAccount();

  // Contract write hook for payment
  const { writeContractAsync, data: hash, error: writeError } = useWriteContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS
  });

  const { data: receipt, isLoading: isTransactionPending } = useWaitForTransactionReceipt({
    hash,
  });

  // Handle character/prop/scene search
  const handlePromptChange = async (e) => {
    const value = e.target.value;
    setPrompt(value);

    // Check for @, #, or * mention
    const lastWord = value.split(' ').pop();
    if (lastWord.startsWith('@')) {
      const searchTerm = lastWord.substring(1);
      if (searchTerm.length > 0) {
        try {
          const response = await axios.get(`/api/characters?search=${searchTerm}`);
          setSearchResults(response.data);
          setShowSearch(true);
          setSearchType('character');
        } catch (error) {
          console.error('Error searching characters:', error);
        }
      }
    } else if (lastWord.startsWith('#')) {
      const searchTerm = lastWord.substring(1);
      if (searchTerm.length > 0) {
        try {
          const response = await axios.get(`/api/props?search=${searchTerm}`);
          setSearchResults(response.data);
          setShowSearch(true);
          setSearchType('prop');
        } catch (error) {
          console.error('Error searching props:', error);
        }
      }
    } else if (lastWord.startsWith('*')) {
      const searchTerm = lastWord.substring(1);
      if (searchTerm.length > 0) {
        try {
          const response = await axios.get(`/api/scenes?search=${searchTerm}`);
          setSearchResults(response.data);
          setShowSearch(true);
          setSearchType('scene');
        } catch (error) {
          console.error('Error searching scenes:', error);
        }
      }
    } else {
      setShowSearch(false);
      setSearchType(null);
    }
  };

  // Handle search bar input
  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.length > 0) {
      try {
        let endpoint = '';
        switch (searchType) {
          case 'character':
            endpoint = `/api/characters?search=${value}`;
            break;
          case 'prop':
            endpoint = `/api/props?search=${value}`;
            break;
          case 'scene':
            endpoint = `/api/scenes?search=${value}`;
            break;
        }
        const response = await axios.get(endpoint);
        setSearchResults(response.data);
        setShowSearch(true);
      } catch (error) {
        console.error(`Error searching ${searchType}s:`, error);
      }
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  };

  // Handle search type selection
  const handleSearchTypeSelect = (type) => {
    setSearchType(type);
    setShowSearchBar(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Handle character/prop/scene selection
  const handleItemSelect = (item) => {
    // Add the item's name to the text box
    const itemName = item.name.replace(/_/g, ' ');
    setPrompt(prevPrompt => {
      // If the prompt is empty, just add the name
      if (!prevPrompt.trim()) {
        return itemName;
      }
      // If the prompt doesn't end with a space, add one
      if (!prevPrompt.endsWith(' ')) {
        return `${prevPrompt} ${itemName}`;
      }
      // Otherwise just append the name
      return `${prevPrompt}${itemName}`;
    });

    if (searchType === 'character') {
      if (!selectedCharacters.find(c => c._id === item._id)) {
        setSelectedCharacters([...selectedCharacters, item]);
      }
    } else if (searchType === 'prop') {
      if (!selectedProps.find(p => p._id === item._id)) {
        setSelectedProps([...selectedProps, item]);
      }
    } else if (searchType === 'scene') {
      if (!selectedScenes.find(s => s._id === item._id)) {
        console.log("Adding scene: ", item);
        setSelectedScenes([item]);
      }
    }
    setShowSearchBar(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const generateImage = async () => {
    try {
      setIsLoading(true);
      setError('');

      if (!address) {
        setError('Please connect your wallet first');
        return;
      }

      // First, make the payment
      const value = ethers.parseEther(IMAGE_GENERATION_PRICE);
      const tx = await writeContractAsync({
        abi: CONTRACT_ABI,
        address: CONTRACT_ADDRESS,
        functionName: 'payForPrompt',
        value,
      });

      // After payment is confirmed, generate the image
      let generatedImage = null;
      let generatedText = null;
      if(imageType === "character"){
        console.log("Generating character image");
        const response = await axios.post('/api/generate-image/characters', {
          name: " ",
          description: prompt,
          style: artisticStyle,
        });
        console.log(response.data);
        generatedImage = response.data.character.image;
        generatedText = "";
      } else if(imageType === "prop") {
        const response = await axios.post('/api/generate-image/props', {
          name: " ",
          description: prompt,
          style: artisticStyle,
        });
        console.log(response.data);
        generatedImage = response.data.prop.image;
        generatedText = "";

      } else if(imageType === "comic"){
        console.log("Selected props: ", selectedProps);
        const response = await axios.post('/api/generate-image', {
          prompt,
          comic : {
            name : "",
            style : artisticStyle,
            characters: selectedCharacters.map(c => ({name : c.name, portraitUrl: c.image })),
          },
          props: selectedProps.map(p => ({name : p.name, imageUrl: p.image })),
          scene: selectedScenes.length > 0 ? { name: selectedScenes[0].name, imageUrl: selectedScenes[0].image } : null
        });
        console.log(response.data);
        generatedImage = response.data.image;
        generatedText = response.data.text;

      } else if(imageType === "scene"){
        const response = await axios.post('/api/generate-image/scenes', {
          name: " ",
          description: prompt,
          style: artisticStyle,
        });
        console.log(response.data);
        generatedImage = response.data.image;
        generatedText = response.data.text;
        console.log(generatedImage);
        console.log(generatedText);
      }else {
        console.log("Generating comic image");
        console.log(selectedScenes);
        const response = await axios.post('/api/generate-image', {
          prompt,
          comic : {
            name : "",
            style : artisticStyle,
            characters: selectedCharacters.map(c => ({name : c.name, portraitUrl: c.image })),
            props: selectedProps.map(p => ({name : p.name, portraitUrl: p.image })),
            scene: selectedScenes.length > 0 ? { name: selectedScenes[0].name, imageUrl: selectedScenes[0].image } : null
          }
        });
        console.log(response.data);
        generatedImage = response.data.image;
        generatedText = response.data.text;
      }

      setGeneratedImage(generatedImage);
      if (generatedText) {
        setGeneratedText(generatedText);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      setError(error.message || 'Failed to generate image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseImage = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Clear selected items
      setSelectedCharacters([]);
      setSelectedProps([]);
      setSelectedScenes([]);
      setPrompt('');

      // Convert base64 to blob
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const file = new File([blob], 'generated-image.png', { type: 'image/png' });

      // Upload to backend
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imageUrl = uploadResponse.data.url;
      setSelectedImage(imageUrl);
      onImageSelected(imageUrl);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {selectedImage ? (
        <div className="relative group w-48 h-48">
          <img
            src={selectedImage}
            alt="Selected"
            className="w-full h-full object-cover rounded-lg"
          />
          <button
            onClick={() => {
              setGeneratedImage(selectedImage);
              setIsDialogOpen(true);
            }}
            className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-800 px-3 py-1 rounded-md text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Edit
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsDialogOpen(true)}
          className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-600"
        >
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span className="mt-2 block text-sm font-medium">Add Image</span>
          </div>
        </button>
      )}

      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Generate Image</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={handlePromptChange}
                  placeholder="Describe the image you want to generate..."
                  className="w-full h-32 p-3 border rounded-md"
                  rows={4}
                />
              </div>

              {/* Add Character/Prop/Scene Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleSearchTypeSelect('character')}
                  className="flex-1 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                  Add Character
                </button>
                <button
                  onClick={() => handleSearchTypeSelect('prop')}
                  className="flex-1 px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                >
                  Add Prop
                </button>
                <button
                  onClick={() => handleSearchTypeSelect('scene')}
                  className="flex-1 px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200"
                >
                  Add Scene
                </button>
              </div>

              {/* Search Bar */}
              {showSearchBar && (
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder={`Search ${searchType}s...`}
                    className="w-full px-4 py-2 border rounded-md"
                  />
                  {showSearch && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-10">
                      {searchResults.map((item) => (
                        <div
                          key={item._id}
                          onClick={() => handleItemSelect(item)}
                          className="p-2 hover:bg-gray-100 cursor-pointer flex items-center space-x-2"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <span>{item.name.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Items Display */}
              {(selectedCharacters.length > 0 || selectedProps.length > 0 || selectedScenes.length > 0) && (
                <div className="space-y-2">
                  {selectedCharacters.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedCharacters.map((character) => (
                        <div
                          key={character._id}
                          className="flex items-center space-x-1 bg-blue-100 px-2 py-1 rounded-full"
                        >
                          <img
                            src={character.image}
                            alt={character.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span className="text-sm">{character.name.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedProps.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedProps.map((prop) => (
                        <div
                          key={prop._id}
                          className="flex items-center space-x-1 bg-green-100 px-2 py-1 rounded-full"
                        >
                          <img
                            src={prop.image}
                            alt={prop.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span className="text-sm">{prop.name.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedScenes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedScenes.map((scene) => (
                        <div
                          key={scene._id}
                          className="flex items-center space-x-1 bg-purple-100 px-2 py-1 rounded-full"
                        >
                          <img
                            src={scene.image}
                            alt={scene.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span className="text-sm">{scene.name.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={generateImage}
                  disabled={isLoading || isTransactionPending || !prompt || !address}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading || isTransactionPending ? 'Processing...' : `Generate (${IMAGE_GENERATION_PRICE} ETH)`}
                </button>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>

              {generatedText && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <p className="text-gray-700 whitespace-pre-wrap">{generatedText}</p>
                </div>
              )}

              {generatedImage && (
                <div className="mt-4">
                  <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                    <img
                      src={generatedImage}
                      alt="Generated"
                      className="absolute inset-0 w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={handleUseImage}
                      disabled={isLoading}
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-800 px-3 py-1 rounded-md text-sm font-medium"
                    >
                      Use
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 