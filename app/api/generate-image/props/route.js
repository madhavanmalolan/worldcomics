import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { File } from 'formdata-node';
import { ethers } from 'ethers';
import contracts from '@/app/constants/contracts.json';
import addresses from '@/app/constants/addresses.json';
import { getDatabase } from '@/app/lib/db';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Function to fetch image and convert to base64
async function fetchImageAsBuffer(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error fetching image:', error);
    throw new Error('Failed to fetch image');
  }
}

// Function to save image to file
async function saveImageToFile(imageData, requestId, prefix = 'prop') {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Create a dedicated folder for generated images if it doesn't exist
    const imagesDir = path.join(process.cwd(), 'public', 'generated-images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    // Save base64 image
    const base64FilePath = path.join(imagesDir, `${prefix}-${requestId}.txt`);
    fs.writeFileSync(base64FilePath, imageData);
    console.log(`Saved base64 to: ${base64FilePath}`);
    
    // Save actual image
    const imageFilePath = path.join(imagesDir, `${prefix}-${requestId}.png`);
    fs.writeFileSync(imageFilePath, Buffer.from(imageData, 'base64'));
    console.log(`Saved PNG to: ${imageFilePath}`);
    
    return {
      base64Path: `/generated-images/${prefix}-${requestId}.txt`,
      imagePath: `/generated-images/${prefix}-${requestId}.png`,
      publicUrl: `/generated-images/${prefix}-${requestId}.png` // URL for browser access
    };
  } catch (err) {
    console.error(`Error saving files:`, err.message);
    throw new Error('Failed to save image files');
  }
}

export async function POST(request) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    // Get content type
    const contentType = request.headers.get('content-type') || '';
    let name, description, style, txHash;
    console.log("Getting tx hash");
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      console.log(formData);
      name = formData.get('name');
      description = formData.get('description');
      style = formData.get('style');
      txHash = formData.get('txHash');
    } else {
      // Assume JSON
      const json = await request.json();
      console.log(json);
      name = json.name;
      description = json.description;
      style = json.style;
      txHash = json.txHash;
    }
    console.log("Got tx hash :", txHash);
    console.log(`[${requestId}] Received prop request:`, { name, description, style });
    
    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    if (!txHash) {
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    // Check if transaction hash has been used before
    const db = await getDatabase();
    const existingTx = await db.collection('processedTransactions'+ process.env.DATABASE_VERSION).findOne({ txHash });
    
    if (existingTx) {
      console.log('Transaction hash already used');
      return NextResponse.json(
        { error: 'Transaction hash has already been used' },
        { status: 400 }
      );
    }

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    
    // Wait for transaction to be confirmed
    let receipt;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between attempts
      attempts++;
    }

    if (!receipt) {
      console.log('Transaction not found or not confirmed');
      return NextResponse.json(
        { error: 'Transaction not found or not confirmed' },
        { status: 404 }
      );
    }

    if (!receipt.status) {
      console.log('Transaction failed');
      return NextResponse.json(
        { error: 'Transaction failed' },
        { status: 400 }
      );
    }

    // Create Admin contract interface for decoding
    const adminContract = new ethers.Contract(
      addresses.admin,
      contracts.admin.abi,
      provider
    );

    try {
      console.log('\n=== Transaction Details ===');
      console.log('Transaction hash:', receipt.transactionHash);
      console.log('From:', receipt.from);
      console.log('To:', receipt.to);
      console.log('Data:', receipt.data);

      console.log('\n=== All Events ===');
      let promptPaidEvent = null;
      
      for (const log of receipt.logs) {
        console.log('\nEvent Log:');
        console.log('Address:', log.address);
        console.log('Topics:', log.topics);
        console.log('Data:', log.data);
        
        // Try to decode the event using the admin contract interface
        try {
          const decodedLog = adminContract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          console.log('Decoded Event:', decodedLog);
          
          // Check if this is the PromptPaid event
          if (decodedLog.name === 'PromptPaid') {
            promptPaidEvent = decodedLog;
          }
        } catch (e) {
          console.log('Could not decode with admin contract interface');
        }
      }

      if (!promptPaidEvent) {
        console.log('No PromptPaid event found');
        return NextResponse.json(
          { error: 'No PromptPaid event found' },
          { status: 400 }
        );
      }

      // Verify the PromptPaid event parameters
      // PromptPaid(address indexed user, uint256 amount)
      const [eventUser, eventAmount] = promptPaidEvent.args;
      
      // Get the current prompt price from the contract
      const promptPrice = await adminContract.PROMPT_PRICE();
      
      if (eventAmount < promptPrice) {
        console.log('Payment amount is less than required');
        return NextResponse.json(
          { error: 'Payment amount is less than required' },
          { status: 400 }
        );
      }

      // Store the transaction hash as processed
      await db.collection('processedTransactions'+ process.env.DATABASE_VERSION).insertOne({
        txHash,
        type: 'prop_generation',
        createdAt: new Date(),
        user: eventUser,
        amount: eventAmount.toString()
      });

    } catch (error) {
      console.error('Error decoding transaction:', error);
      return NextResponse.json(
        { error: 'Invalid transaction data' },
        { status: 400 }
      );
    }

    const propStyle = style || "Detailed, realistic object";
    
    // Create a prompt specifically for prop generation
    const propPrompt = `Create a detailed image of a "${name}" object with the following description: ${description}

Style: ${propStyle}

Important details:
- This should be a standalone object with a transparent or simple background
- Show the object from its most recognizable angle
- Include appropriate details, textures, and lighting
- Make the object detailed enough to be used as a prop in different scenes
- Do not include any text labels or title in the image
- The object should appear to be at a realistic scale`;

    console.log(`[${requestId}] Using prop prompt:`, propPrompt);

    // Generate the prop image
    const response = await openai.images.generate({
      prompt: propPrompt,
      model: "gpt-image-1",
      n: 1,
      quality: "low",
      size: "1024x1024"
    });

    // Process the response
    let imageData = null;
    
    // Check for b64_json in the response
    if (response.data?.[0]?.b64_json) {
      console.log(`[${requestId}] Found base64 image data in response`);
      imageData = response.data[0].b64_json;
    }
    // Check for URL in the response
    else if (response.data?.[0]?.url) {
      console.log(`[${requestId}] Found image URL in response`);
      const imageUrl = response.data[0].url;
      
      // Fetch the image and convert to base64
      const imageBuffer = await fetchImageAsBuffer(imageUrl);
      imageData = imageBuffer.toString('base64');
    }
    else {
      console.error(`[${requestId}] No image data found in response:`, response);
      throw new Error('No image data in response');
    }
    
    // Save files and get paths
    const paths = await saveImageToFile(imageData, requestId, 'prop');
    
    return NextResponse.json({ 
      prop: {
        id: requestId,
        name,
        description,
        style: propStyle,
        image: `data:image/png;base64,${imageData}`,
        imagePath: paths.imagePath,
        base64Path: paths.base64Path
      }
    });

  } catch (error) {
    console.error(`[${requestId}] Prop generation error:`, error.message);
    return NextResponse.json(
      { error: `Failed to generate prop: ${error.message}` },
      { status: 500 }
    );
  }
} 