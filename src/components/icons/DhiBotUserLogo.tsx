// src/components/icons/DhiBotUserLogo.tsx
import NextImage from 'next/image';

interface DhiBotUserLogoProps {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
}

// INSTRUCTIONS FOR THE USER:
// 1. Create a folder named 'images' inside your 'public' directory if it doesn't already exist.
// 2. Place your desired logo image (e.g., 'dhi-bot-logo.png') inside the 'public/images/' folder.
// 3. The 'src' prop below assumes your logo is at '/images/dhi-bot-logo.png'.
//    Adjust the path if your image name or location within 'public' is different.

const logoPath = "/images/dhi-bot-logo.png"; // Path relative to the 'public' folder

export function DhiBotUserLogo({
  className,
  width = 32, // Default width
  height = 32, // Default height
  alt = "Dhi-bot Logo",
  ...rest
}: DhiBotUserLogoProps) {
  return (
    <NextImage
      src={logoPath}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority // Add priority if the logo is critical for LCP
      {...rest}
    />
  );
}
