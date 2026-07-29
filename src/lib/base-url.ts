/**
 * URL publique du site.
 *
 * Utilisée pour la page de retour après paiement et pour les liens des
 * e-mails. Aucun domaine n'est codé en dur : une valeur de repli pointant
 * vers un domaine non enregistré renverrait l'acheteur — ou le destinataire
 * d'un e-mail — sur une page inexistante après un paiement pourtant abouti.
 *
 * Ordre de préférence :
 *  1. `NEXT_PUBLIC_BASE_URL`, le domaine choisi explicitement ;
 *  2. `VERCEL_PROJECT_PRODUCTION_URL`, stable d'un déploiement à l'autre ;
 *  3. `VERCEL_URL`, propre au déploiement courant ;
 *  4. l'hôte de développement.
 *
 * Les variables fournies par Vercel ne portent pas de protocole ; la nôtre
 * peut en porter un.
 */
export function resolveBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const candidates = [
    env.NEXT_PUBLIC_BASE_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL,
    env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;

    const url = /^https?:\/\//.test(value) ? value : `https://${value}`;
    return url.replace(/\/+$/, '');
  }

  return 'http://localhost:9003';
}
