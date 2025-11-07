# Blad Gamet

A Next.js application with Web3 and Farcaster integration.

## Tech Stack

- **Next.js** 15.3.4 - React framework
- **React** 19.0.0 - UI library
- **TypeScript** 5 - Type safety
- **Wagmi** 2.16.3 - React Hooks for Ethereum
- **Viem** 2.31.6 - TypeScript Ethereum library
- **OnchainKit** - Coinbase Web3 UI components
- **Farcaster** - Social protocol integration
- **TanStack Query** 5.81.5 - Data fetching and state management

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
.
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
├── public/             # Static assets
├── next.config.js      # Next.js configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh)
- [Farcaster Documentation](https://docs.farcaster.xyz)

