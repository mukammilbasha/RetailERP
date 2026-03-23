"use client";

import dynamic from "next/dynamic";

// Prevent SSR for this page to avoid hydration mismatches from browser table-layout width calculations
const StockFreezePageContent = dynamic(
  () => import("./_stock-freeze-content"),
  { ssr: false, loading: () => null }
);

export default function StockFreezePage() {
  return <StockFreezePageContent />;
}
