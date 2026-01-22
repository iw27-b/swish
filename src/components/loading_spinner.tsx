"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  size = 24,
  className = "",
  fullScreen = false,
}: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <Loader2
          className={`animate-spin text-gray-400 ${className}`}
          size={size}
          strokeWidth={2}
        />
      </div>
    );
  }

  return (
    <Loader2
      className={`animate-spin ${className}`}
      size={size}
      strokeWidth={2}
    />
  );
}
