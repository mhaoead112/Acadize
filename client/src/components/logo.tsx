import { AcadizeLogo } from "./AcadizeLogo";

export interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ className = "", size = "md", showText = true }: LogoProps) {
  return (
    <AcadizeLogo
      variant="full"
      size={size}
      className={className}
      showWordmark={showText}
    />
  );
}
