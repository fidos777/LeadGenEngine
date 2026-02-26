import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "font-semibold rounded-lg transition-colors",
          {
            "bg-white text-black hover:bg-gray-200": variant === "primary",
            "border border-gray-600 hover:border-gray-400": variant === "secondary",
            "hover:bg-gray-800": variant === "ghost",
          },
          {
            "px-3 py-1.5 text-sm": size === "sm",
            "px-6 py-3": size === "md",
            "px-8 py-4 text-lg": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
