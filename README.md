# FITpips Trading Coach

A 6-month trading coaching dashboard for FITpips.

It supports:

- Weekly trade tracking for 26 weeks
- P&L screenshot upload
- 1H and 15M chart screenshot upload
- CSV trade import
- JSON backup/export
- Trade filters: Gold, BTC, Wins, Losses, A/B, D/F, Runner, Avoid
- Reconciliation panel: gross profit, gross loss, app net, broker net, difference
- Coach verdict: trade normally, reduce risk, or stop and review
- Setup library
- Daily discipline dashboard
- MFE/MAE fields
- Manual correction of P/L, grade, setup, high, and low
- Next trade checklist

## Run locally

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Upload to GitHub

```bash
git init
git add .
git commit -m "Initial FITpips trading coach"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fitpips-trading-coach.git
git push -u origin main
```

## Optional screenshot AI backend

The app already has this backend route:

```txt
app/api/analyze-week/route.js
```

To enable it, create `.env.local`:

```txt
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

Never commit `.env.local` to GitHub.

## Recommended workflow

1. Import broker CSV as the source of truth.
2. Upload screenshots as visual evidence.
3. Use the Reconciliation Panel to confirm totals.
4. Correct any trade data manually if needed.
5. Review the Coach Verdict and Next Week Action Plan.
