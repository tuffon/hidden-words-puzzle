# Releasing

## Environments

| Env | Branch | URL | Analytics |
|---|---|---|---|
| Production | `main` | https://hiddenwordle.vercel.app | GA4 `G-M9RL6E2WL2` |
| Staging | `staging` | https://hidden-wordle-git-staging-hidden-wordle.vercel.app | muted (see below) |
| PR previews | any branch | `hidden-wordle-git-<branch>-hidden-wordle.vercel.app` | muted |

Staging and previews get their own origin, so localStorage (game state,
stats, streaks) never mixes with production.

## Flow

1. Build on a feature branch; open a PR — Vercel attaches a preview
   deployment automatically.
2. Point staging at the release candidate:
   `git push origin <branch>:staging --force`
3. Run the staging checklist below on the staging URL.
4. Merge the PR to `main` — Vercel deploys production.
5. Run the post-deploy checks.

## One-time Vercel setup (analytics separation)

In Vercel → hidden-wordle → Settings → Environment Variables:

- Scope `REACT_APP_GOOGLE_MEASUREMENT_ID` to **Production only**.
  Preview builds then never load gtag (the `trackEvent` wrapper no-ops),
  so staging play can never pollute production analytics.
- Keep `REACT_APP_GAME_NAME` (and friends) enabled for **Preview** as
  well, or preview builds show the raw `%REACT_APP_GAME_NAME%` title.
- Optional later: create a second GA4 property ("Hidden Wordle Staging")
  and set its ID as the Preview-scoped value to test analytics
  end-to-end.

## Staging checklist

- [ ] Play today's puzzle to completion (win or lose).
- [ ] Share text: `Hidden Wordle #<n> <score>/6` + emoji grid + site URL,
      and no passage reference ("Arabic 8"-style) anywhere.
- [ ] Quote modal: invocation header, verbatim body, citation line,
      "Read at bahai.org" link opens the right paragraph.
- [ ] Mobile width (390px): grid, keyboard, modals.
- [ ] Console free of errors.
- [ ] If staging analytics enabled: events visible in GA4 DebugView.

## Post-deploy (production)

- [ ] Play once on https://hiddenwordle.vercel.app.
- [ ] Paste the URL into iMessage/WhatsApp — the OG quote-card unfurls
      (or check via opengraph.xyz).
- [ ] GA4 Realtime shows `game_start` within a few minutes of real play.
- [ ] First deploy only: mark `game_won` and `share_clicked` as key
      events in GA4 Admin → Events once they appear.

## Content releases

Game content (passages, answers) is baked at build time from
`scripts/content/` (and, going forward, from justnotion-packs). Content
changes ride the same branch → staging → main flow; the pack pipeline's
verification gate must pass before a content PR is opened.
