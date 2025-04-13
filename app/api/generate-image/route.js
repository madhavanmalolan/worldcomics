import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function POST(request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash-exp-image-generation',
      contents: prompt,
      config: {
        responseModalities: ['Text', 'Image']
      },
    });

    let base64Image = null;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        // Convert the image data to base64
        base64Image = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!base64Image) {
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({ image: base64Image });
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
} 