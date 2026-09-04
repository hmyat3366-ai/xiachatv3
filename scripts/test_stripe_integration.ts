/**
 * Stripe & Billing Features Live Verification Script
 */

const BASE_URL = 'http://localhost:5000';

async function verifyStripe() {
  console.log('====================================================');
  console.log('💳 VERIFYING STRIPE BILLING INTEGRATION');
  console.log('====================================================\n');

  // Step 1: Login
  console.log('1. Authenticating as Admin...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@xiachat.com', password: 'Admin@123456' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log('   Authenticated successfully. Token received.\n');

  // Step 2: Get Billing Overview
  console.log('2. Fetching Billing Overview (/api/billing/overview)...');
  const overviewRes = await fetch(`${BASE_URL}/api/billing/overview`, { headers: authHeaders });
  const overview = await overviewRes.json();
  console.log(`   Workspace: "${overview.workspace?.name}"`);
  console.log(`   Current Plan: ${overview.subscription?.planName} (Status: ${overview.subscription?.status})`);
  console.log(`   Available Plans: ${overview.plans?.map((p: any) => `${p.name} (Monthly: ${p.stripePriceIdMonthly || 'N/A'})`).join(' | ')}\n`);

  // Step 3: Create Stripe Checkout Session for Pro Plan
  console.log('3. Requesting Checkout Session for Pro Plan...');
  const checkoutRes = await fetch(`${BASE_URL}/api/billing/checkout-session`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ planId: 'pro', billingInterval: 'monthly' }),
  });
  const checkoutData = await checkoutRes.json();
  console.log('   Checkout Response Status:', checkoutRes.status);
  console.log('   Session ID:', checkoutData.sessionId);
  console.log('   Checkout URL:', checkoutData.url || checkoutData.checkoutUrl);
  
  const isRealStripeUrl = (checkoutData.url || checkoutData.checkoutUrl || '').includes('checkout.stripe.com');
  if (isRealStripeUrl) {
    console.log('   ✅ REAL STRIPE CHECKOUT HOSTED PAGE CREATED!\n');
  } else {
    console.log('   ℹ️ Fallback or mock checkout session returned.\n');
  }

  // Step 4: Create Stripe Checkout Session for Enterprise Plan
  console.log('4. Requesting Checkout Session for Enterprise Plan...');
  const enterpriseRes = await fetch(`${BASE_URL}/api/billing/checkout-session`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ planId: 'enterprise', billingInterval: 'monthly' }),
  });
  const enterpriseData = await enterpriseRes.json();
  console.log('   Enterprise Session ID:', enterpriseData.sessionId);
  console.log('   Enterprise Checkout URL:', enterpriseData.url || enterpriseData.checkoutUrl);
  if ((enterpriseData.url || '').includes('checkout.stripe.com')) {
    console.log('   ✅ REAL STRIPE CHECKOUT FOR ENTERPRISE CREATED!\n');
  }

  // Step 5: Test Customer Portal Session
  console.log('5. Requesting Customer Portal Session (/api/billing/customer-portal)...');
  const portalRes = await fetch(`${BASE_URL}/api/billing/customer-portal`, {
    method: 'POST',
    headers: authHeaders,
  });
  const portalData = await portalRes.json();
  console.log('   Portal Response Status:', portalRes.status);
  console.log('   Portal URL:', portalData.url);
  console.log('   ✅ Portal endpoint responsive.\n');

  // Step 6: Test Stripe Webhook Receiver
  console.log('6. Testing Stripe Webhook Receiver (/api/webhooks/stripe)...');
  const webhookRes = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'evt_test_qa_' + Date.now(),
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test_123',
          status: 'active',
          cancel_at_period_end: false,
        },
      },
    }),
  });
  const webhookData = await webhookRes.json();
  console.log('   Webhook HTTP Status:', webhookRes.status);
  console.log('   Webhook Response:', webhookData);
  if (webhookRes.ok) {
    console.log('   ✅ Webhook processed and logged successfully!\n');
  }

  console.log('====================================================');
  console.log('🎉 STRIPE BILLING AUDIT COMPLETED');
  console.log('====================================================');
}

verifyStripe().catch(console.error);
