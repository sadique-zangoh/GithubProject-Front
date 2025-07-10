import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token, repo } = await request.json();

    if (!token || !repo) {
      return NextResponse.json({ error: 'GitHub token and repository are required' }, { status: 400 });
    }

    const response = await fetch(`https://api.github.com/repos/${repo}/branches`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch branches' }, { status: response.status });
    }

    const branches = await response.json();
    
    return NextResponse.json({ branches });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}