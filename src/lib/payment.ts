import { PaymentRecord } from '../types';

export const FEATURED_POST_PRICE_USD = 6.00;

export interface InitiatePaymentParams {
  submissionId: string;
  studentUid: string;
  studentName: string;
  universityId: string;
  provider?: 'STRIPE_CARD';
  paymentIntentId?: string;
  idempotencyKey?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  paymentRecord: PaymentRecord;
  message: string;
}

export interface PaymentGatewayConfig {
  stripeConfigured: boolean;
  publishableKey: string;
}

export interface PaymentIntentResponse {
  success: boolean;
  paymentIntentId: string;
  clientSecret: string;
  publishableKey: string;
  amountUsd: number;
  currency: string;
}

export async function fetchPaymentGatewayConfig(): Promise<PaymentGatewayConfig> {
  const res = await fetch('/api/payment-config', {
    credentials: 'include',
    headers: { 'Cache-Control': 'no-store' }
  });
  if (!res.ok) {
    return { stripeConfigured: false, publishableKey: '' };
  }
  return (await res.json()) as PaymentGatewayConfig;
}

export async function createStripePaymentIntent(
  submissionId: string,
  idempotencyKey?: string
): Promise<PaymentIntentResponse> {
  const res = await fetch('/api/payments/create-intent', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submissionId, idempotencyKey })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.paymentIntentId) {
    throw new Error(data.message || 'Unable to initialize Stripe payment intent.');
  }
  return data as PaymentIntentResponse;
}

/**
 * Verifies a settled Stripe PaymentIntent exclusively via the authoritative backend API.
 */
export async function processSubmissionPayment(
  params: InitiatePaymentParams
): Promise<PaymentVerificationResult> {
  const key = params.idempotencyKey || `idem_${params.submissionId}_${Date.now()}`;

  if (!params.submissionId || !params.studentUid) {
    throw new Error('Invalid payment parameters: submissionId and studentUid are required.');
  }

  let paymentIntentId = params.paymentIntentId;
  if (!paymentIntentId) {
    // Initialize server-side PaymentIntent; client must confirm via Stripe before verification
    await createStripePaymentIntent(params.submissionId, key);
    throw new Error(
      'Stripe payment confirmation is required via Stripe Checkout before server verification.'
    );
  }

  const verifyRes = await fetch('/api/payments/verify', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submissionId: params.submissionId,
      paymentIntentId,
      idempotencyKey: key
    })
  });
  const data = await verifyRes.json().catch(() => ({}));
  if (!verifyRes.ok || !data?.payment) {
    throw new Error(data.message || 'Server-side Stripe payment verification failed.');
  }

  return {
    success: true,
    paymentRecord: data.payment as PaymentRecord,
    message: data.message || `Payment of $${FEATURED_POST_PRICE_USD.toFixed(2)} USD verified via Stripe.`
  };
}
