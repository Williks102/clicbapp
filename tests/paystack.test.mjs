process.env.PAYSTACK_SECRET_KEY = 'sk_test_exemple_de_cle_secrete';
const { verifyWebhookSignature, toSubunit, fromSubunit } =
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

console.log(ko === 0 ? '\nToutes les vérifications passent.' : `\n${ko} échec(s).`);
process.exit(ko === 0 ? 0 : 1);
