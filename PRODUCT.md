# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Groups of friends, classmates, and party players (2 to 18 people) playing together synchronously on smartphones and laptops, either in the same room or remotely over voice/chat, with zero app store installation.

## Product Purpose

SekouGaming is a real-time multi-game party portal grouping four distinct games under a unified instant-access web app (PWA):
1. **Sekouno**: Online real-time card shedding game (2 to 15 players) with custom house rules (no finishing on black Wild/+4 cards, strictly non-decreasing penalty stacking +2/+4, Contre-UNO catch, and host referee penalties).
2. **Loups-Garous**: Single-phone narrated werewolf moderator & secret role grimoire (6 to 18 players).
3. **Polychess**: Local and online FIDE chess with Elo ratings and department leaderboards (2 players).
4. **Sekou Bomb**: Fast-paced online word-bomb survival game in French and English (2 to 16 players) with authoritative server timers, live typing broadcast, and Bonus Alphabet extra-life progression.

## Positioning

Each game inside SekouGaming owns its own unmistakable, tactile physical world rather than looking like a generic dark SaaS template, while connecting instantly via 6-character room codes, share links, and QR codes on any phone browser.

## Operating Context

- Played primarily one-handed on mobile browsers (iOS Safari / Android Chrome, including installed PWA standalone mode with Dynamic Island / safe-area insets) as well as desktop browsers.
- In Sekou Bomb, the mobile virtual keyboard remains open during active turns, requiring the prompt, fuse timer, and word input to stay in the upper-middle viewport without scrolling.
- In Sekouno, strict hand secrecy is mandatory: opponents must never see which card another player drew, even when a drawn card is playable.

## Capabilities and Constraints

- Unified Express + Socket.IO server serving static Vite build (`client/dist`) and real-time rooms.
- Service Worker / HTTP caching must never serve stale app shells on deployment updates (`NetworkFirst` navigation + cache-control headers + seamless controller activation).
- Preserve untouched: `HubScreen.tsx` (main portal), `Loup-Garou`, and `Polychess`.
- Complete visual & structural redesign required for:
  - **Sekou Bomb** (Home, Lobby, Active Arena, Game Over, Modals): Graphic Game Show & Split-Flap Solari / Risograph Art Print world — warm archival art paper ground, bold solid color blocks (vermilion, cobalt, ink black, signal yellow), mechanical split-flap syllable tiles, monumental condensed display typography.
  - **Sekouno** (Home, Lobby, Game Table, Game Over, Cards & Modals): Bold Tactile Graphic Card Salon / 4-Color Architectural Print & Ticketed Table world — distinctive, non-generic, completely breaking away from dark SaaS cards.

## Brand Commitments

- Keep `HubScreen.tsx`, `Loup-Garou`, and `Polychess` untouched.
- Zero generic AI-slop dark SaaS card grids, zero em-dashes in UI copy, crisp typography and physical object metaphors.

## Evidence on Hand

- Existing logos in `client/public/sekouG_logo.jpg`, `client/public/hub/*.jpg`.
- Full French and English CC0 word dictionaries (`data/dictionaries/`) and prompt frequencies (`data/prompts/`).
- Audio synthesis & sound effects in `client/src/utils/sound.ts` and `client/src/games/sekou-bomb/sound.ts`.

## Product Principles

1. Instant threshold: joining or opening a room takes seconds via code or QR with zero friction.
2. Tactile legibility under time pressure: active turn states, timers, and playable actions read in under 200ms on a phone screen.
3. Absolute game integrity: server-authoritative timers and strict secrecy of hidden information (drawn cards, private hands).
4. Distinct worlds per game: every game feels like an authored physical artifact, never a reskinned dashboard.
