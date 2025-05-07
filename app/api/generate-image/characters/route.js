import OpenAI from 'openai';
import { NextResponse } from 'next/server';

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
    const { name, description, style } = await request.json();
    
    console.log(`[${requestId}] Received request:`, { name, description, style });
    
    if (!name || !description || !style) {
      return NextResponse.json(
        { error: 'Name, description and style are required' },
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

    // The response is already a JavaScript object, no need to call .json()
   // console.log(`[${requestId}] API response:`, JSON.stringify(response, null, 2));
    
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
