# iptables viz

Paste the output of `iptables -vnL` (and optionally `iptables -vnL -t nat`) and see the rules as an interactive graph: source addresses on the left, destinations on the right, edges coloured by target (ACCEPT/DROP/REJECT/LOG/NAT).

## Using it

1. Paste your **filter** table output into the top textarea.
2. Optionally paste your **nat** table output into the second textarea.
3. Click **Visualize** (or press `Ctrl+Enter` inside a textarea).
4. **Demo** loads a sample rule set so you can see what a typical graph looks like.

## Reading the graph

- Each node is a unique source or destination IP/CIDR. `0.0.0.0/0` and `::/0` are collapsed into a single `ANY` node (dashed border).
- Edge colour = rule target: green ACCEPT, red DROP, amber REJECT, yellow LOG, blue NAT (DNAT/SNAT/MASQUERADE/REDIRECT), grey OTHER.
- Hover an edge for a tooltip with the full rule detail (ports, chain, state, etc).
- Click an edge to open the **details panel** on the right, which also shows an equivalent `iptables -A` command you can copy.
- Hover a **legend** item to dim every non-matching edge for a quick visual focus pass.

## Features

**Dual input** — filter and nat tables parsed separately so you can compare them in the same view.

**Action-coloured edges** — instant at-a-glance sense of what each rule does.

**Edge draw-in animation** — every edge streams in on render with a small per-rule stagger.

**Node pulse on selection** — clicking an edge highlights both endpoints with a one-shot accent pulse so you can trace it visually.

**Collapsible textareas** — after Visualize, collapse the input panes for more graph real estate.

## Files

| File | Purpose |
|------|---------|
| `app.js` | Single IIFE; `parseRules()` turns pasted text into rule objects; `layout()` places nodes on a two-column grid and computes bezier edges; `render()` builds the SVG; edge click triggers `selectEdge()` which populates the details panel and pulses endpoints |
| `style.css` | Self-contained stylesheet with light-theme overrides; contains the edge / node / legend animations |
| `index.html` | Markup including the two input textareas, legend, viz wrapper, and details panel |
