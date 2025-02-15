import { NextResponse } from 'next/server';

const OPENAI_API_URL =
  process.env.OPENAI_WEBRTC_API_URL || 'https://api.openai.com/v1/realtime';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: Request) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Missing OpenAI API key in environment variables' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { sdp } = body;

    if (!sdp) {
      return NextResponse.json(
        { error: 'SDP offer is required' },
        { status: 400 }
      );
    }

    const instructions = `
      You are an expert AI assistant.
      Introduce youself and answer the user with their questions.
    `;

    const requestUrl = new URL(OPENAI_API_URL);
    requestUrl.searchParams.set('model', 'gpt-4o-realtime-preview-2024-12-17');
    requestUrl.searchParams.set('instructions', instructions.trim());
    requestUrl.searchParams.set('voice', 'verse'); //ash

    const response = await fetch(requestUrl.toString(), {
      method: 'POST',
      body: sdp,
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/sdp',
      },
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status}`);
      return NextResponse.json(
        { error: 'Failed to connect to OpenAI API' },
        { status: response.status }
      );
    }

    const remoteSdp = await response.text();
    return new Response(remoteSdp, {
      headers: { 'Content-Type': 'application/sdp' },
    });
  } catch (error) {
    console.error('Error creating WebRTC connection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
