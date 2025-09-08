import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.OPENCHAIN_API_URL || 'https://api.openchain.xyz';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/signature-database/v1/search?query=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch from upstream API' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}