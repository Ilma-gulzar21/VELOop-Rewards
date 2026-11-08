# Reward denominations – items to confirm

The assignment requires the **existing VELoop payout pages** to be the source of truth for denominations and required VEs
(`/Payout?method=upi`, `?method=amazon`, `?method=googlePlay`). Those pages are behind login and could not be read automatically, and the assignment forbids guessing, so:

- **No production denominations are invented or hard-coded.** They live in MongoDB and are managed from the admin panel.
- `Backend/seed/rewardOptions.demo.json` contains **DEMO PLACEHOLDER** values (used only by `npm run seed:demo`).
- The assignment's own examples (₹10 ≙ 2,400 VEs; ₹25 Amazon ≙ 5,800 VEs) are described there as *illustrative*, so they are not treated as verified.

## To finish

1. Log in to the live VELoop payout pages and copy every denomination and its required VEs for UPI, Amazon and Google Play (and any eligibility notes).
2. Copy `Backend/seed/rewardOptions.verified.example.json` to `rewardOptions.verified.json`, fill in the confirmed values, set `"confirmed": true`.
3. Run `npm run seed:data`. It only creates missing options and never overwrites options already edited by an admin.
4. Record below what was confirmed, by whom and when.

| Method | Reward (₹) | Required VEs | Confirmed by / date |
|---|---|---|---|
| UPI | _pending_ | _pending_ | |
| Amazon | _pending_ | _pending_ | |
| Google Play | _pending_ | _pending_ | |
