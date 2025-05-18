import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
    try {
        const body = await request.json();
        const { characterId, action, setting } = body;

        // Validate input
        if (!characterId || !action || !setting) {
            return NextResponse.json(
                { error: 'Character ID, action, and setting are required' },
                { status: 400 }
            );
        }

        console.log('Looking for character with ID:', characterId); // Debug log

        // Get character from database
        const character = await prisma.character.findUnique({
            where: { id: characterId }
        });

        console.log('Found character:', character); // Debug log

        if (!character) {
            return NextResponse.json(
                { error: 'Character not found' },
                { status: 404 }
            );
        }

        // First, analyze the reference image using GPT-4 Vision
        console.log('Analyzing image:', character.imageUrl); // Debug log

        const analysis = await openai.chat.completions.create({
            model: "gpt-4-vision-preview-1106",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analyze this character's appearance in detail. Describe their exact features, proportions, clothing, colors, and any distinctive characteristics that should be maintained for consistency."
                        },
                        {
                            type: "image_url",
                            image_url: character.imageUrl
                        }
                    ]
                }
            ],
            max_tokens: 500
        });

        console.log('Image analysis completed'); // Debug log

        // Use the detailed analysis to generate a new panel
        const panelPrompt = `Create a new comic panel.
            Character must be EXACTLY as analyzed: ${analysis.choices[0].message.content}
            
            Current scene:
            - Action: ${action}
            - Setting: ${setting}
            
            Important requirements:
            - Maintain perfect consistency with the reference character's appearance
            - Use high-quality comic book art style
            - Create clear, well-composed scene
            - Use dramatic lighting and dynamic poses
            - Ensure high detail and quality in the final image`;

        const panel = await openai.images.generate({
            prompt: panelPrompt,
            n: 1,
            size: "1024x1024",
            quality: "hd",
            style: "vivid"
        });

        return NextResponse.json({
            success: true,
            character: character.name,
            imageUrl: panel.data[0].url,
            action,
            setting,
            characterAnalysis: analysis.choices[0].message.content
        });
    } catch (error) {
        // Detailed error logging
        console.error('Full error details:', error);
        return NextResponse.json(
            { 
                error: 'Failed to generate comic panel',
                details: error.message,
                stack: error.stack
            },
            { status: 500 }
        );
    }
} 