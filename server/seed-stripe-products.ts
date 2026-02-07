import { getUncachableStripeClient } from './stripeClient';

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  const products = await stripe.products.search({ query: "name:'ICTA Webinar Monthly'" });
  if (products.data.length > 0) {
    console.log('Product already exists:', products.data[0].id);
    const prices = await stripe.prices.list({ product: products.data[0].id, active: true });
    if (prices.data.length > 0) {
      console.log('Price ID:', prices.data[0].id);
    }
    return;
  }

  const product = await stripe.products.create({
    name: 'ICTA Webinar Monthly',
    description: 'Monthly subscription - Up to 3 published webinar rooms',
    metadata: {
      plan: 'monthly',
      maxWebinars: '3',
    },
  });
  console.log('Created product:', product.id);

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 4900,
    currency: 'usd',
    recurring: { interval: 'month' },
  });
  console.log('Created monthly price:', monthlyPrice.id);
  console.log('Use this price ID for checkout:', monthlyPrice.id);
}

seedProducts()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
