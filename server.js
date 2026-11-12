// Minimal LiteAPI (Nuitee) booking platform — Express proxy + static frontend
// Flow: places -> rates -> prebook -> Payment SDK -> book
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const KEY = process.env.LITEAPI_KEY;
if (!KEY) console.warn('No LITEAPI_KEY set yet: site is up, searches will show a setup message.');
const IS_SANDBOX = !KEY || KEY.startsWith('sand');
app.use('/api', (req, res, next) => {
  if (KEY || req.path === '/config') return next();
  res.status(503).json({ error: 'Hotel search is being set up. Please check back soon.' });
});
const API = 'https://api.liteapi.travel/v3.0';
const BOOK = 'https://book.liteapi.travel/v3.0';

async function lite(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'X-API-Key': KEY, accept: 'application/json', 'content-type': 'application/json', ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const err = new Error(body?.error?.description || body?.error?.message || `LiteAPI ${res.status}`);
    err.status = res.status; err.body = body; throw err;
  }
  return body;
}
const wrap = fn => (req, res) => fn(req, res).catch(e => {
  console.error(e.message, JSON.stringify(e.body || {}));
  res.status(e.status || 500).json({ error: e.message });
});

app.get('/api/config', (req, res) => res.json({ sandbox: IS_SANDBOX }));

// 1) Destination autocomplete
app.get('/api/places', wrap(async (req, res) => {
  const q = encodeURIComponent(req.query.q || '');
  const data = await lite(`${API}/data/places?textQuery=${q}`);
  res.json(data.data || []);
}));

// 2) Hotels + rates for a place
app.post('/api/rates', wrap(async (req, res) => {
  const { placeId, checkin, checkout, adults = 2, currency = 'EUR', nationality = 'PL' } = req.body;
  const data = await lite(`${API}/hotels/rates`, {
    method: 'POST',
    body: JSON.stringify({
      placeId, checkin, checkout, currency, guestNationality: nationality,
      occupancies: [{ adults: Number(adults) }],
      includeHotelData: true, maxRatesPerHotel: 10, limit: 30, timeout: 10,
    }),
  });
  const info = {};
  (data.hotels || []).forEach(h => { info[h.id] = h; });
  const hotels = (data.data || []).map(h => {
    const meta = info[h.hotelId] || {};
    const offers = (h.roomTypes || []).map(rt => {
      const r = (rt.rates || [])[0] || {};
      const total = (r.retailRate?.total || [])[0] || {};
      return {
        offerId: rt.offerId,
        room: r.name || 'Room',
        board: r.boardName || '',
        refundable: r.cancellationPolicies?.refundableTag === 'RFN',
        price: total.amount, currency: total.currency,
      };
    }).filter(o => o.offerId && o.price != null).sort((a, b) => a.price - b.price);
    return {
      hotelId: h.hotelId,
      name: meta.name || h.hotelId,
      photo: meta.main_photo || meta.thumbnail || '',
      address: meta.address || '',
      stars: meta.rating || meta.stars || null,
      from: offers[0]?.price, currency: offers[0]?.currency, offers,
    };
  }).filter(h => h.offers.length).sort((a, b) => a.from - b.from);
  res.json(hotels);
}));

// 3) Prebook (creates the payment intent for the Payment SDK)
app.post('/api/prebook', wrap(async (req, res) => {
  const data = await lite(`${BOOK}/rates/prebook`, {
    method: 'POST',
    body: JSON.stringify({ offerId: req.body.offerId, usePaymentSdk: true }),
  });
  const d = data.data || {};
  res.json({ prebookId: d.prebookId, transactionId: d.transactionId, secretKey: d.secretKey, price: d.price, currency: d.currency });
}));

// 4) Book after the Payment SDK redirects back
app.post('/api/book', wrap(async (req, res) => {
  const { prebookId, transactionId, firstName, lastName, email } = req.body;
  const data = await lite(`${BOOK}/rates/book`, {
    method: 'POST',
    body: JSON.stringify({
      prebookId,
      holder: { firstName, lastName, email },
      payment: { method: 'TRANSACTION_ID', transactionId },
      guests: [{ occupancyNumber: 1, firstName, lastName, email }],
    }),
  });
  res.json(data.data || data);
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT} (${IS_SANDBOX ? 'SANDBOX' : 'LIVE'})`));
