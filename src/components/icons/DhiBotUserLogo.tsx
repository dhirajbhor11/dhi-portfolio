// src/components/icons/DhiBotUserLogo.tsx
import NextImage from 'next/image'; // Renamed to avoid conflict if Image is used as a prop name

interface DhiBotUserLogoProps {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
}

// INSTRUCTIONS FOR THE USER:
// 1. Convert your desired logo image (e.g., the one you uploaded) into a base64 data URI.
//    You can use an online converter or a script for this.
//    Example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASA...'
// 2. Run the `generateLogoImage` flow (e.g., using Genkit CLI or a custom script).
//    Input the data URI from step 1 as `originalImageUri`.
// 3. The flow will output a `generatedLogoUri`. Replace the placeholder below with this URI.
//
// For example, if the generated URI is 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
// then change: const logoDataUri = "YOUR_GENERATED_LOGO_DATA_URI_HERE";

// Placeholder - Replace this with the actual generated data URI
const logoDataUri = "https://placehold.co/64x64.png";

export function DhiBotUserLogo({
  className,
  width = 32, // Default width
  height = 32, // Default height
  alt = "Dhi-bot Logo",
  ...rest
}: DhiBotUserLogoProps) {
  // If you update logoDataUri with an actual data URI, next/image will use it.
  // The placeholder has a data-ai-hint for potential future image replacement tools.
  return (
    <NextImage
      src={logoDataUri}
      alt={alt}
      width={width}
      height={height}
      className={className}
      data-ai-hint={logoDataUri.startsWith('https://placehold.co') ? "cartoon face logo" : undefined}
      {...rest} // Spread any other img attributes like style, onClick etc.
    />
  );
}
