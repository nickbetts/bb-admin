import { cva, type VariantProps } from "class-variance-authority";

export const motionSurfaceVariants = cva("will-change-transform", {
  variants: {
    tone: {
      default: "",
      glass: "backdrop-blur-md",
      accent: "ring-1 ring-indigo-200/60",
    },
    elevation: {
      none: "",
      soft: "shadow-sm",
      medium: "shadow",
      strong: "shadow-lg",
    },
  },
  defaultVariants: {
    tone: "default",
    elevation: "none",
  },
});

export type MotionSurfaceVariantProps = VariantProps<typeof motionSurfaceVariants>;
