# VaultCardFeatures — Template Skill

## Overview

Fintech card-features showcase with scrolling feature words, rotating credit cards flying in/out, split-text INVOICES reveal, and powered-by badge.

## Spec Format (`src/vault-card-features-spec.json`)

```json
{
  "fps": 30,
  "width": 1080,
  "height": 1350,
  "durationMs": 3750,
  "bgGradientStart": "#ebedef",
  "bgGradientEnd": "#c9c9cb",
  "featureWords": [
    "Cards", "Investing", "Transfers", "Rewards", "Credit",
    "Invoices", "Deposits", "Analytics", "Wallet", "Payments",
    "Reports", "Savings", "Budgeting", "Statements", "Loans",
    "Cashback", "Crypto", "People", "Forecasts", "Digital"
  ],
  "subtitle": "Instant Digital Cards",
  "poweredByBrand": "Acme",
  "cards": [
    { "bgColor": "#0000c7", "textColor": "#ffffff", "brand": "Acme", "cardNumber": "3346", "network": "VISA" },
    { "bgColor": "#c8e6ff", "textColor": "#0000c7", "brand": "Acme", "cardNumber": "3346", "network": "VISA" },
    { "bgColor": "#1a1a1a", "textColor": "#ffffff", "brand": "Acme", "cardNumber": "3346", "network": "VISA" }
  ],
  "wordFontSize": 160,
  "wordLineHeight": 192
}
```

## Animation — The Real Motion

**Everything moves UPWARD.** Words scroll up slowly. Cards enter from below, hold at center, exit upward. Transitions are ~400ms with smooth easing, holds are ~850ms.

### Card Lifecycle (Progressive Tilt)

Each card follows this motion pattern:

1. **Enter from below** (+1350px → 0) — ~400ms, smooth easing. Card starts **STRAIGHT** (0° rotation) and **progressively tilts** during the rise.
2. **Hold at center** (0) — ~850ms, card at **peak tilt angle** (±15°).
3. **Exit upward** (0 → -1350px) — ~400ms, smooth easing. Card **tilts back toward straight** (0°) while rising.

### Alternating Tilt Directions

Tilt direction alternates between cards:
- **Card 0 (Blue):** tilts to **-15°** (counter-clockwise)
- **Card 1 (Light):** tilts to **+15°** (clockwise — opposite!)
- **Card 2 (Dark):** tilts to **-15°** (counter-clockwise — same as blue)

Cards overlap during transitions: as one exits upward, the next enters from below simultaneously.

### Precise Timeline

| Time (ms) | What's happening |
|-----------|-----------------|
| 0–400 | **Transition**: blue exits UP (tilting -15°→0°), light enters from BELOW (tilting 0°→+15°) |
| 400–1250 | Light card holds at center (+15° tilt), "Instant Digital Cards" subtitle visible |
| 1250–1650 | **Transition**: light exits UP (+15°→0°), dark enters from BELOW (0°→-15°) |
| 1650–2500 | Dark card holds at center (-15° tilt), blue icon badge next to "CRYPTO" word |
| 2500–2900 | **Transition**: dark exits UP (-15°→0°), blue enters from BELOW (0°→-15°) |
| 2900–3750 | Blue card holds at center (-15° tilt), "Powered by Acme" visible → same as start = **seamless loop** |

## Background Word Scroll

- 20 words in Manrope 800 weight, 160px, uppercase, centered, black
- **Slow** continuous upward drift: ~0.35× the word list height over 3.75s
- Words repeat 4× for seamless visual fill
- Visible words at start: SAVINGS, CARDS, INVESTING, TRANSFERS…

## Overlay Elements

| Element | When visible | Description |
|---------|-------------|-------------|
| "Powered by [icon] Acme" | Blue card phases (0–80ms fade-out, 2900+ fade-in) | Brand badge below card |
| "Instant Digital Cards" | Light card phase (400–1650ms) | Subtitle below card |
| Blue icon badge | Dark card phase (1700–2900ms) | Circle icon next to "CRYPTO" word in scroll |

## CLI Commands

```bash
npm run text:vault-card-features -- --subtitle "Instant Digital Cards" --brand "MyBank"
npm run text:vault-card-features -- --words "Cards,Investing,Transfers,Rewards,Credit"
npm run text:vault-card-features -- --brand "Finco"
```

## Architecture Notes

- `cardAnim()` helper computes Y/rotation/opacity using separate enter and exit interpolations for proper per-phase easing
- Progressive tilt: rotation interpolated from 0° → peakTilt during enter, held during hold, peakTilt → 0° during exit
- `peakTilt` parameter passed to `cardAnim()` controls direction: negative = CCW, positive = CW
- Card 0 (blue) has two phases: exit at start, re-enter at end — blended by time threshold at 1250ms
- `fitScale = Math.min(width/1080, height/1350)` for responsive sizing
- Content rendered at 1080×1350 base, scaled to fit
- Font: Manrope (Google Fonts) — weights 400, 800
- Easing: `Easing.bezier(0.4, 0, 0.2, 1)` matching Jitter's smooth standard

## File Locations

| File | Purpose |
|------|---------|
| `src/templates/VaultCardFeatures/VaultCardFeatures.tsx` | Main component |
| `src/templates/VaultCardFeatures/index.ts` | Barrel export |
| `src/vault-card-features-spec.json` | Spec JSON |
