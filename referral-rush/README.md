# BNI Royals – Referral Rush

A 3-lane endless runner for the BNI Royals chapter. It's one responsive page (`index.html`) with no build step, and the same file serves phones, laptops and projectors.

## Setup

1. Save the chapter's official logo as `assets/bni-logo.png`. Until you do, a red "BNI" text badge stands in (see `assets/README.md`).
2. Host this folder as static files and share the URL. On a phone, "Add to Home Screen" installs it full-screen with its own icon (`manifest.webmanifest`, `icons/`).

## Start screen

- **Choose your seat**, each with a perk:
  - President: meetings grow your multiplier 25% more.
  - Vice President: junk slips cost half the trust.
  - Secretary / Treasurer: starts every run with a Substitute.
  - Member: the rival starts further back, and 1-to-1s give +35 trust.
- **Dress code:** Suit & tie, or Blazer & skirt. Every character wears business formals and carries a briefcase; the President also wears a chain of office. The seat and dress code are remembered on each device.

## Mobile

Swipe controls fire mid-gesture, and the page doesn't scroll or zoom during a run. The HUD stays clear of notches and home bars (safe-area insets). The phone vibrates on crashes and gates, the screen stays awake during a run, and Android phones go full-screen when a run starts.

Play it by opening `index.html` in a browser, or host the folder anywhere static (GitHub Pages, Netlify, Vercel) and put the URL behind a QR code.

## How the lesson is built into the mechanics

| Mechanic | What it teaches |
|---|---|
| Rival from your category chases you; every crash lets them close in | Category scarcity: someone wants your seat |
| Weekly Meeting gate every 400 m gives away every slip you hold | Giving happens at the meeting; slips you never give are worth nothing |
| Multiplier grows **only** from gold slips + visitors given at a gate | Givers Gain as scoring |
| Grey "?" slips: shiny, frequent, easy lanes, +30 points, −5 trust | Goodhart trap: easy volume inflates the score and destroys trust |
| Trust at 0: multiplier resets, rival gains every second, gate giving stops counting | Low-quality referrals cost you standing |
| 1-to-1 filter coffee: +25 trust | 1-to-1s build trust |
| Visitors only count once you reach the meeting holding them | Bringing visitors means turning up |
| TYFCB ₹ notes spawn more often the more gold you have given | What you give comes back as business |
| Missed-meeting pit: falling in loses the slips you are holding | Absence costs the chapter your referrals |
| Substitute power-up absorbs one crash | Sending a sub protects your seat |
| End screen: Green / Yellow / Red scorecard + one-line diagnosis | Mirrors the traffic-light report |

## Scorecard (100 points)

Meetings 15 (3 each) · Referrals given 25 (0.35 each) · Visitors 15 (5 each) · 1-to-1s 15 (4 each) · TYFCB 10 (2.5 per deal) · Trust averaged over the run 20.
Green ≥ 70 · Yellow ≥ 45 · Red below 45.

## Controls

← → change lane · ↑ / Space jump · ↓ slide (fast-drop in the air) · P / Esc pause · swipe on touch.

## v1 scope (built)

3 lanes, a chaser, gold/grey slips, 4 obstacles (traffic jam, "Busy this week" wall, cold-pitch spam cloud, missed-meeting pit), 3 power-ups (Power Team magnet, Givers Gain 2x, Substitute shield), meeting gates with the giving multiplier, a Trust meter and the traffic-light end screen. The setting is a Chennai street on a breakfast-meeting morning, branded red and white: red-and-white kerbs and buildings, BNI Royals banners on the lamp posts and billboards, and a red meeting gate hung with a marigold garland. It keeps Chennai details such as yellow autos, a gopuram skyline and filter-kaapi stalls.

## v2 backlog

Missions, a 60-second pitch QTE at gates, a shared chapter leaderboard, Power Team combo chains, Mentor jetpack.
