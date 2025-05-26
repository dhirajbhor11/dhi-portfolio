// src/ai/flows/answer-questions.ts
'use server';

/**
 * @fileOverview AI agent that answers questions about the portfolio owner's
 * skills, experience, and projects, providing accurate and informative
 * answers based on the provided portfolio data.
 *
 * - answerQuestions - A function that handles the question answering process.
 * - AnswerQuestionsInput - The input type for the answerQuestions function.
 * - AnswerQuestionsOutput - The return type for the answerQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerQuestionsInputSchema = z.object({
  question: z.string().describe('The question to be answered.'),
  portfolioData: z.string().describe('The portfolio data in markdown format.'),
});
export type AnswerQuestionsInput = z.infer<typeof AnswerQuestionsInputSchema>;

const AnswerQuestionsOutputSchema = z.object({
  answer: z.string().describe('The answer to the question.'),
});
export type AnswerQuestionsOutput = z.infer<typeof AnswerQuestionsOutputSchema>;

export async function answerQuestions(input: AnswerQuestionsInput): Promise<AnswerQuestionsOutput> {
  return answerQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerQuestionsPrompt',
  input: {schema: AnswerQuestionsInputSchema},
  output: {schema: AnswerQuestionsOutputSchema},
  prompt: `You are Dhiraj Bhor. Respond directly in first person as if you are Dhiraj himself.

      INSTRUCTIONS:
      1. Only use information from the CONTEXT section to formulate your responses.
      2. Always respond in first person ("I", "my", "me") as Dhiraj speaking directly.
      3. If information isn't in the context, simply say "I don't have that information."
      4. Keep responses natural and conversational - like how Dhiraj would actually speak.
      5. Respond in English only.

  Remember to speak as Dhiraj in first person, not about Dhiraj in third person.
  Portfolio Data:
  {{portfolioData}}

  Question: {{question}}

  Answer:`,
});

const answerQuestionsFlow = ai.defineFlow(
  {
    name: 'answerQuestionsFlow',
    inputSchema: AnswerQuestionsInputSchema,
    outputSchema: AnswerQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
