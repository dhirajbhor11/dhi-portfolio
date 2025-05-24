'use server';

/**
 * @fileOverview A flow to generate a markdown profile file using AI.
 *
 * - generateProfile - A function that generates the markdown profile file.
 * - GenerateProfileInput - The input type for the generateProfile function.
 * - GenerateProfileOutput - The return type for the generateProfile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProfileInputSchema = z.object({
  name: z.string().describe('The name of the portfolio owner.'),
  title: z.string().describe('The title of the portfolio owner (e.g., Software Engineer).'),
  location: z.string().describe('The location of the portfolio owner (e.g., San Francisco, CA).'),
  summary: z.string().describe('A brief professional summary of the portfolio owner.'),
  experience: z.array(
    z.object({
      company: z.string().describe('The name of the company.'),
      role: z.string().describe('The role at the company.'),
      duration: z.string().describe('The duration of the role (e.g., 2020-2023).'),
      achievements: z.string().describe('Key achievements in the role.'),
    })
  ).describe('A list of work experiences.'),
  skills: z.array(z.string()).describe('A list of skills and technologies.'),
  education: z.array(
    z.object({
      institution: z.string().describe('The name of the educational institution.'),
      degree: z.string().describe('The degree earned.'),
      duration: z.string().describe('The duration of the education (e.g., 2016-2020).'),
    })
  ).describe('A list of educational experiences.'),
  projects: z.array(
    z.object({
      name: z.string().describe('The name of the project.'),
      description: z.string().describe('A brief description of the project.'),
      technologies: z.string().describe('The technologies used in the project.'),
    })
  ).describe('A list of personal or professional projects.'),
}).describe('All the details about the portfolio to generate.');

export type GenerateProfileInput = z.infer<typeof GenerateProfileInputSchema>;

const GenerateProfileOutputSchema = z.object({
  markdownContent: z.string().describe('The generated markdown content for the portfolio.'),
});

export type GenerateProfileOutput = z.infer<typeof GenerateProfileOutputSchema>;

export async function generateProfile(input: GenerateProfileInput): Promise<GenerateProfileOutput> {
  return generateProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProfilePrompt',
  input: {schema: GenerateProfileInputSchema},
  output: {schema: GenerateProfileOutputSchema},
  prompt: `You are an AI assistant that helps create a portfolio markdown file based on user-provided information.

  Given the following information, generate a detailed markdown file that includes sections for personal information, experience, skills, education, and projects.

  Personal Information:
  - Name: {{{name}}}
  - Title: {{{title}}}
  - Location: {{{location}}}
  - Summary: {{{summary}}}

  Experience:
  {{#each experience}}
  - Company: {{{company}}}
    - Role: {{{role}}}
    - Duration: {{{duration}}}
    - Achievements: {{{achievements}}}
  {{/each}}

  Skills:
  {{#each skills}}
  - {{{this}}}
  {{/each}}

  Education:
  {{#each education}}
  - Institution: {{{institution}}}
    - Degree: {{{degree}}}
    - Duration: {{{duration}}}
  {{/each}}

  Projects:
  {{#each projects}}
  - Name: {{{name}}}
    - Description: {{{description}}}
    - Technologies: {{{technologies}}}
  {{/each}}

  Ensure the markdown file is well-formatted, readable, and includes appropriate headings and lists.

  Markdown Content:
  `,
});

const generateProfileFlow = ai.defineFlow(
  {
    name: 'generateProfileFlow',
    inputSchema: GenerateProfileInputSchema,
    outputSchema: GenerateProfileOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

