import eduverseLogoPath from "@assets/WhatsApp Image 2025-09-13 at 19.43.50_7a419c45_1757781891961.jpg";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ className = "", size = "md", showText = true }: LogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl"
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`${sizeClasses[size]} rounded-lg flex items-center justify-center overflow-hidden`}>
        <img 
          src={eduverseLogoPath} 
          alt="EduVerse Logo" 
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <div>
          <span className={`${textSizeClasses[size]} font-bold`}>
            <span className="text-eduverse-blue">EDU</span><span className="text-eduverse-gold">VERSE</span>
          </span>
          {/* {size !== "sm" && (
            <p className="text-sm text-eduverse-gray">Education Excellence</p>
          )} */}
        </div>
      )}
    </div>
  );
}
