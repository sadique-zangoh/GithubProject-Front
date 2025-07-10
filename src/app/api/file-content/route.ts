import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token, repo, branch, path } = await request.json();

    if (!token || !repo || !branch || !path) {
      return NextResponse.json({ error: 'GitHub token, repository, branch, and file path are required' }, { status: 400 });
    }

    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch file content' }, { status: response.status });
    }

    const data = await response.json();
    
    // Decode base64 content
    let content = '';
    if (data.content) {
      content = Buffer.from(data.content, 'base64').toString('utf-8');
    }
    
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error fetching file content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}