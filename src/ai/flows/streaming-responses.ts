// streaming-responses.ts
'use server';

/**
 * @fileOverview Implements a Genkit flow for streaming AI chatbot responses in real-time.
 *
 * - streamChat: A function that streams chatbot responses.
 * - StreamChatInput: The input type for the streamChat function, representing the user's message.
 * - StreamChatOutput: The output type for the streamChat function, representing the AI's response.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StreamChatInputSchema = z.object({
  message: z.string().describe('The user message to respond to.'),
  portfolioData: z.string().describe('The portfolio information to use as context.'),
});
export type StreamChatInput = z.infer<typeof StreamChatInputSchema>;

const StreamChatOutputSchema = z.object({
  response: z.string().describe('The AI generated response.'),
});
export type StreamChatOutput = z.infer<typeof StreamChatOutputSchema>;

export async function streamChat(input: StreamChatInput): Promise<StreamChatOutput> {
  return streamChatFlow(input);
}

const streamChatPrompt = ai.definePrompt({
  name: 'streamChatPrompt',
  input: {schema: StreamChatInputSchema},
  output: {schema: StreamChatOutputSchema},
  prompt: `You are a helpful AI assistant representing a professional. Answer questions based on the provided portfolio information.\n\nPortfolio Information:\n{{{portfolioData}}}\n\nUser Question: {{{message}}}\n\nResponse: `,
});

const streamChatFlow = ai.defineFlow(
  {
    name: 'streamChatFlow',
    inputSchema: StreamChatInputSchema,
    outputSchema: StreamChatOutputSchema,
  },
  async input => {
    const {output} = await streamChatPrompt(input);
    return output!;
  }
);
