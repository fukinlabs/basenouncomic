"use client";

import NFTViewClient from "./NFTViewClient";

export default async function NFTViewPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;

  return <NFTViewClient tokenId={tokenId} />;
}

