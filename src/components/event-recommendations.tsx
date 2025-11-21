'use client';

import { useState } from 'react';
import { getEventRecommendations } from '@/ai/flows/event-recommendations';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Wand2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

export default function EventRecommendations() {
  const [preferences, setPreferences] = useState(
    'Concerts de musique afropop, festivals culturels à Abidjan, conférences sur la tech'
  );
  const [pastActivity, setPastActivity] = useState(
    'Organisé le FEMUA en 2023, co-organisé un hackathon tech en 2022'
  );
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGetRecommendations = async () => {
    setLoading(true);
    setRecommendations('');
    try {
      const result = await getEventRecommendations({
        preferences,
        pastActivity,
        date: new Date().toISOString(),
      });
      setRecommendations(result.recommendedEvents);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      setRecommendations(
        "Une erreur s'est produite lors de la récupération des recommandations."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="preferences">Vos préférences</Label>
          <Textarea
            id="preferences"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder="Ex: concerts, conférences, sports..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pastActivity">Vos activités passées</Label>
          <Textarea
            id="pastActivity"
            value={pastActivity}
            onChange={(e) => setPastActivity(e.target.value)}
            placeholder="Ex: organisé un festival de jazz en 2023..."
          />
        </div>
      </div>
      <Button onClick={handleGetRecommendations} disabled={loading}>
        <Wand2 className="mr-2 h-4 w-4" />
        {loading ? 'Génération en cours...' : 'Obtenir des recommandations'}
      </Button>

      {loading && (
        <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      {recommendations && (
        <div>
          <h3 className="mb-4 font-headline text-lg font-semibold">
            Nos suggestions pour vous
          </h3>
          <Card className="bg-secondary/50">
            <CardContent className="p-6">
              <p className="whitespace-pre-wrap">{recommendations}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
