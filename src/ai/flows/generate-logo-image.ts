'use server';
/**
 * @fileOverview A Genkit flow to generate a 3D cartoon-style logo from an input image.
 *
 * - generateLogoImage - A function that calls the image generation flow.
 * - GenerateLogoImageInput - The input type for the generateLogoImage function.
 * - GenerateLogoImageOutput - The return type for the generateLogoImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLogoImageInputSchema = z.object({
  originalImageUri: z
    .string()
    .describe(
      "The original image to base the logo on, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  promptText: z
    .string()
    .default(
      "Generate a friendly 3D cartoon-style avatar/logo from the provided image of a person. The logo should focus on clear facial features with a welcoming expression, suitable for a chatbot app icon. Aim for a simple, iconic style that works well at small sizes. The background should ideally be transparent or a very simple, clean, solid color."
    )
    .describe('The text prompt to guide the logo generation.'),
});
export type GenerateLogoImageInput = z.infer<typeof GenerateLogoImageInputSchema>;

const GenerateLogoImageOutputSchema = z.object({
  generatedLogoUri: z
    .string()
    .describe(
      "The generated logo image as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."
    ),
});
export type GenerateLogoImageOutput = z.infer<typeof GenerateLogoImageOutputSchema>;

export async function generateLogoImage(
  input: GenerateLogoImageInput
): Promise<GenerateLogoImageOutput> {
  return generateLogoImageFlow(input);
}

const generateLogoImageFlow = ai.defineFlow(
  {
    name: 'generateLogoImageFlow',
    inputSchema: GenerateLogoImageInputSchema,
    outputSchema: GenerateLogoImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // Ensure this model supports image generation with image input
      prompt: [
        { media: { url: input.originalImageUri } },
        { text: input.promptText },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // Request both TEXT and IMAGE
      },
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed or did not return a media URL.');
    }

    return { generatedLogoUri: media.url };
  }
);
