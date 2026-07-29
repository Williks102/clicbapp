'use server';

/**
 * @fileOverview Génération assistée de la présentation d'un concours.
 *
 * - generateCompetitionDescription : produit un texte de présentation accrocheur
 *   à partir des informations saisies par l'organisateur.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateCompetitionDescriptionInputSchema = z.object({
  title: z.string().describe('Le nom du concours.'),
  category: z
    .string()
    .describe('La catégorie du concours (ex : beauté, musique, talent, sport).'),
  votingEndsAt: z.string().describe('La date de clôture des votes.'),
  keywords: z
    .string()
    .describe('Mots-clés décrivant le concours, son ambiance et ses enjeux.'),
  hasLive: z.boolean().describe('Le concours est-il diffusé en direct ?'),
});
export type GenerateCompetitionDescriptionInput = z.infer<
  typeof GenerateCompetitionDescriptionInputSchema
>;

const GenerateCompetitionDescriptionOutputSchema = z.object({
  description: z.string().describe('Une présentation engageante du concours.'),
});
export type GenerateCompetitionDescriptionOutput = z.infer<
  typeof GenerateCompetitionDescriptionOutputSchema
>;

export async function generateCompetitionDescription(
  input: GenerateCompetitionDescriptionInput
): Promise<GenerateCompetitionDescriptionOutput> {
  return generateCompetitionDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCompetitionDescriptionPrompt',
  input: { schema: GenerateCompetitionDescriptionInputSchema },
  output: { schema: GenerateCompetitionDescriptionOutputSchema },
  prompt: `Tu es un rédacteur spécialisé dans la promotion de concours et d'émissions.
Rédige en français une présentation engageante à partir des informations suivantes :

Nom du concours : {{{title}}}
Catégorie : {{{category}}}
Clôture des votes : {{{votingEndsAt}}}
Mots-clés : {{{keywords}}}
Diffusion en direct : {{#if hasLive}}oui{{else}}non{{/if}}

La présentation doit donner envie de découvrir les candidats et de voter.
Elle fait 120 à 180 mots, sur un ton chaleureux et dynamique, et se termine par un
appel à l'action invitant le public à soutenir son favori.`,
});

const generateCompetitionDescriptionFlow = ai.defineFlow(
  {
    name: 'generateCompetitionDescriptionFlow',
    inputSchema: GenerateCompetitionDescriptionInputSchema,
    outputSchema: GenerateCompetitionDescriptionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
