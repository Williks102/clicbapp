'use server';

/**
 * @fileOverview An AI agent to generate event descriptions from basic event details.
 *
 * - generateEventDescription - A function that generates an event description.
 * - GenerateEventDescriptionInput - The input type for the generateEventDescription function.
 * - GenerateEventDescriptionOutput - The return type for the generateEventDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateEventDescriptionInputSchema = z.object({
  eventName: z.string().describe('The name of the event.'),
  eventCategory: z.string().describe('The category of the event (e.g., music, sports, conference).'),
  eventDate: z.string().describe('The date of the event.'),
  eventLocation: z.string().describe('The location of the event.'),
  eventDescriptionKeywords: z.string().describe('Keywords that describe the event.'),
});
export type GenerateEventDescriptionInput = z.infer<typeof GenerateEventDescriptionInputSchema>;

const GenerateEventDescriptionOutputSchema = z.object({
  eventDescription: z.string().describe('An engaging description of the event.'),
});
export type GenerateEventDescriptionOutput = z.infer<typeof GenerateEventDescriptionOutputSchema>;

export async function generateEventDescription(
  input: GenerateEventDescriptionInput
): Promise<GenerateEventDescriptionOutput> {
  return generateEventDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateEventDescriptionPrompt',
  input: {schema: GenerateEventDescriptionInputSchema},
  output: {schema: GenerateEventDescriptionOutputSchema},
  prompt: `You are an expert copywriter specializing in creating engaging event descriptions.
  Generate an engaging event description based on the following event details:

  Event Name: {{{eventName}}}
  Event Category: {{{eventCategory}}}
  Event Date: {{{eventDate}}}
  Event Location: {{{eventLocation}}}
  Event Description Keywords: {{{eventDescriptionKeywords}}}

  Write a compelling and informative description to attract potential attendees.
  The description should be approximately 150-200 words.
  `,
});

const generateEventDescriptionFlow = ai.defineFlow(
  {
    name: 'generateEventDescriptionFlow',
    inputSchema: GenerateEventDescriptionInputSchema,
    outputSchema: GenerateEventDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
