# Close player, quiet HUD

The user's actual screenshots show an unreadable distant player and a permanent calculation panel occupying too much screen. This supersedes the v3 requirement for an always-open flat diagram.

Visual thesis: a close foreground athlete and the active crossing fill the canvas; measurements stay connected to the world, with a slim equipment badge and compact action strip.

Content plan: small top HUD, selected hook dimensions and Launch together at the bottom; flat diagrams and calculation in an explicit dismissible inspection view. Preserve the campaign, physics and saved progress.

Interaction thesis: select a hook without spending an attempt; open Diagram only when needed, pausing action; optional calculation assistance remains explicit; close returns to the same selected hook and viewpoint. Launch and automatic landing retain their current controls.

- Replace unbounded all-hook/corner fitting. Keep the player visibly large across all36 crossings, fit the active hook and landing centre where feasible, and avoid retreat caused by HUD padding.
- Keep alternate ring selection accessible even when close framing places a ring near an edge. A leader/edge indicator must remain honest about its world position.
- Default inspection has no flat SVG or calculation. Aim for at most80px desktop/100px phone and8% viewport area.
- Keep rope length in a slim badge, with its harness-to-hook meaning available in help/accessible labeling.
- Requested diagrams must remain readable, use the exact perpendicular quantities and have an explicit close control. Revealing the answer records assistance; merely opening an unsolved diagram does not.
- Verify actual player screen height and unobstructed feet/head across all stages at desktop, short landscape, portrait and phone sizes. Inspect actual screenshots, not only bounds.
- Keep generated mockups and runtime evidence separate; no additional Tripo models or spending, no deployment.
