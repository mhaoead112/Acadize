# Paymob integration – dashboard URLs

Use these endpoints in the **Paymob dashboard** for where to send users after payment.

## Backend callback (recommended)

The app uses a **single backend callback**. Paymob redirects the user to this URL after payment; the server then redirects to the correct frontend page based on success/failure.

- **Callback URL (use for both success and failure in Paymob):**
  ```text
  https://YOUR_API_DOMAIN/api/webhooks/paymob/callback
  ```
  Replace `YOUR_API_DOMAIN` with your backend host (e.g. `api.acadize.com` or `your-app.onrender.com`), **no trailing slash**.

- **Examples:**
  - Production: `https://your-backend.onrender.com/api/webhooks/paymob/callback`
  - Local: `http://localhost:3001/api/webhooks/paymob/callback`

If the Paymob dashboard has **separate fields** for “Success redirect URL” and “Failure redirect URL”, you can set **both** to this same callback URL. Paymob will append query params (`success=true` or `success=false`, `order`, `id`); the backend reads them and redirects the user to the correct frontend page.

## Frontend pages (for reference only)

After the callback, users are sent to:

- **Success:** `{CLIENT_URL}/checkout-success?order=...&transaction=...`
- **Failure:** `{CLIENT_URL}/checkout-failed?order=...&transaction=...`  
  (`CLIENT_URL` is your frontend origin, e.g. `https://app.acadize.com` or `http://localhost:5173`.)

You do **not** put these frontend URLs in the Paymob dashboard; the backend builds them using the `CLIENT_URL` env var.

## Webhook (server-to-server)

For **transaction processed** callbacks (server-to-server), configure in Paymob:

- **Webhook URL:** `https://YOUR_API_DOMAIN/api/webhooks/paymob`  
  Method: **POST**. Used to activate subscriptions and update payment status.
