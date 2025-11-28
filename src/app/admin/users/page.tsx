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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAllUsers } from '@/app/actions/admin-actions';
import { UserStatusToggle } from '@/components/admin/user-status-toggle';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  // Charger les utilisateurs côté serveur
  const users = await getAllUsers();

  // Séparer par rôle
  const organizers = users.filter(u => u.role === 'organizer');
  const customers = users.filter(u => u.role === 'customer');
  const admins = users.filter(u => u.role === 'admin');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gestion des Utilisateurs"
        description={`${users.length} utilisateur${users.length > 1 ? 's' : ''} inscrit${users.length > 1 ? 's' : ''}.`}
      />

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Organisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Administrateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des utilisateurs */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Tous les Utilisateurs</CardTitle>
          <CardDescription>
            Liste complète des comptes enregistrés sur la plateforme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                Aucun utilisateur enregistré.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Date d'inscription</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const createdAt = user.createdAt 
                      ? new Date(user.createdAt)
                      : null;

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.id.substring(0, 12)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === 'admin'
                                ? 'destructive'
                                : user.role === 'organizer'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {user.role === 'admin'
                              ? 'Admin'
                              : user.role === 'organizer'
                              ? 'Organisateur'
                              : 'Client'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {createdAt
                            ? format(createdAt, 'dd MMM yyyy', { locale: fr })
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {user.disabled ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700">
                              Désactivé
                            </Badge>
                          ) : user.deleted ? (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700">
                              Supprimé
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              Actif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <UserStatusToggle
                            userId={user.id}
                            userName={user.name}
                            currentStatus={user.disabled || false}
                            isDeleted={user.deleted || false}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}