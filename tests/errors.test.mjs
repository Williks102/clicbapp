const { UserFacingError, userMessage } = await import('../src/lib/errors.ts');

let ko = 0;
const check = (label, cond) => {
  console.log(`  ${cond ? '✅' : '❌'} ${label}`);
  if (!cond) ko++;
};

console.log('Filtrage des messages d’erreur :');

check('un refus délibéré est montré',
  userMessage(new UserFacingError('Vous n’êtes pas autorisé.'), 'X') === 'Vous n’êtes pas autorisé.');

// Le cas qui motive tout : PostgreSQL nomme volontiers la contrainte en cause.
check('une erreur PostgreSQL est masquée',
  userMessage(
    new Error('duplicate key value violates unique constraint "users_email_key"'),
    'Erreur inconnue.'
  ) === 'Erreur inconnue.');

check('une erreur quelconque est masquée',
  userMessage(new TypeError('Cannot read properties of undefined'), 'Erreur inconnue.')
    === 'Erreur inconnue.');
check('une valeur non-Error est masquée',
  userMessage('chaîne brute', 'Erreur inconnue.') === 'Erreur inconnue.');
check('null est masqué', userMessage(null, 'Erreur inconnue.') === 'Erreur inconnue.');
check('UserFacingError reste une Error', new UserFacingError('x') instanceof Error);

console.log(ko === 0 ? '\nToutes les vérifications passent.' : `\n${ko} échec(s).`);
process.exit(ko === 0 ? 0 : 1);
