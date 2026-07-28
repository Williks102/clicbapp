'use client';

import { useEffect, useState } from 'react';
import { splitFullName } from '@/lib/utils';

export type PaymentChannel = 'mobile-money' | 'card';

export type RedirectToPaymentParams = {
  merchantId: string;
  reference: string;
  amount: number;
  description: string;
  channel: PaymentChannel;
  customerFullName: string;
  customerEmail: string;
  customerPhone: string;
  /** Page de retour après paiement (chemin relatif). */
  returnPath: string;
};

/**
 * Charge la passerelle Paiement Pro et expose l'état du script.
 * Le script lui-même est injecté par `<Script>` dans le composant appelant.
 */
export function usePaiementProStatus(isProcessing: boolean) {
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  useEffect(() => {
    if (scriptReady || isProcessing) return;

    // Bloqueurs de publicité et coupures réseau empêchent souvent le chargement.
    const timer = setTimeout(() => {
      if (typeof (window as any).PaiementPro === 'undefined') {
        setScriptError(
          "La passerelle de paiement n'a pas pu être chargée. Désactivez votre bloqueur de publicités puis rafraîchissez la page."
        );
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [scriptReady, isProcessing]);

  return { scriptReady, setScriptReady, scriptError, setScriptError };
}

export const PAIEMENTPRO_SCRIPT_URL =
  'https://www.paiementpro.net/webservice/onlinepayment/js/paiementpro.v1.0.1.js';

/**
 * Configure la transaction puis redirige vers la page de paiement.
 * Lève une erreur si la passerelle refuse d'initialiser le paiement.
 */
export async function redirectToPayment(params: RedirectToPaymentParams) {
  const PaiementPro = (window as any).PaiementPro;
  if (typeof PaiementPro === 'undefined') {
    throw new Error("La passerelle de paiement n'est pas prête.");
  }

  const { firstName, lastName } = splitFullName(params.customerFullName);
  const gateway = new PaiementPro(params.merchantId);

  gateway.amount = params.amount;
  gateway.channel = params.channel === 'mobile-money' ? 'MOBILE_MONEY_CI' : 'CARD';
  gateway.referenceNumber = params.reference;
  gateway.customerEmail = params.customerEmail;
  gateway.customerFirstName = firstName;
  gateway.customerLastname = lastName;
  gateway.customerPhoneNumber = params.customerPhone;
  gateway.description = params.description;
  gateway.countryCurrencyCode = '952'; // XOF
  gateway.notificationURL = `${window.location.origin}/api/payment/webhook`;
  gateway.returnURL = `${window.location.origin}${params.returnPath}`;
  gateway.returnContext = JSON.stringify({ reference: params.reference });

  await gateway.getUrlPayment();

  if (!gateway.success) {
    throw new Error(
      `Impossible d'initialiser le paiement. ${gateway.message || 'Erreur de la passerelle.'}`
    );
  }

  window.location.href = gateway.url;
}
