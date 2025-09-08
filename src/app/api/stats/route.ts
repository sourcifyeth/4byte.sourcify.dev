import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.OPENCHAIN_API_URL || 'https://api.openchain.xyz';

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/signature-database/v1/stats`);
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch from upstream API' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}