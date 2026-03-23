import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Inactive: "bg-red-100 text-red-700",
  DRAFT: "bg-gray-100 text-gray-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-yellow-100 text-yellow-700",
  IN_PRODUCTION: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  DISPATCHED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  FINALIZED: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  Yes: "bg-green-100 text-green-700",
  No: "bg-gray-100 text-gray-600",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        statusStyles[status] || "bg-gray-100 text-gray-700",
        className
      )}
    >
      {status}
    </span>
  );
}
