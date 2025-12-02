'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getEventScans, getEventScanStats, type TicketScan } from '@/app/actions/scanner-actions';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { CheckCircle, Users, Ticket, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminScannerStatsPage() {
  const firestore = useFirestore();

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [scans, setScans] = useState<TicketScan[]>([]);
  const [stats, setStats] = useState<{
    totalScans: number;
    totalAttendees: number;
    scansByTicketType: Record<string, number>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Charger tous les événements (admin voit tout)
  const allEventsQuery = firestore ? collection(firestore, 'events') : null;
  const { data: allEvents, isLoading: eventsLoading } = useCollection<Event>(allEventsQuery);

  // Charger les scans quand un événement est sélectionné
  useEffect(() => {
    if (selectedEventId) {
      loadScansData();
    }
  }, [selectedEventId]);

  const loadScansData = async () => {
    if (!selectedEventId) return;

    console.log('[ADMIN SCANNER STATS] 📊 Loading stats for event:', selectedEventId);
    setIsLoading(true);
    try {
      const [scansData, statsData] = await Promise.all([
        getEventScans(selectedEventId),
        getEventScanStats(selectedEventId),
      ]);

      console.log('[ADMIN SCANNER STATS] ✅ Scans loaded:', scansData.length, 'scans');
      console.log('[ADMIN SCANNER STATS] ✅ Stats loaded:', statsData);

      setScans(scansData);
      setStats(statsData);
    } catch (error) {
      console.error('[ADMIN SCANNER STATS] ❌ Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Trouver l'événement sélectionné
  const selectedEvent = allEvents?.find(e => e.id === selectedEventId);

  // Obtenir le nom du ticket
  const getTicketName = (ticketId: string) => {
    return selectedEvent?.tickets.find(t => t.id === ticketId)?.name || 'Type inconnu';
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Statistiques de Scan (Admin)"
        description="Consultez l'historique et les statistiques des billets scannés pour tous les événements."
      />

      {/* Sélection événement */}
      <Card>
        <CardHeader>
          <CardTitle>Sélectionner un événement</CardTitle>
          <CardDescription>
            Choisissez un événement pour voir ses statistiques de scan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un événement" />
              </SelectTrigger>
              <SelectContent>
                {allEvents?.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name} - {new Date(event.date).toLocaleDateString('fr-FR')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Statistiques globales */}
      {selectedEventId && stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalScans}</div>
              <p className="text-xs text-muted-foreground">
                Billets scannés
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAttendees}</div>
              <p className="text-xs text-muted-foreground">
                Personnes entrées
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Types de Billets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(stats.scansByTicketType).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Types différents scannés
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Répartition par type de billet */}
      {selectedEventId && stats && Object.keys(stats.scansByTicketType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Type de Billet</CardTitle>
            <CardDescription>
              Nombre de participants par type de billet scanné.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.scansByTicketType).map(([ticketId, count]) => (
                <div key={ticketId} className="flex items-center justify-between">
                  <span className="font-medium">{getTicketName(ticketId)}</span>
                  <Badge variant="secondary">{count} participants</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique des scans */}
      {selectedEventId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Historique des Scans</CardTitle>
                <CardDescription>
                  Liste chronologique de tous les billets scannés pour cet événement.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadScansData}
                disabled={isLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : scans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>Aucun billet scanné pour le moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Heure</TableHead>
                      <TableHead>Détenteur</TableHead>
                      <TableHead>Type de Billet</TableHead>
                      <TableHead className="text-right">Quantité</TableHead>
                      <TableHead>Scanné par</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scans.map((scan) => (
                      <TableRow key={scan.id}>
                        <TableCell className="font-mono text-sm">
                          {formatDate(scan.scannedAt)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {scan.holderName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTicketName(scan.ticketId)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{scan.quantity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {scan.scannedByName || scan.scannedBy}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
