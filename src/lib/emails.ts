import { Resend } from 'resend';
import { formatFCFA } from '@/lib/utils';
import { resolveBaseUrl } from '@/lib/base-url';
import type { Order } from '@/lib/types';

let client: Resend | null = null;

/**
 * Instancie le client Resend à la première utilisation : la clé n'est pas
 * disponible au moment du build, et l'envoi d'e-mails ne doit jamais empêcher
 * le démarrage de l'application.
 */
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[EMAILS] ⚠️ RESEND_API_KEY absente : e-mail non envoyé.');
    return null;
  }

  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

const FROM = 'ClicVote <contact@monticket.online>';
/**
 * Domaine utilisé dans les liens des e-mails. Résolu à chaque envoi : les
 * variables d'environnement de l'hébergeur ne sont pas toutes disponibles au
 * moment où ce module est évalué pendant le build.
 */
const baseUrl = resolveBaseUrl;

function layout(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:24px;background:#0f1115;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#ff6b2c,#ff9f1c);padding:28px 24px;color:#fff;">
      <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;">ClicVote</div>
      <div style="opacity:.9;margin-top:4px;">${title}</div>
    </div>
    <div style="padding:24px;line-height:1.6;">${body}</div>
    <div style="padding:16px 24px;background:#f6f7f9;color:#6b7280;font-size:12px;text-align:center;">
      © ${new Date().getFullYear()} ClicVote — Vote en ligne &amp; diffusion live
    </div>
  </div>
</body>
</html>`;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;color:#6b7280;">${label}</td>
    <td style="padding:8px 0;text-align:right;font-weight:600;">${value}</td>
  </tr>`;
}

/** Confirmation d'achat d'un pack de votes. */
export async function sendVoteConfirmationEmail(order: Order) {
  if (!order.customerEmail) return;

  const candidateUrl = `${baseUrl()}/competitions/${order.competitionId}/candidates/${order.candidateId}`;

  const body = `
    <p>Bonjour ${order.customerName},</p>
    <p>Merci ! Vos <strong>${order.votes} votes</strong> pour
    <strong>${order.candidateName}</strong> ont bien été enregistrés.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
      ${row('Concours', order.competitionTitle)}
      ${row('Candidat', order.candidateName || '—')}
      ${row('Pack', order.packName || '—')}
      ${row('Votes crédités', String(order.votes ?? 0))}
      ${row('Montant payé', formatFCFA(order.amount))}
      ${row('Référence', order.id)}
    </table>
    <p style="text-align:center;margin:28px 0;">
      <a href="${candidateUrl}" style="background:#ff6b2c;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;display:inline-block;">
        Voir le classement
      </a>
    </p>
    <p style="color:#6b7280;font-size:13px;">Partagez la page de votre candidat pour l'aider à grimper au classement !</p>
  `;

  await getResend()?.emails.send({
    from: FROM,
    to: order.customerEmail,
    subject: `✅ ${order.votes} votes enregistrés pour ${order.candidateName}`,
    html: layout('Confirmation de vote', body),
  });
}

/** Confirmation d'achat d'un accès au direct. */
export async function sendLiveAccessEmail(order: Order) {
  if (!order.customerEmail) return;

  const liveUrl = `${baseUrl()}/competitions/${order.competitionId}/live`;

  const body = `
    <p>Bonjour ${order.customerName},</p>
    <p>Votre accès au direct de <strong>${order.competitionTitle}</strong> est confirmé.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
      ${row('Événement', order.competitionTitle)}
      ${row('Montant payé', formatFCFA(order.amount))}
      ${row('Référence', order.id)}
    </table>
    <p style="text-align:center;margin:28px 0;">
      <a href="${liveUrl}" style="background:#ff6b2c;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;display:inline-block;">
        Accéder au direct
      </a>
    </p>
    <p style="color:#6b7280;font-size:13px;">Connectez-vous avec ce même compte le jour du direct pour y accéder.</p>
  `;

  await getResend()?.emails.send({
    from: FROM,
    to: order.customerEmail,
    subject: `📺 Accès confirmé au direct : ${order.competitionTitle}`,
    html: layout("Accès au direct", body),
  });
}
