import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { File } from 'formdata-node';

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
    const { name, description, style } = await request.json();
    
    console.log(`[${requestId}] Received prop request:`, { name, description, style });
    
    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
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