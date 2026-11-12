# Stays — LiteAPI (Nuitee) booking app

1. Get a sandbox key from the LiteAPI dashboard (starts with `sand_`).
2. `cp .env.example .env` and paste the key.
3. `npm install && npm start` → open http://localhost:3000
4. Search a city → pick a room → enter guest → pay with test card 4242 4242 4242 4242 → booking confirmed.

Swap to a `prod_` key to go live (the app switches the Payment SDK to live automatically).
