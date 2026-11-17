// KostasTravel — LiteAPI (Nuitee) booking platform + API Lab
// Site flow: places / AI search -> rates -> hotel details + reviews -> prebook (+voucher) -> Payment SDK -> book -> manage/cancel
require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '200kb' }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/lab', (req, res) => res.sendFile(path.join(__dirname, 'lab.html')));

const KEY = process.env.LITEAPI_KEY;
const LAB_PASSWORD = process.env.LAB_PASSWORD || '';
if (!KEY) console.warn('No LITEAPI_KEY set yet: site is up, searches will show a setup message.');
const IS_SANDBOX = !KEY || KEY.startsWith('sand');
const BASE = {
  api: 'https://api.liteapi.travel/v3.0',
  book: 'https://book.liteapi.travel/v3.0',
  da: 'https://da.liteapi.travel',
};

app.use('/api', (req, res, next) => {
  if (KEY || req.path === '/config') return next();
  res.status(503).json({ error: 'Hotel search is being set up. Please check back soon.' });
});

// ---------- LiteAPI client with a call log (shown in the API Lab) ----------
const LOG = [];
async function lite(target, p, opts = {}) {
  const url = BASE[target] + p;
  const t0 = Date.now();
  let status = 0, body = {};
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { 'X-API-Key': KEY, accept: 'application/json', 'content-type': 'application/json' },
    });
    status = res.status;
    body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) {
      const err = new Error(body?.error?.description || body?.error?.message || (typeof body?.error === 'string' ? body.error : `LiteAPI ${res.status}`));
      err.status = res.status >= 400 ? res.status : 502; err.body = body; throw err;
    }
    return body;
  } finally {
    LOG.unshift({ at: new Date().toISOString(), method: opts.method || 'GET', url: url.replace(/^https:\/\//, ''), status, ms: Date.now() - t0 });
    LOG.length = Math.min(LOG.length, 150);
  }
}
const get = (target, p) => lite(target, p);
const post = (target, p, body, method = 'POST') => lite(target, p, { method, body: body ? JSON.stringify(body) : undefined });
const wrap = fn => (req, res) => fn(req, res).catch(e => {
  console.error(e.message, JSON.stringify(e.body || {}).slice(0, 500));
  res.status(e.status || 500).json({ error: e.message });
});
const cache = new Map();
async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  const v = await fn(); cache.set(key, { t: Date.now(), v }); return v;
}
const DAY = 864e5;

// ---------- Public site API ----------
app.get('/api/config', (req, res) => res.json({ sandbox: IS_SANDBOX, ready: !!KEY }));

// Static data: countries (nationality) + currencies, cached for a day
app.get('/api/meta', wrap(async (req, res) => {
  const [countries, currencies] = await Promise.all([
    cached('countries', DAY, () => get('api', '/data/countries').then(d => d.data || [])),
    cached('currencies', DAY, () => get('api', '/data/currencies').then(d => d.data || [])),
  ]);
  res.json({
    countries: countries.map(c => ({ code: c.code, name: c.name })).filter(c => c.code).sort((a, b) => a.name.localeCompare(b.name)),
    currencies: currencies.map(c => ({ code: c.code, name: c.currency || c.name || c.code })).filter(c => c.code),
  });
}));

// Destination autocomplete
app.get('/api/places', wrap(async (req, res) => {
  const d = await get('api', `/data/places?textQuery=${encodeURIComponent(req.query.q || '')}&language=en`);
  res.json(d.data || []);
}));

// A real hotel photo for a destination card (uses /data/hotels), cached
app.get('/api/destphoto', wrap(async (req, res) => {
  const city = String(req.query.city || ''), cc = String(req.query.cc || 'GR');
  const photo = await cached(`dp:${cc}:${city}`, DAY, async () => {
    const d = await get('api', `/data/hotels?countryCode=${encodeURIComponent(cc)}&cityName=${encodeURIComponent(city)}&limit=10`);
    const h = (d.data || []).find(x => x.main_photo) || {};
    return h.main_photo || '';
  });
  res.json({ photo });
}));

// AI "vibe" search (semantic search, beta)
app.get('/api/ai-search', wrap(async (req, res) => {
  const d = await get('api', `/data/hotels/semantic-search?query=${encodeURIComponent(req.query.q || '')}&limit=20`);
  res.json((d.data || []).map(h => ({ id: h.id, name: h.name, story: h.story, tags: h.tags, persona: h.persona, style: h.style })));
}));

// Rates: by place or by hotelIds, multi-room with children
app.post('/api/rates', wrap(async (req, res) => {
  const { placeId, hotelIds, checkin, checkout, rooms = [{ adults: 2, children: [] }], currency = 'EUR', nationality = 'GR' } = req.body;
  const occupancies = rooms.slice(0, 5).map(r => ({
    adults: Math.max(1, Number(r.adults) || 1),
    ...(r.children?.length ? { children: r.children.map(Number) } : {}),
  }));
  const q = {
    checkin, checkout, currency, guestNationality: nationality, occupancies,
    includeHotelData: true, roomMapping: true, maxRatesPerHotel: 10, limit: 200, timeout: 30,
  };
  if (hotelIds?.length) q.hotelIds = hotelIds.slice(0, 50); else q.placeId = placeId;
  // One hotel opened on its own: ask for all its rates, so pricier room types aren't cut off
  if (hotelIds?.length === 1) q.maxRatesPerHotel = 200;
  const data = await post('api', '/hotels/rates', q);
  const info = {};
  (data.hotels || []).forEach(h => { info[h.id] = h; });
  const nRooms = occupancies.length;
  const hotels = (data.data || []).map(h => {
    const meta = info[h.hotelId] || {};
    const offers = (h.roomTypes || []).map(rt => {
      const rates = rt.rates || [];
      const r = rates[0] || {};
      const total = rates.reduce((s, x) => s + Number((x.retailRate?.total || [])[0]?.amount || 0), 0);
      const cur = (r.retailRate?.total || [])[0]?.currency;
      const cp = r.cancellationPolicies || {};
      const freeUntil = cp.refundableTag === 'RFN' ? (cp.cancelPolicyInfos || []).map(i => i.cancelTime).filter(Boolean).sort()[0] || null : null;
      const taxesExcluded = (r.retailRate?.taxesAndFees || []).filter(t => t.included === false).reduce((s, t) => s + Number(t.amount || 0), 0);
      return {
        offerId: rt.offerId, room: r.name || 'Room', board: r.boardName || '', rooms: rates.length,
        mappedRoomId: r.mappedRoomId != null ? String(r.mappedRoomId) : null,
        refundable: cp.refundableTag === 'RFN', freeUntil, payAtHotel: taxesExcluded || 0,
        price: Math.round(total * 100) / 100, currency: cur, maxOccupancy: r.maxOccupancy || null,
      };
    }).filter(o => o.offerId && o.price > 0 && o.rooms >= nRooms).sort((a, b) => a.price - b.price);
    const stars = Number(meta.stars || meta.starRating) || null;
    const score = Number(meta.rating) || null;
    return {
      hotelId: h.hotelId, name: meta.name || h.hotelId,
      photo: meta.main_photo || meta.thumbnail || '', address: meta.address || '',
      lat: meta.latitude || null, lng: meta.longitude || null,
      stars: stars && stars <= 5 ? stars : null, score: score && score <= 10 ? score : null,
      reviews: meta.reviewCount || null, tags: meta.tags || [],
      from: offers[0]?.price, currency: offers[0]?.currency, offers,
    };
  }).filter(h => h.offers.length);
  res.json(hotels);
}));

// Hotel details (gallery, description, facilities, policies) — fields mapped defensively
app.get('/api/hotel/:id', wrap(async (req, res) => {
  const d = (await get('api', `/data/hotel?hotelId=${encodeURIComponent(req.params.id)}`)).data || {};
  const imgs = (d.hotelImages || d.images || []).map(i => typeof i === 'string' ? i : (i.urlHd || i.url)).filter(Boolean);
  const fac = (d.hotelFacilities || d.facilities || []).map(f => typeof f === 'string' ? f : (f.name || f.facility)).filter(Boolean);
  const strip = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  res.json({
    name: d.name, description: strip(d.hotelDescription || d.description),
    important: strip(d.hotelImportantInformation),
    images: [...new Set(imgs)].slice(0, 40), facilities: [...new Set(fac)].slice(0, 60),
    address: [d.address, d.city, d.country].filter(Boolean).join(', '),
    // check-in/out field names vary, so take the first one present
    checkin: pickTime(d, ['checkin', 'checkin_start', 'checkinStart', 'checkIn']),
    checkout: pickTime(d, ['checkout', 'checkout_end', 'checkoutEnd', 'checkOut']),
    stars: d.starRating || null, score: d.rating || null, reviews: d.reviewCount || null,
    lat: d.location?.latitude || d.latitude || null, lng: d.location?.longitude || d.longitude || null,
    rooms: contentRooms(d).map(r => ({ id: r.id, name: r.name, photo: r.photos[0] || '', photos: r.photos, beds: r.beds, size: r.size, maxOccupancy: r.maxOccupancy, description: r.description, amenities: r.amenities })),
  });
}));

function pickTime(d, keys) {
  const t = d.checkinCheckoutTimes || d.checkInCheckOutTimes || d;
  for (const k of keys) if (t && t[k]) return String(t[k]);
  return '';
}
// ---------- Room mapping (Mapping & Content) ----------
const strip = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
function contentRooms(d) {
  return (d.rooms || []).map(r => ({
    id: String(r.id),
    name: r.roomName || r.name || `Room ${r.id}`,
    description: strip(r.description).slice(0, 1500),
    maxOccupancy: r.maxOccupancy || r.maxAdults || null,
    beds: (r.bedTypes || []).map(b => `${b.quantity || 1} × ${b.bedType || b.name || 'bed'}${b.bedSize ? ` (${b.bedSize})` : ''}`),
    size: r.roomSizeSquare ? `${r.roomSizeSquare} ${r.roomSizeUnit || 'm²'}` : '',
    amenities: (r.roomAmenities || []).map(a => a.name || a).filter(Boolean).slice(0, 60),
    photos: (r.photos || []).map(p => p.url || p.hd_url || p.failoverPhoto).filter(Boolean).slice(0, 20),
  }));
}
// One hotel: every supplier rate + the master room list it should resolve to
app.post('/api/mapping/hotel', wrap(async (req, res) => {
  const { hotelId, checkin, checkout, adults = 2, currency = 'EUR', nationality = 'GR' } = req.body;
  const [rates, details] = await Promise.all([
    post('api', '/hotels/rates', {
      hotelIds: [hotelId], checkin, checkout, currency, guestNationality: nationality,
      occupancies: [{ adults: Number(adults) || 2 }], roomMapping: true, maxRatesPerHotel: 500, timeout: 15,
    }),
    get('api', `/data/hotel?hotelId=${encodeURIComponent(hotelId)}`).then(x => x.data || {}),
  ]);
  const rows = [];
  ((rates.data || [])[0]?.roomTypes || []).forEach(rt => (rt.rates || []).forEach(r => rows.push({
    supplierName: r.name || '(no name)',
    mappedRoomId: r.mappedRoomId != null && r.mappedRoomId !== '' && r.mappedRoomId !== 0 ? String(r.mappedRoomId) : null,
    board: r.boardName || r.boardType || '', refundable: r.cancellationPolicies?.refundableTag === 'RFN',
    price: Number((r.retailRate?.total || [])[0]?.amount || 0), currency: (r.retailRate?.total || [])[0]?.currency || currency,
    supplier: rt.supplier || r.supplier || '', maxOccupancy: r.maxOccupancy || null,
  })));
  res.json({
    hotel: { id: hotelId, name: details.name || hotelId, address: [details.address, details.city].filter(Boolean).join(', '), photo: details.main_photo || '' },
    contentRooms: contentRooms(details), rates: rows,
  });
}));
// A whole destination: mapping coverage per hotel, to see where failures concentrate
app.post('/api/mapping/scan', wrap(async (req, res) => {
  const { placeId, checkin, checkout, adults = 2, currency = 'EUR', nationality = 'GR' } = req.body;
  const data = await post('api', '/hotels/rates', {
    placeId, checkin, checkout, currency, guestNationality: nationality, occupancies: [{ adults: Number(adults) || 2 }],
    roomMapping: true, includeHotelData: true, maxRatesPerHotel: 100, limit: 200, timeout: 30,
  });
  const info = {}; (data.hotels || []).forEach(h => { info[h.id] = h; });
  res.json((data.data || []).map(h => {
    const rates = (h.roomTypes || []).flatMap(rt => rt.rates || []);
    const mapped = rates.filter(r => r.mappedRoomId != null && r.mappedRoomId !== '' && r.mappedRoomId !== 0);
    const prices = rates.map(r => Number((r.retailRate?.total || [])[0]?.amount || 0)).filter(Boolean).sort((a, b) => a - b);
    return {
      hotelId: h.hotelId, name: info[h.hotelId]?.name || h.hotelId, stars: info[h.hotelId]?.stars || null,
      rates: rates.length, mapped: mapped.length,
      names: new Set(rates.map(r => (r.name || '').trim().toLowerCase())).size,
      unmappedNames: new Set(rates.filter(r => !mapped.includes(r)).map(r => (r.name || '').trim().toLowerCase())).size,
      masterRooms: new Set(mapped.map(r => String(r.mappedRoomId))).size,
      medianPrice: prices.length ? prices[Math.floor(prices.length / 2)] : 0,
      currency: (rates[0]?.retailRate?.total || [])[0]?.currency || currency,
    };
  }));
}));
app.get('/mapping', (req, res) => res.sendFile(path.join(__dirname, 'mapping.html')));

// Guest reviews + AI sentiment analysis
app.get('/api/reviews/:id', wrap(async (req, res) => {
  const d = await get('api', `/data/reviews?hotelId=${encodeURIComponent(req.params.id)}&limit=20&getSentiment=true`);
  const s = d.sentimentAnalysis || d.data?.sentimentAnalysis || {};
  const list = Array.isArray(d.data) ? d.data : (d.data?.reviews || []);
  res.json({
    reviews: list.slice(0, 20).map(r => ({
      score: r.averageScore ?? r.score ?? null, name: r.name || 'Guest', country: r.country || '', type: r.type || '',
      date: r.date || '', headline: r.headline || '', pros: r.pros || '', cons: r.cons || '',
    })),
    sentiment: {
      pros: s.pros || [], cons: s.cons || [],
      categories: (s.categories || []).map(c => ({ name: c.name, rating: c.rating, description: c.description })),
    },
  });
}));

// Prebook (locks price, creates payment intent; optional voucher)
app.post('/api/prebook', wrap(async (req, res) => {
  const body = { offerId: req.body.offerId, usePaymentSdk: true };
  if (req.body.voucherCode) body.voucherCode = String(req.body.voucherCode).trim();
  const d = (await post('book', '/rates/prebook', body)).data || {};
  const rate = d.roomTypes?.[0]?.rates?.[0] || {};
  res.json({
    prebookId: d.prebookId, transactionId: d.transactionId, secretKey: d.secretKey,
    price: d.price, currency: d.currency,
    priceDifferencePercent: d.priceDifferencePercent || 0,
    cancellationChanged: !!d.cancellationChanged, boardChanged: !!d.boardChanged,
    voucherTotalAmount: d.voucherTotalAmount || 0,
    cancelPolicies: (rate.cancellationPolicies?.cancelPolicyInfos || []).map(c => ({ until: c.cancelTime, amount: c.amount, currency: c.currency })),
    remarks: String(rate.cancellationPolicies?.hotelRemarks?.[0] || rate.remarks || '').replace(/<[^>]+>/g, ' ').slice(0, 600),
  });
}));

// Book after the Payment SDK redirects back
app.post('/api/book', wrap(async (req, res) => {
  const { prebookId, transactionId, firstName, lastName, email, rooms = 1 } = req.body;
  const holder = { firstName, lastName, email };
  const clientReference = 'PX-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const d = (await post('book', '/rates/book', {
    prebookId, clientReference, holder,
    payment: { method: 'TRANSACTION_ID', transactionId },
    guests: Array.from({ length: Math.max(1, Number(rooms) || 1) }, (_, i) => ({ occupancyNumber: i + 1, firstName, lastName, email })),
  })).data || {};
  res.json({
    bookingId: d.bookingId, status: d.status, hotelConfirmationCode: d.hotelConfirmationCode,
    clientReference: d.clientReference || clientReference, price: d.price, currency: d.currency,
    checkin: d.checkin, checkout: d.checkout, hotel: d.hotel?.name || '',
  });
}));

// Manage booking: only if the email matches the booking
async function ownedBooking(bookingId, email) {
  if (!bookingId || !email) { const e = new Error('Booking ID and email are required.'); e.status = 400; throw e; }
  const d = (await get('book', `/bookings/${encodeURIComponent(bookingId)}`)).data || {};
  if (!JSON.stringify(d).toLowerCase().includes(String(email).trim().toLowerCase())) {
    const e = new Error('No booking found for that ID and email.'); e.status = 404; throw e;
  }
  return d;
}
const bookingView = d => ({
  bookingId: d.bookingId, status: d.status, hotel: d.hotel?.name || '', checkin: d.checkin, checkout: d.checkout,
  price: d.price, currency: d.currency, hotelConfirmationCode: d.hotelConfirmationCode, clientReference: d.clientReference,
  refundable: d.cancellationPolicies?.refundableTag === 'RFN',
  cancelPolicies: (d.cancellationPolicies?.cancelPolicyInfos || []).map(c => ({ until: c.cancelTime, amount: c.amount, currency: c.currency })),
  rooms: (d.bookedRooms || []).map(r => ({ name: r.roomType?.name || '', adults: r.adults, children: r.children })),
});
app.post('/api/my-booking', wrap(async (req, res) => {
  res.json(bookingView(await ownedBooking(req.body.bookingId, req.body.email)));
}));
app.post('/api/my-booking/cancel', wrap(async (req, res) => {
  await ownedBooking(req.body.bookingId, req.body.email);
  const d = (await post('book', `/bookings/${encodeURIComponent(req.body.bookingId)}`, null, 'PUT')).data || {};
  res.json({ status: d.status || 'CANCELLED', refund: d.refund_amount ?? d.refundAmount ?? null, currency: d.currency || '' });
}));

// ---------- API Lab (password-protected raw access to every endpoint) ----------
const LAB_ALLOW = [
  ['GET', 'api', /^\/data\/(countries|currencies|facilities|hotelTypes|chains|iataCodes|cities|places|hotels|hotel|reviews|hotels\/semantic-search)(\?|$)/],
  ['POST', 'api', /^\/hotels\/(rates|min-rates)$/],
  ['GET', 'api', /^\/(loyalties\/?|guests\/[^/]+(\/bookings)?)$/],
  ['POST', 'book', /^\/rates\/prebook$/],
  ['GET', 'book', /^\/bookings(\?|\/[^/?]+$)/],
  ['PUT', 'book', /^\/bookings\/[^/?]+$/],
  ['GET', 'da', /^\/vouchers(\/[^/?]+)?$/],
  ['POST', 'da', /^\/vouchers$/],
  ['POST', 'da', /^\/analytics\/(weekly|report|markets|hotels)$/],
];
function labAuth(req, res, next) {
  if (!LAB_PASSWORD) return res.status(403).json({ error: 'API Lab is off. Set LAB_PASSWORD in Render > Environment to enable it.' });
  const a = Buffer.from(String(req.get('x-lab-key') || '')), b = Buffer.from(LAB_PASSWORD);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Wrong lab password.' });
  next();
}
app.get('/api/lab/log', labAuth, (req, res) => res.json(LOG));
app.post('/api/lab/call', labAuth, async (req, res) => {
  const { method = 'GET', target = 'api', path: p = '', body } = req.body || {};
  if (!LAB_ALLOW.some(([m, t, re]) => m === method && t === target && re.test(p))) {
    return res.status(400).json({ error: `Not allowed in the lab: ${method} ${target} ${p}` });
  }
  const t0 = Date.now();
  try {
    const data = await lite(target, p, { method, body: body && method !== 'GET' ? JSON.stringify(body) : undefined });
    res.json({ ok: true, ms: Date.now() - t0, data });
  } catch (e) {
    res.status(200).json({ ok: false, ms: Date.now() - t0, status: e.status, error: e.message, data: e.body });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT} (${IS_SANDBOX ? 'SANDBOX' : 'LIVE'})${LAB_PASSWORD ? ' — API Lab on /lab' : ''}`));
