"use client";

import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <Loader2 className={`animate-spin ${sizes[size]} ${className || ""}`} />
  );
}

interface LoadingOverlayProps {
  children: React.ReactNode;
  isLoading: boolean;
  message?: string;
}

export function LoadingOverlay({ children, isLoading, message }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
          <LoadingSpinner size="lg" />
          {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
        </div>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = "Terjadi Kesalahan", 
  message, 
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">😕</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: React.ReactNode;
}

export function EmptyState({ 
  title = "Data Kosong", 
  message, 
  icon 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        {icon || <span className="text-2xl">📭</span>}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md">{message}</p>
    </div>
  );
}
