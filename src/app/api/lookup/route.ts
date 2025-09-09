import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.SOURCIFY_SERVER_URL || "https://sourcify.dev/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const functionHash = searchParams.get("function");
  const event = searchParams.get("event");

  // Check that we have either function or event parameter
  if (!functionHash && !event) {
    return NextResponse.json({ error: "Either function or event parameter is required" }, { status: 400 });
  }

  try {
    let apiUrl: string;

    if (functionHash) {
      // Function lookup
      apiUrl = `${API_BASE_URL}/signature-database/v1/lookup?function=${encodeURIComponent(functionHash)}`;
    } else if (event) {
      // Event lookup
      apiUrl = `${API_BASE_URL}/signature-database/v1/lookup?event=${encodeURIComponent(event)}`;
    } else {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const response = await fetch(apiUrl);

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch from upstream API" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Lookup API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
