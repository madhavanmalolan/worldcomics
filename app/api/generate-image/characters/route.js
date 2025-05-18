import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import contracts from '@/app/constants/contracts.json';
import addresses from '@/app/constants/addresses.json';
import { getDatabase } from '@/app/lib/db';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Add the missing imageUrlToBase64 function
async function imageUrlToBase64(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (error) {
    console.error('Error converting image:', error);
    throw new Error('Failed to process image URL');
  }
}

async function saveImageToFile(imageData, requestId, prefix = 'character') {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Create a dedicated folder for generated images if it doesn't exist
    const imagesDir = path.join(process.cwd(), 'public', 'uploads');
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
      base64Path: `/uploads/${prefix}-${requestId}.txt`,
      imagePath: `/uploads/${prefix}-${requestId}.png`,
      publicUrl: `/uploads/${prefix}-${requestId}.png` // URL for browser access
    };
  } catch (err) {
    console.error(`Error saving files:`, err.message);
    throw new Error('Failed to save image files');
  }
}

export async function POST(request) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const { name, description, style, txHash } = await request.json();
    
    console.log(`[${requestId}] Received request:`, { name, description, style });
    
    if (!name || !description || !style) {
      return NextResponse.json(
        { error: 'Name, description and style are required' },
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
        type: 'character_generation',
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

    const characterPrompt = `Create a character reference sheet for "${name}" with the following description: ${description}

The image should be split into two parts:
1. LEFT SIDE: A full-body standing view showing the entire character, including their clothing and posture
2. RIGHT SIDE: A close-up portrait view of the character's face and shoulders

Style: ${style}

Important details:
- Make both views clearly of the same character with consistent features
- The full-body view should show the complete outfit and physical build
- The close-up view should focus on facial features, expression, and hair details
- Use a clean, simple background that doesn't distract from the character
- Do not include any text labels or title in the image`;

    console.log(`[${requestId}] Using prompt:`, characterPrompt);

    // Use a wider aspect ratio to accommodate both views
    const response = await openai.images.generate({
      prompt: characterPrompt,
      model: "gpt-image-1",
      n: 1,
      quality: "low",
      size: "1536x1024"  // Using a wider format (7:4 aspect ratio)
    });

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
      imageData = await imageUrlToBase64(imageUrl);
    }
    else {
      console.error(`[${requestId}] No image data found in response:`, response);
      throw new Error('No image data in response');
    }
    
    // Save files and get paths
    const paths = await saveImageToFile(imageData, requestId);
    
    return NextResponse.json({ 
      character: {
        id: requestId,
        name,
        description,
        style,
        image: `data:image/png;base64,${imageData}`,
        imagePath: paths.imagePath,
        base64Path: paths.base64Path,
        publicUrl: paths.publicUrl
      }
    });

  } catch (error) {
    console.error(`[${requestId}] Full error:`, {
      message: error.message,
      status: error.status,
      response: error.response,
      stack: error.stack
    });
    
    if (error.response) {
      console.error(`[${requestId}] API error details:`, {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    return NextResponse.json(
      { error: `Failed to generate character portrait: ${error.message}` },
      { status: 500 }
    );
  }
}
