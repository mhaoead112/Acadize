# Paymob integration – dashboard URLs

Configure these two callbacks in the **Paymob dashboard**. Replace `YOUR_API_DOMAIN` with your backend host (e.g. `your-app.onrender.com`), **no trailing slash**.

---

## 1. Transaction processed callback (server-to-server)

Paymob sends a **POST** to your server when the transaction is processed. The app uses it to activate subscriptions and update payment status.

| In Paymob dashboard | Value |
|---------------------|--------|
| **Transaction processed callback URL** | `https://YOUR_API_DOMAIN/api/webhooks/paymob` |
| **Method** | POST |

- Example production: `https://your-backend.onrender.com/api/webhooks/paymob`
- Example local: `http://localhost:3001/api/webhooks/paymob`

---

## 2. Transaction response callback (user redirect)

After payment, Paymob **redirects the user's browser** to this URL. The app then redirects the user to the correct frontend page (success or failure).

| In Paymob dashboard | Value |
|---------------------|--------|
| **Transaction response callback URL** | `https://YOUR_API_DOMAIN/api/webhooks/paymob/callback` |

- Example production: `https://your-backend.onrender.com/api/webhooks/paymob/callback`
- Example local: `http://localhost:3001/api/webhooks/paymob/callback`

If Paymob has separate "Success redirect URL" and "Failure redirect URL", set **both** to this same URL. The backend reads query params (`success`, `order`, `id`) and redirects to:

- Success → `{CLIENT_URL}/checkout-success?...`
- Failure → `{CLIENT_URL}/checkout-failed?...`

(`CLIENT_URL` is your frontend origin; set it in `.env`.)
