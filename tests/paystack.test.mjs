process.env.PAYSTACK_SECRET_KEY = 'sk_test_exemple_de_cle_secrete';
const { verifyWebhookSignature, toSubunit, fromSubunit, initializeTransaction } =
  await import('../src/lib/paystack.ts');
const { createHmac } = await import('node:crypto');

let ko = 0;
const check = (label, cond) => {
  console.log(`  ${cond ? '✅' : '❌'} ${label}`);
  if (!cond) ko++;
};

const body = JSON.stringify({
  event: 'charge.success',
  data: { reference: 'VOTE-abcd_0123456789abcdef', amount: 200000, status: 'success' },
});
const good = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(body).digest('hex');

console.log('Signature du webhook :');
check('signature valide acceptée', verifyWebhookSignature(body, good) === true);
check('corps altéré d’un octet rejeté',
  verifyWebhookSignature(body.replace('200000', '900000'), good) === false);
check('signature forgée rejetée',
  verifyWebhookSignature(body, 'f'.repeat(128)) === false);
check('signature absente rejetée', verifyWebhookSignature(body, null) === false);
check('signature de longueur différente rejetée sans exception',
  verifyWebhookSignature(body, 'abc') === false);
check('signature signée avec une autre clé rejetée',
  verifyWebhookSignature(body, createHmac('sha512', 'autre-cle').update(body).digest('hex')) === false);

console.log('\nConversion des montants (XOF sans décimale) :');
check('2 000 F CFA → 200000 sous-unités', toSubunit(2000) === 200000);
check('200000 sous-unités → 2 000 F CFA', fromSubunit(200000) === 2000);
check('aller-retour stable sur 5 000 F', fromSubunit(toSubunit(5000)) === 5000);
check('montant entier même si décimal en entrée', Number.isInteger(toSubunit(1500.4)));

/*
 * Clés mal configurées : l'échec doit être immédiat et explicite, sans qu'un
 * appel réseau ne parte vers Paystack.
 */
console.log('\nContrôle de la clé secrète :');

let networkCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...args) => {
  networkCalls++;
  return realFetch(...args);
};

const params = {
  email: 'test@exemple.ci',
  amount: 2000,
  reference: 'VOTE-test',
  callbackUrl: 'https://exemple.ci/vote/success',
};

const originalKey = process.env.PAYSTACK_SECRET_KEY;
const initWith = async (key) => {
  if (key === undefined) delete process.env.PAYSTACK_SECRET_KEY;
  else process.env.PAYSTACK_SECRET_KEY = key;
  return initializeTransaction(params);
};

const isRefused = (r) => r.success === false && /pas correctement configuré/.test(r.error);

check('clé publique (pk_) refusée', isRefused(await initWith('pk_live_abcdef')));
check('clé au format inconnu refusée', isRefused(await initWith('abcdef123')));
check('clé absente refusée', isRefused(await initWith(undefined)));
check('aucun appel réseau émis avec une clé invalide', networkCalls === 0);

process.env.PAYSTACK_SECRET_KEY = originalKey;
globalThis.fetch = realFetch;

/*
 * URL de retour après paiement. Un domaine erroné renvoie l'acheteur sur une
 * page inexistante alors que le montant a bien été débité.
 */
console.log("\nRésolution de l'URL publique :");

const { resolveBaseUrl } = await import('../src/lib/base-url.ts');

check(
  'NEXT_PUBLIC_BASE_URL prioritaire',
  resolveBaseUrl({
    NEXT_PUBLIC_BASE_URL: 'https://clicvote.ci',
    VERCEL_PROJECT_PRODUCTION_URL: 'projet.vercel.app',
  }) === 'https://clicvote.ci'
);
check(
  'domaine de production Vercel à défaut',
  resolveBaseUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'projet.vercel.app', VERCEL_URL: 'dep.vercel.app' }) ===
    'https://projet.vercel.app'
);
check(
  'URL du déploiement en dernier recours',
  resolveBaseUrl({ VERCEL_URL: 'dep-xyz.vercel.app' }) === 'https://dep-xyz.vercel.app'
);
check('protocole ajouté aux valeurs Vercel',
  resolveBaseUrl({ VERCEL_URL: 'dep.vercel.app' }).startsWith('https://'));
check('barre oblique finale retirée',
  resolveBaseUrl({ NEXT_PUBLIC_BASE_URL: 'https://clicvote.ci/' }) === 'https://clicvote.ci');
check('valeur vide ignorée',
  resolveBaseUrl({ NEXT_PUBLIC_BASE_URL: '   ', VERCEL_URL: 'dep.vercel.app' }) ===
    'https://dep.vercel.app');
check('aucun domaine codé en dur sans configuration',
  resolveBaseUrl({}) === 'http://localhost:9003');

console.log(ko === 0 ? '\nToutes les vérifications passent.' : `\n${ko} échec(s).`);
process.exit(ko === 0 ? 0 : 1);
