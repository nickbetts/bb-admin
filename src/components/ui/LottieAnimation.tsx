"use client";

import { cn } from "@/lib/utils";
import Lottie from "lottie-react";

interface LottieAnimationProps {
  animationData: object;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
}

export function LottieAnimation({
  animationData,
  className,
  loop = true,
  autoplay = true,
}: LottieAnimationProps) {
  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      className={cn("h-12 w-12", className)}
    />
  );
}
