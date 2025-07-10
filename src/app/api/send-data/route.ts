import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token, repository, branch, content } = await request.json();

    if (!token || !repository || !branch || !content) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Log the received data (you can replace this with your actual backend logic)
    console.log('Received data:', {
      token: token.substring(0, 10) + '...',  // Hide most of the token for security
      repository,
      branch,
      content, // Log the actual user message
      timestamp: new Date().toISOString(),
    });

    // Here you can add your actual backend logic to process the data
    // For example:
    // - Save to database
    // - Send to external API
    // - Process the content
    // - etc.

    // For now, we'll just return a success response
    return NextResponse.json({ 
      success: true, 
      message: 'Data received and processed successfully',
      data: {
        repository,
        branch,
        contentLength: content.length,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error processing send data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}