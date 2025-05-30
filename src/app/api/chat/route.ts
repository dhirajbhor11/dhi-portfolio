
import { streamChat, type StreamChatInput } from '@/ai/flows/streaming-responses';
import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

// Helper to simulate streaming for a non-streaming AI response
function simulateStream(text: string, delay = 20): ReadableStream<Uint8Array> {
  let charIndex = 0;
  const encoder = new TextEncoder();

  return new ReadableStream({
    async pull(controller) {
      if (charIndex < text.length) {
        const char = text[charIndex++];
        controller.enqueue(encoder.encode(char));
        // Simulate delay between characters
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        controller.close();
      }
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate the user
    const authorizationHeader = req.headers.get('Authorization');
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return NextResponse.json({ detail: 'Unauthorized: Missing or invalid token' }, { status: 401 });
    }
    const idToken = authorizationHeader.split('Bearer ')[1];

    try {
      if (!adminAuth) {
        console.error("/api/chat: Firebase Admin SDK not initialized. Cannot verify token.");
        return NextResponse.json({ detail: 'Internal server error: Admin SDK not available' }, { status: 500 });
      }
      await adminAuth.verifyIdToken(idToken);
      // If verifyIdToken succeeds, the user is authenticated.
      // You can access decodedToken.uid if needed.
    } catch (authError: any) {
      console.error('Firebase token verification failed:', authError);
      // Provide a more specific error message if available from Firebase Admin SDK
      const errorMessage = authError.code ? `Unauthorized: ${authError.code}` : 'Unauthorized: Invalid token';
      return NextResponse.json({ detail: errorMessage }, { status: 403 });
    }

    const { message } = (await req.json()) as { message: string };

    if (!message) {
      return NextResponse.json({ detail: 'Message is required' }, { status: 400 });
    }

    // Load portfolio data from the markdown file
    const filePath = path.join(process.cwd(), 'src', 'data', 'portfolio-data.md');
    const portfolioData = await fs.readFile(filePath, 'utf-8');

    const input: StreamChatInput = {
      message,
      portfolioData,
    };

    // Call the AI flow (which is currently non-streaming)
    const aiOutput = await streamChat(input);
    const aiResponseText = aiOutput.response;

    // Simulate streaming of the AI's response
    const stream = simulateStream(aiResponseText);

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    let errorMessage = 'An internal server error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ detail: errorMessage }, { status: 500 });
  }
}
