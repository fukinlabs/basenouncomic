"use client";

import NFTViewClient from "./NFTViewClient";

export default function NFTViewPage({
  params,
}: {
  params: { tokenId: string };
}) {
  const { tokenId } = params;

  return <NFTViewClient tokenId={tokenId} />;
}

