// src/components/icons/DhiBotUserLogo.tsx
import NextImage from 'next/image';

interface DhiBotUserLogoProps {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
}

// ======================================================================
// IMPORTANT INSTRUCTIONS FOR YOUR LOGO:
// ======================================================================
// 1. Create a folder named 'images' inside your 'public' directory
//    (if it doesn't already exist). Your project structure should look
//    something like:
//    your-project-root/
//    ├── public/
//    │   └── images/   <-- CREATE THIS FOLDER
//    ├── src/
//    └── ...
//
// 2. Place your desired logo image file (e.g., 'dhi-bot-logo.png',
//    'my-logo.svg', etc.) inside this 'public/images/' folder.
//
// 3. Update the 'USER_LOGO_PATH' variable below to point to your logo.
//    For example, if your logo is 'public/images/dhi-bot-logo.png',
//    then USER_LOGO_PATH should be '/images/dhi-bot-logo.png'.
//    If it's 'public/images/my-cool-logo.svg', it should be
//    '/images/my-cool-logo.svg'.
//
//    The path starts with '/' and is relative to the 'public' folder.
// ======================================================================

// TODO: Replace this placeholder with the actual path to your logo!
const USER_LOGO_PATH = "/images/logo.png"; // e.g., "/images/dhi-bot-logo.png"

export function DhiBotUserLogo({
  className,
  width = 32, // Default width
  height = 32, // Default height
  alt = "Dhi-bot Logo",
  ...rest
}: DhiBotUserLogoProps) {
  if (USER_LOGO_PATH === "/images/logo.png") {
    // This console warning helps during development if the logo hasn't been set up.
    console.warn(
      "DhiBotUserLogo: Using placeholder logo. Please follow instructions in src/components/icons/DhiBotUserLogo.tsx to set your custom logo."
    );
  }

  return (
    <NextImage
      src={USER_LOGO_PATH}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority // Add priority if the logo is critical for LCP (Largest Contentful Paint)
      unoptimized={USER_LOGO_PATH.startsWith('https://placehold.co')} // Avoid optimizing placeholder URLs
      {...rest}
    />
  );
}
