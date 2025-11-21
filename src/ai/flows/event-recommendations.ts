// This is a server action.
'use server';

/**
 * @fileOverview Provides personalized event recommendations based on user preferences.
 *
 * - getEventRecommendations - A function that takes user preferences and returns a list of recommended events.
 * - EventRecommendationsInput - The input type for the getEventRecommendations function.
 * - EventRecommendationsOutput - The return type for the getEventRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for event recommendations, with user preferences.
const EventRecommendationsInputSchema = z.object({
  pastActivity: z.string().describe('The user past activities.'),
  preferences: z.string().describe('The user preferences for events.'),
  date: z.string().describe('Current date'),
});
export type EventRecommendationsInput = z.infer<
  typeof EventRecommendationsInputSchema
>;

// Define the output schema for event recommendations.
const EventRecommendationsOutputSchema = z.object({
  recommendedEvents: z
    .string()
    .describe('A list of recommended events based on user preferences.'),
});
export type EventRecommendationsOutput = z.infer<
  typeof EventRecommendationsOutputSchema
>;

// Exported function to get event recommendations.
export async function getEventRecommendations(
  input: EventRecommendationsInput
): Promise<EventRecommendationsOutput> {
  return eventRecommendationsFlow(input);
}

// Define the prompt for generating event recommendations.
const eventRecommendationsPrompt = ai.definePrompt({
  name: 'eventRecommendationsPrompt',
  input: {schema: EventRecommendationsInputSchema},
  output: {schema: EventRecommendationsOutputSchema},
  prompt: `You are an AI event recommendation system.
  Based on the user's past activity and preferences, provide a list of recommended events.

  Past Activity: {{{pastActivity}}}
  Preferences: {{{preferences}}}
  Current Date: {{{date}}}

  Provide a list of events that the user would be interested in.
  Format the list of recommended events clearly and concisely.
  `,
});

// Define the Genkit flow for event recommendations.
const eventRecommendationsFlow = ai.defineFlow(
  {
    name: 'eventRecommendationsFlow',
    inputSchema: EventRecommendationsInputSchema,
    outputSchema: EventRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await eventRecommendationsPrompt(input);
    return output!;
  }
);
