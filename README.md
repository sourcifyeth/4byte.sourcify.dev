# 4byte.sourcify.dev

Ethereum function and event signature database interface for Sourcify verified contracts.

## Overview

A Next.js web interface for searching and looking up Ethereum function selectors and event signatures from the [OpenChain API](https://openchain.xyz). The database is built from Sourcify verified smart contracts.

## Features

- **Text search**: Use wildcards (`*`, `?`) to find function/event signatures
- **Hash lookup**: Search by 4-byte function selectors or 32-byte event hashes
- **Auto-detection**: Automatically determines search type based on input format
- **Copy to clipboard**: Easy copying of signatures and hashes
- **Statistics**: Live count of functions and events in the database

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Static Export

Build static files for deployment:

```bash
npm run build
```

Generated files will be in the `out` directory.

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```
NEXT_PUBLIC_OPENCHAIN_API_URL=https://api.openchain.xyz
NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id
```