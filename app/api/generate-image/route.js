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

// Function to convert image to base64
async function imageToBase64(buffer) {
  return buffer.toString('base64');
}

export async function POST(request) {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const { prompt, comic, previousPanel, scene, props, txHash } = await request.json();
    console.log(prompt, comic, previousPanel, scene, props);
    
    if (!comic  || !comic.style || !comic.characters || !prompt) {
      return NextResponse.json(
        { error: 'Comic object with name, style, characters and prompt is required' },
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
        type: 'comic_panel_generation',
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

    // Validate that characters have portrait URLs
    if (!comic.characters.every(char => char.name)) {
      return NextResponse.json(
        { error: 'Each character must have a name' },
        { status: 400 }
      );
    }

    // Build a more detailed prompt that emphasizes using the reference images
    let detailedPrompt = `Create a comic panel in ${comic.style} style.

SCENE: ${prompt}

IMPORTANT: 
- Use the provided reference images for the characters exactly as they appear
- Do NOT add the comic title or any title text at the top of the image
${comic.characters.map((char, index) => `- Image ${index+1}: Use this as the exact appearance for ${char.name}`).join('\n')}

The character(s) should look identical to the reference images provided, with the same facial features, hairstyle, and clothing.
Do not include any title banner or comic name text in the image.`;

    console.log(`[${requestId}] Using prompt:`, detailedPrompt);

    // Collect character images
    const characterFiles = [];
    const referenceFiles = []; // For scene and props
    console.log(`[${requestId}] Starting image collection...`);
    
    // If we have a scene, add it to our reference files
    if (scene && scene.imageUrl) {
      try {
        console.log(`[${requestId}] Processing scene: ${scene.name}`);
        
        const imageBuffer = await fetchImageAsBuffer(scene.imageUrl);
        console.log(`[${requestId}] Scene image size: ${imageBuffer.length} bytes`);
        
        const sceneFile = new File(
          [imageBuffer], 
          'scene.png', 
          { type: 'image/png' }
        );
        
        // Add to our reference files
        referenceFiles.push(sceneFile);
        
        
        // Update the prompt to reference the scene
        detailedPrompt += `\n\nSCENE BACKGROUND:
- Use the provided scene image as the background setting
- Place the characters within this environment
- Maintain the lighting, perspective, and atmosphere of the scene`;
        
      } catch (error) {
        console.error(`[${requestId}] Error processing scene:`, error);
      }
    }
    
    // If we have props, add them to our reference files
    if (props && props.length > 0) {
      try {
        console.log(`[${requestId}] Processing ${props.length} props`);
        
        let propDetails = "\n\nPROPS:";
        
        for (let i = 0; i < props.length; i++) {
          const prop = props[i];
          if (prop.imageUrl) {
            const imageBuffer = await fetchImageAsBuffer(prop.imageUrl);
            console.log(`[${requestId}] Prop ${prop.name} image size: ${imageBuffer.length} bytes`);
            
            const propFile = new File(
              [imageBuffer], 
              `prop-${i}.png`, 
              { type: 'image/png' }
            );
            
            // Add to our reference files
            referenceFiles.push(propFile);
            
            
            // Add to prop details
            propDetails += `\n- Include the "${prop.name}" prop as shown in reference image`;
          }
        }
        
        // Update the prompt to reference the props
        detailedPrompt += propDetails;
        
      } catch (error) {
        console.error(`[${requestId}] Error processing props:`, error);
      }
    }
    
    // If we have a previous panel, add it to our character files first
    if (previousPanel) {
      try {
        console.log(`[${requestId}] Processing previous panel...`);
        
        // Check if it's a data URL or a path
        let imageBuffer;
        if (previousPanel.startsWith('data:image/')) {
          // It's a data URL
          const base64Data = previousPanel.split(',')[1];
          imageBuffer = Buffer.from(base64Data, 'base64');
        } else {
          // It's a path, fetch it
          imageBuffer = await fetchImageAsBuffer(previousPanel);
        }
        
        console.log(`[${requestId}] Previous panel image size: ${imageBuffer.length} bytes`);
        
        // Create a File object for the previous panel
        const previousPanelFile = new File(
          [imageBuffer], 
          'previous-panel.png', 
          { type: 'image/png' }
        );
        
        // Add to our files array (at the beginning to prioritize it)
        characterFiles.push(previousPanelFile);
        
        
        // Update the base prompt to reference the previous panel
        detailedPrompt = `Create a comic panel in ${comic.style} style that continues the previous scene.

SCENE: ${prompt}

IMPORTANT: 
- This panel is a continuation of the previous scene shown in the first reference image (previous-panel.png)
- Maintain the same location, background, and setting as shown in the previous panel
- Keep consistent lighting, colors, and perspective
- Only change the characters' poses and expressions to match the new action described
- Do NOT add the comic title or any title text at the top of the image
${comic.characters.map((char, index) => `- Character ${char.name}: Use reference image ${index+2} for their appearance`).join('\n')}

The character(s) should look identical to the reference images provided, with the same facial features, hairstyle, and clothing.
Do not include any title banner or comic name text in the image.`;
        
        console.log(`[${requestId}] Using continuity prompt:`, detailedPrompt);
      } catch (error) {
        console.error(`[${requestId}] Error processing previous panel:`, error);
        // Continue without the previous panel
      }
    }
    
    // Now collect character images as before
    for (const char of comic.characters) {
      console.log(`[${requestId}] Processing character: ${char.name}, URL: ${char.portraitUrl}`);
      
      if (char.portraitUrl && !char.portraitUrl.includes('REPLACE_WITH_REQUEST_ID')) {
        try {
          const imageBuffer = await fetchImageAsBuffer(char.portraitUrl);
          console.log(`[${requestId}] Fetched image buffer for ${char.name}, size: ${imageBuffer.length} bytes`);
          
          const file = new File([imageBuffer], `${char.name}.png`, { type: 'image/png' });
          console.log(`[${requestId}] Created File object for ${char.name}`);
          
          
          characterFiles.push(file);
        } catch (error) {
          console.error(`[${requestId}] Error processing ${char.name}:`, error);
        }
      }
    }

    // Combine all reference files
    const allFiles = [...referenceFiles, ...characterFiles];
    
    // If we have reference images, use the edits endpoint
    let response;
    if (allFiles.length > 0) {
      console.log(`[${requestId}] Using images/edits endpoint with ${allFiles.length} reference images`);
      
      try {
        // Create a more detailed prompt
        let enhancedPrompt = detailedPrompt;
        
        // Add character-specific descriptions
        for (let i = 0; i < comic.characters.length; i++) {
          // Calculate the correct index for character reference
          // If we have a previous panel, it's at index 0, so character indices start at 1
          const refIndex = previousPanel ? i + 1 : i;
          
          const char = comic.characters[i];
          if (char.portraitUrl && !char.portraitUrl.includes('REPLACE_WITH_REQUEST_ID')) {
            enhancedPrompt += `\n\nFor character "${char.name}": 
- Maintain EXACT facial features, hairstyle, and clothing as shown in reference image ${refIndex + 1}
- Ensure ${char.name}'s appearance is consistent with their reference portrait`;
          }
        }
        
        console.log(`[${requestId}] Enhanced prompt:`, enhancedPrompt);
        
        // Use the edits endpoint with all reference images
        response = await openai.images.edit({
          image: allFiles,
          prompt: enhancedPrompt,
          model: "gpt-image-1",
          n: 1,
          size: "1024x1024"
        });
        
      } catch (error) {
        console.error(`[${requestId}] Error with images/edits:`, error);
        // Fall back to standard generation
        console.log(`[${requestId}] Falling back to standard generation`);
        response = await openai.images.generate({
          prompt: enhancedPrompt || detailedPrompt,
          model: "gpt-image-1",
          n: 1,
          quality: "low",
          size: "1024x1024"
        });
      }
    } else {
      // If no character images, use the standard generations endpoint
      console.log(`[${requestId}] Using standard images/generations endpoint`);
      response = await openai.images.generate({
        prompt: detailedPrompt,
        model: "gpt-image-1",
        n: 1,
        quality: "low",
        size: "1024x1024"
      });
    }

    console.log(`[${requestId}] API response structure:`, {
      hasData: !!response.data,
      dataLength: response.data?.length,
      firstItemHasUrl: !!response.data?.[0]?.url,
      firstItemHasB64: !!response.data?.[0]?.b64_json,
      b64Length: response.data?.[0]?.b64_json?.length
    });

    // Process the response
    let imageData;
    if (response.data?.[0]?.url) {
      // If we got a URL, fetch the image
      const imageUrl = response.data[0].url;
      console.log(`[${requestId}] Got image URL: ${imageUrl}`);
      const imageBuffer = await fetchImageAsBuffer(imageUrl);
      imageData = await imageToBase64(imageBuffer);
      console.log(`[${requestId}] Converted URL to base64, length: ${imageData.length}`);
    } else if (response.data?.[0]?.b64_json) {
      // If we got base64 data directly
      imageData = response.data?.[0]?.b64_json;
      console.log(`[${requestId}] Got direct base64 data, length: ${imageData.length}`);
    } else {
      console.error(`[${requestId}] Unexpected response format - missing image data`);
      throw new Error('No image data in response');
    }
    
    // Validate the base64 data
    if (!imageData || typeof imageData !== 'string') {
      console.error(`[${requestId}] Invalid image data:`, imageData);
      throw new Error('Invalid image data received');
    }
    
    // Save the image
    const imagesDir = path.join(process.cwd(), 'public', 'generated-images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    try {
      const imageFilePath = path.join(imagesDir, `comic-panel-${requestId}.png`);
      fs.writeFileSync(imageFilePath, Buffer.from(imageData, 'base64'));
      console.log(`[${requestId}] Saved image to ${imageFilePath}`);
    } catch (error) {
      console.error(`[${requestId}] Error saving image:`, error);
      // Continue anyway to return the base64 data
    }
    
    // Return the response
    return NextResponse.json({
      image: `data:image/png;base64,${imageData}`,
      description: null,
      comic: {
        name: comic.name,
        style: comic.style,
        charactersUsed: comic.characters.map(char => char.name)
      },
      prompt: detailedPrompt,
      imagePath: `/generated-images/comic-panel-${requestId}.png`
    });
  } catch (error) {
    console.error(`[${requestId}] Error:`, error.message);
    return NextResponse.json(
      { error: `Failed to generate image: ${error.message}` },
      { status: 500 }
    );
  }
}