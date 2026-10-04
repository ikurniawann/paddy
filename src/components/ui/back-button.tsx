"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type BackButtonProps = {
  label?: string;
  className?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
};

export function BackButton({
  label,
  className,
  variant = "ghost",
  size = "icon",
}: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => router.back()}
      aria-label={label || "Kembali"}
    >
      <ArrowLeft className={label ? "mr-2 h-4 w-4" : "h-5 w-5"} />
      {label}
    </Button>
  );
}
