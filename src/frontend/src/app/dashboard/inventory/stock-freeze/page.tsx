"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const StockFreezePageContent = dynamic(
  () => import("./_stock-freeze-content"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    ),
  }
);

export default function StockFreezePage() {
  return <StockFreezePageContent />;
}
