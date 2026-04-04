import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import supabaseAdmin from '@/libs/supabaseAdmin';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-08-16',
  typescript: true,
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId = session.customer as string;

        if (!userId) {
          console.error('[webhook] checkout.session.completed: missing client_reference_id');
          break;
        }

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ plan: 'pro', customer_id: customerId })
          .eq('id', userId);

        if (error) {
          console.error('[webhook] Failed to upgrade profile:', error.message);
        } else {
          console.log(`[webhook] Upgraded user ${userId} to pro`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ plan: 'free' })
          .eq('customer_id', customerId);

        if (error) {
          console.error('[webhook] Failed to downgrade profile:', error.message);
        } else {
          console.log(`[webhook] Downgraded customer ${customerId} to free`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ plan: 'free' })
          .eq('customer_id', customerId);

        if (error) {
          console.error('[webhook] Failed to downgrade profile on payment failure:', error.message);
        } else {
          console.log(`[webhook] Downgraded customer ${customerId} to free (payment failed)`);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('[webhook] Unhandled error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
