# Money Dashboard - Setup & Configuration Guide

**Money Dashboard** is a full-stack financial dashboard designed for freelancers and digital creators. It consolidates every income stream (brand deals, product sales, client work, other) into a single unified view with real-time analytics, monthly pacing goals, and Gemini 2.5 Flash AI insights.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```

### 3. Launch Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000` with the SQLite database initialized at `./data/money_dashboard.sqlite`.

---

## 🔑 API Keys & Connector Setup

Money Dashboard is built with a **graceful degradation** model:
- **Manual entry & CSV imports** work right out of the box with zero external API keys.
- On first launch, the app automatically seeds **6 months of sample data** (clearly labeled with a 1-click **"Clear sample data"** button).
- Each external connector shows **"Connected"** or **"Not connected"** based on environment keys, with a modal guide.

---

### 1. Gemini AI API (`GEMINI_API_KEY`)
Used **strictly** for the AI Financial Insights feature. Gemini analyzes real ledger numbers to surface best months, top revenue streams, concentration risks, and practical growth opportunities.

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click **Create API Key**.
3. Copy the key and add it to your `.env` file:
   ```env
   GEMINI_API_KEY="AIzaSy..."
   ```
*(Note: In Google AI Studio Build, this key is automatically injected from user secrets).*

---

### 2. Google Sheets Connector (`GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`)
Enables one-click synchronization with a Google Sheet containing your income records.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a GCP project.
3. In **APIs & Services > Library**, enable the **Google Sheets API**.
4. In **APIs & Services > Credentials**:
   - Click **Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback` (or your production `APP_URL`).
5. Copy the credentials into `.env`:
   ```env
   GOOGLE_CLIENT_ID="your_client_id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your_client_secret"
   ```

---

### 3. Stripe Connector (`STRIPE_SECRET_KEY`)
Automatically imports Stripe checkout payments and charges as **"Product Sales"** without manual entry.

> 🔒 **Security Best Practice**: Always use a **Restricted Read-Only Key**, never a full administrative secret key.

1. Log into your [Stripe Dashboard](https://dashboard.stripe.com/).
2. Navigate to **Developers > API Keys**.
3. Under **Restricted keys**, click **Create restricted key**:
   - Name: `Money Dashboard (Read Only)`
   - Set **Charges**: `Read`
   - Set **Balance Transactions**: `Read`
   - Leave all other permissions as `None`.
4. Click **Create key** and add to `.env`:
   ```env
   STRIPE_SECRET_KEY="rk_live_..."
   ```

---

## 🛡️ De-duplication & Data Safety

- Every transaction imported via Stripe, Google Sheets, or CSV includes a unique identifier `(connector_id, external_id)`.
- If you click **"Sync now"** multiple times, existing entries are skipped or updated in place—**never duplicated**—protecting your revenue metrics from double counting.
- Database records are stored locally in `./data/money_dashboard.sqlite`. You can also export/import full JSON backups from the **Settings** page at any time.
