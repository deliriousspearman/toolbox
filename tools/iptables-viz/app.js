(function () {
  "use strict";

  // ── Colors keyed by target ──────────────────────────────────────────────
  const TARGET_COLORS = {
    ACCEPT: "#00c853",
    DROP: "#ff5252",
    REJECT: "#ff9100",
    LOG: "#ffd600",
    DNAT: "#40c4ff",
    SNAT: "#40c4ff",
    MASQUERADE: "#40c4ff",
    REDIRECT: "#40c4ff",
    RETURN: "#9e9e9e",
  };

  function colorFor(target) {
    return TARGET_COLORS[target] || "#9e9e9e";
  }

  // ── Parser ──────────────────────────────────────────────────────────────

  // Numbers in iptables output may carry K/M/G suffixes for large values
  // (e.g. "195K", "2.3M"). This regex accepts both plain and suffixed forms.
  const COUNT_RE = /^\d+(?:\.\d+)?[KMGT]?$/;

  function parseIptables(text, table) {
    if (!text || !text.trim()) return { rules: [], chains: [] };
    const lines = text.split(/\r?\n/);
    const rules = [];
    const chains = [];
    let currentChain = null;
    let hasLineNum = false;
    let lineIndex = 0;

    for (const raw of lines) {
      lineIndex++;
      const line = raw.trim();
      if (!line) continue;

      /* Built-in chains: "Chain INPUT (policy DROP 0 packets, 0 bytes)"
         User-defined:    "Chain MYCHAIN (2 references)"
         Capture the policy word when present; user-defined chains
         leave group 2 undefined and are skipped from the policy bar. */
      const chainMatch = line.match(/^Chain\s+(\S+)\s*\((?:policy\s+(\S+))?/i);
      if (chainMatch) {
        currentChain = chainMatch[1];
        const policy = chainMatch[2] ? chainMatch[2].toUpperCase() : null;
        chains.push({ table, chain: currentChain, policy });
        hasLineNum = false;
        continue;
      }

      // Header row: "[num] pkts bytes target prot opt in out source destination ..."
      const headerMatch = line.match(/^(num\s+)?pkts\s+bytes\s+target/i);
      if (headerMatch) {
        hasLineNum = !!headerMatch[1];
        continue;
      }

      if (!currentChain) continue;

      const parts = line.split(/\s+/);
      // With --line-numbers: num pkts bytes target prot opt in out src dst = 10 cols
      // Without:                 pkts bytes target prot opt in out src dst = 9 cols
      const offset = hasLineNum ? 1 : 0;
      if (parts.length < 9 + offset) continue;

      // First column is a counter (or a line number when hasLineNum); validate.
      if (!COUNT_RE.test(parts[0])) continue;

      const ruleLineNum = hasLineNum ? parts[0] : null;

      const rule = {
        table,
        chain: currentChain,
        ruleLineNum,
        raw: raw.replace(/\s+$/, ""),
        pkts: parts[0 + offset],
        bytes: parts[1 + offset],
        target: parts[2 + offset],
        prot: parts[3 + offset],
        opt: parts[4 + offset],
        in: parts[5 + offset],
        out: parts[6 + offset],
        src: parts[7 + offset],
        dst: parts[8 + offset],
        extra: parts.slice(9 + offset).join(" "),
        dport: null,
        sport: null,
        toDest: null,
        toSource: null,
        state: null,
      };

      // Parse common match options out of extra
      const extra = rule.extra;
      const dportMatch = extra.match(/dpt:(\S+)/);
      if (dportMatch) rule.dport = dportMatch[1];
      const sportMatch = extra.match(/spt:(\S+)/);
      if (sportMatch) rule.sport = sportMatch[1];
      const dportsMatch = extra.match(/dports\s+(\S+)/);
      if (dportsMatch) rule.dport = dportsMatch[1];
      const toMatch = extra.match(/to:(\S+)/);
      if (toMatch) {
        if (rule.target === "SNAT") rule.toSource = toMatch[1];
        else rule.toDest = toMatch[1];
      }
      const stateMatch = extra.match(/state\s+([A-Z,]+)/);
      if (stateMatch) rule.state = stateMatch[1];
      const ctMatch = extra.match(/ctstate\s+([A-Z,]+)/);
      if (ctMatch) rule.state = ctMatch[1];

      rules.push(rule);
    }
    return { rules, chains };
  }

  // ── Command generator ──────────────────────────────────────────────────

  function generateCommand(rule) {
    const parts = ["iptables"];
    if (rule.table && rule.table !== "filter") parts.push("-t", rule.table);
    parts.push("-A", rule.chain);

    if (rule.prot && rule.prot !== "all") parts.push("-p", rule.prot);
    if (rule.in && rule.in !== "*") parts.push("-i", rule.in);
    if (rule.out && rule.out !== "*") parts.push("-o", rule.out);
    if (rule.src && rule.src !== "0.0.0.0/0") parts.push("-s", rule.src);
    if (rule.dst && rule.dst !== "0.0.0.0/0") parts.push("-d", rule.dst);

    if (rule.state) {
      parts.push("-m", "conntrack", "--ctstate", rule.state);
    }
    if (rule.sport) parts.push("--sport", rule.sport);
    if (rule.dport) parts.push("--dport", rule.dport);

    parts.push("-j", rule.target);

    if (rule.toDest) parts.push("--to-destination", rule.toDest);
    if (rule.toSource) parts.push("--to-source", rule.toSource);

    return parts.join(" ");
  }

  // ── Node key normalisation ─────────────────────────────────────────────

  function normalizeIp(ip) {
    if (!ip) return "ANY";
    if (ip === "0.0.0.0/0" || ip === "::/0") return "ANY";
    return ip;
  }

  // ── Layout ─────────────────────────────────────────────────────────────
  // Columns: sources on left, destinations on right. Chain labels between.

  function computeLayout(rules, width) {
    const NODE_W = 150;
    const NODE_H = 34;
    const V_GAP = 14;
    const PADDING_TOP = 50;
    const LEFT_X = 90;
    const RIGHT_X = Math.max(width - NODE_W - 90, LEFT_X + 280);

    // Collect unique sources and destinations in insertion order
    const srcOrder = [];
    const dstOrder = [];
    const srcSet = new Set();
    const dstSet = new Set();

    for (const r of rules) {
      const s = normalizeIp(r.src);
      const d = normalizeIp(r.dst);
      if (!srcSet.has(s)) { srcSet.add(s); srcOrder.push(s); }
      if (!dstSet.has(d)) { dstSet.add(d); dstOrder.push(d); }
    }

    // Put ANY first for visual prominence
    const putAnyFirst = (arr) => {
      const i = arr.indexOf("ANY");
      if (i > 0) { arr.splice(i, 1); arr.unshift("ANY"); }
    };
    putAnyFirst(srcOrder);
    putAnyFirst(dstOrder);

    const nodes = [];
    const nodeMap = new Map();

    srcOrder.forEach((ip, i) => {
      const n = {
        id: "src:" + ip,
        ip,
        side: "left",
        x: LEFT_X,
        y: PADDING_TOP + i * (NODE_H + V_GAP),
        w: NODE_W,
        h: NODE_H,
      };
      nodes.push(n);
      nodeMap.set(n.id, n);
    });

    dstOrder.forEach((ip, i) => {
      const n = {
        id: "dst:" + ip,
        ip,
        side: "right",
        x: RIGHT_X,
        y: PADDING_TOP + i * (NODE_H + V_GAP),
        w: NODE_W,
        h: NODE_H,
      };
      nodes.push(n);
      nodeMap.set(n.id, n);
    });

    // Build edges
    const edges = rules.map((rule) => {
      const from = nodeMap.get("src:" + normalizeIp(rule.src));
      const to = nodeMap.get("dst:" + normalizeIp(rule.dst));
      return { from, to, rule };
    });

    const totalHeight =
      PADDING_TOP +
      Math.max(srcOrder.length, dstOrder.length) * (NODE_H + V_GAP) +
      30;

    return {
      nodes,
      edges,
      width: RIGHT_X + NODE_W + 20,
      height: totalHeight,
      centerX: (LEFT_X + NODE_W + RIGHT_X) / 2,
    };
  }

  // ── SVG helpers ─────────────────────────────────────────────────────────

  const SVG_NS = "http://www.w3.org/2000/svg";

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const state = {
    rules: [],
    selectedEdge: null,
    selectedRuleIdx: null,
  };

  /* Policy bar: one pill per built-in chain with its default policy,
     coloured by the same target-colour scheme as edges / legend. Hides
     itself when the chain list has no policy-bearing entries (either
     no input or only user-defined chains).                          */
  function renderPolicyBar(chains) {
    const bar = document.getElementById("policy-bar");
    if (!bar) return;
    bar.textContent = "";
    const withPolicy = (chains || []).filter(c => c.policy);
    if (!withPolicy.length) {
      bar.classList.add("hidden");
      return;
    }
    bar.classList.remove("hidden");

    const label = document.createElement("span");
    label.className = "policy-bar-label";
    label.textContent = "CHAIN POLICIES";
    bar.appendChild(label);

    for (const { table, chain, policy } of withPolicy) {
      const pill = document.createElement("span");
      pill.className = "policy-pill";
      pill.dataset.policy = policy;
      pill.appendChild(document.createTextNode(table + "/" + chain + ": "));
      const val = document.createElement("span");
      val.className = "policy-value";
      val.textContent = policy;
      val.style.color = colorFor(policy);
      pill.appendChild(val);
      bar.appendChild(pill);
    }
  }

  function render(rules) {
    state.rules = rules;
    state.selectedEdge = null; // DOM ref becomes stale; re-populated below
    const viz = document.getElementById("viz");
    const wrap = viz.parentElement;
    const empty = document.getElementById("empty-state");

    if (!rules.length) {
      clear(viz);
      viz.setAttribute("width", wrap.clientWidth);
      viz.setAttribute("height", wrap.clientHeight);
      empty.classList.remove("hidden");
      document.getElementById("stats").textContent = "";
      return;
    }

    empty.classList.add("hidden");

    const width = Math.max(wrap.clientWidth, 640);
    const layout = computeLayout(rules, width);

    viz.setAttribute("width", Math.max(layout.width, width));
    viz.setAttribute("height", layout.height);
    viz.setAttribute("viewBox", `0 0 ${Math.max(layout.width, width)} ${layout.height}`);
    clear(viz);

    // Column labels
    const leftX = layout.nodes.find((n) => n.side === "left")?.x || 90;
    const rightX = layout.nodes.find((n) => n.side === "right")?.x || width - 90;
    const nodeW = 150;
    const src = svgEl("text", {
      x: leftX + nodeW / 2,
      y: 22,
      class: "col-label",
    });
    src.textContent = "SOURCE";
    viz.appendChild(src);
    const dst = svgEl("text", {
      x: rightX + nodeW / 2,
      y: 22,
      class: "col-label",
    });
    dst.textContent = "DESTINATION";
    viz.appendChild(dst);

    // Arrowhead marker defs -- one per target color so stroke-matching works
    const defs = svgEl("defs");
    const colors = new Set(
      rules.map((r) => colorFor(r.target))
    );
    for (const c of colors) {
      const id = "arrow-" + c.replace("#", "");
      const m = svgEl("marker", {
        id,
        viewBox: "0 0 10 10",
        refX: "10",
        refY: "5",
        markerUnits: "strokeWidth",
        markerWidth: "7",
        markerHeight: "7",
        orient: "auto",
      });
      const p = svgEl("path", {
        d: "M 0 0 L 10 5 L 0 10 z",
        fill: c,
      });
      m.appendChild(p);
      defs.appendChild(m);
    }
    viz.appendChild(defs);

    // Edges: draw first so nodes render on top
    const edgesGroup = svgEl("g", { class: "edges" });
    viz.appendChild(edgesGroup);

    // Group edges by (from, to) so parallel edges can be offset and each
    // remains individually hoverable instead of stacking into one path.
    const groups = new Map();
    layout.edges.forEach((edge, i) => {
      if (!edge.from || !edge.to) return;
      const key = edge.from.id + "→" + edge.to.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(i);
    });
    const groupPos = new Map(); // edge index → { size, idx }
    for (const indices of groups.values()) {
      indices.forEach((origIdx, idx) => {
        groupPos.set(origIdx, { size: indices.length, idx });
      });
    }

    layout.edges.forEach((edge, i) => {
      const { from, to, rule } = edge;
      if (!from || !to) return;

      const x1 = from.x + from.w;
      const y1 = from.y + from.h / 2;
      const x2 = to.x;
      const y2 = to.y + to.h / 2;

      // Offset parallel edges so they don't overlap
      const g = groupPos.get(i) || { size: 1, idx: 0 };
      const yOffset = g.size > 1 ? (g.idx - (g.size - 1) / 2) * 14 : 0;

      // Bezier with horizontal offset proportional to gap
      const dx = Math.max((x2 - x1) * 0.5, 80);
      const d = `M ${x1} ${y1} C ${x1 + dx} ${y1 + yOffset}, ${x2 - dx} ${y2 + yOffset}, ${x2} ${y2}`;

      const color = colorFor(rule.target);
      const path = svgEl("path", {
        d,
        class: "edge",
        stroke: color,
        "marker-end": `url(#arrow-${color.replace("#", "")})`,
        "data-rule-idx": String(i),
        "data-target": rule.target,
        /* Normalising pathLength to 1 lets CSS animate stroke-dashoffset
           from 1 → 0 regardless of the actual path length, so every edge
           draws in at the same visual speed. */
        pathLength: "1",
      });
      /* Stagger the draw-in so rules appear to stream in sequentially
         rather than popping all at once. */
      path.style.animationDelay = (i * 0.035) + "s";
      if (i === state.selectedRuleIdx) {
        path.classList.add("selected");
        state.selectedEdge = path;
      }
      edgesGroup.appendChild(path);

      attachEdgeHandlers(path, edge, i);
    });

    // Nodes
    const nodesGroup = svgEl("g", { class: "nodes" });
    viz.appendChild(nodesGroup);

    for (const n of layout.nodes) {
      const g = svgEl("g", {
        transform: `translate(${n.x}, ${n.y})`,
        "data-node-id": n.id,
      });
      const rect = svgEl("rect", {
        width: n.w,
        height: n.h,
        rx: 3,
        class: "node-rect" + (n.ip === "ANY" ? " any" : ""),
      });
      const text = svgEl("text", {
        x: n.w / 2,
        y: n.h / 2,
        class: "node-text",
      });
      // Truncate long labels (e.g. full IPv6) but keep full value in a <title>
      // so hovering the node still shows it.
      const MAX = 18;
      text.textContent = n.ip.length > MAX ? n.ip.slice(0, MAX - 1) + "…" : n.ip;
      if (n.ip.length > MAX) {
        const title = svgEl("title");
        title.textContent = n.ip;
        g.appendChild(title);
      }
      g.appendChild(rect);
      g.appendChild(text);
      nodesGroup.appendChild(g);
    }

    // Stats
    const ntabs = new Set(rules.map((r) => r.table)).size;
    const nchains = new Set(rules.map((r) => r.table + ":" + r.chain)).size;
    document.getElementById("stats").textContent =
      `${rules.length} rules · ${nchains} chains · ${ntabs} table${ntabs === 1 ? "" : "s"}`;
  }

  // ── Edge interactivity ──────────────────────────────────────────────────

  function attachEdgeHandlers(path, edge, idx) {
    path.addEventListener("mousemove", (e) => showTooltip(e, edge));
    path.addEventListener("mouseleave", hideTooltip);
    path.addEventListener("click", () => selectEdge(path, edge, idx));
  }

  function showTooltip(e, edge) {
    const tt = document.getElementById("tooltip");
    const r = edge.rule;
    const meta = [];
    if (r.prot && r.prot !== "all") meta.push(r.prot);
    if (r.dport) meta.push("dport " + r.dport);
    if (r.sport) meta.push("sport " + r.sport);
    if (r.in && r.in !== "*") meta.push("in " + r.in);
    if (r.out && r.out !== "*") meta.push("out " + r.out);
    if (r.state) meta.push("state " + r.state);
    if (r.toDest) meta.push("to " + r.toDest);
    if (r.toSource) meta.push("src " + r.toSource);

    // Build with DOM APIs to avoid any HTML-injection risk from parsed input.
    tt.textContent = "";
    const targetSpan = document.createElement("span");
    targetSpan.className = "tt-target";
    targetSpan.style.color = colorFor(r.target);
    targetSpan.textContent = r.target;
    tt.appendChild(targetSpan);
    tt.appendChild(document.createTextNode(` ${r.src} → ${r.dst}`));
    const metaDiv = document.createElement("div");
    metaDiv.className = "tt-meta";
    metaDiv.textContent = `${r.table}/${r.chain}` + (meta.length ? " · " + meta.join(" · ") : "");
    tt.appendChild(metaDiv);
    tt.classList.remove("hidden");

    // Position tooltip near cursor, keeping it on-screen
    const pad = 14;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = tt.getBoundingClientRect();
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    if (x + rect.width > vw - 8) x = e.clientX - rect.width - pad;
    if (y + rect.height > vh - 8) y = e.clientY - rect.height - pad;
    tt.style.left = x + "px";
    tt.style.top = y + "px";
  }

  function hideTooltip() {
    document.getElementById("tooltip").classList.add("hidden");
  }

  function selectEdge(path, edge, idx) {
    if (state.selectedEdge) {
      state.selectedEdge.classList.remove("selected");
    }
    path.classList.add("selected");
    state.selectedEdge = path;
    state.selectedRuleIdx = idx;

    pulseEndpoints(edge.from && edge.from.id, edge.to && edge.to.id);

    const r = edge.rule;
    const chainLine = `${r.table} / ${r.chain}` +
      (r.ruleLineNum ? ` (line ${r.ruleLineNum})` : "") +
      ` · ${r.pkts} pkts / ${r.bytes} bytes`;
    document.getElementById("d-chain").textContent = chainLine;
    document.getElementById("d-raw").textContent = r.raw;
    document.getElementById("d-cmd").textContent = generateCommand(r);
    const panel = document.getElementById("details-panel");
    const wasHidden = panel.classList.contains("hidden");
    panel.classList.remove("hidden");
    // Opening the panel reclaims grid space from the viz; re-render so the
    // layout uses the new narrower width.
    if (wasHidden && state.rules.length) render(state.rules);
  }

  /* Play a one-shot "pulse" on the source + target nodes of the selected edge.
     Node IDs contain dots/slashes/colons so selectors are awkward — iterating is
     simpler and the node count is tiny. */
  function pulseEndpoints(fromId, toId) {
    if (!fromId && !toId) return;
    const wanted = new Set([fromId, toId].filter(Boolean));
    document.querySelectorAll("[data-node-id]").forEach((g) => {
      if (!wanted.has(g.getAttribute("data-node-id"))) return;
      const rect = g.querySelector(".node-rect");
      if (!rect) return;
      rect.classList.remove("pulse-once");
      /* Force a reflow so the keyframe restarts on successive selections. */
      void rect.getBBox();
      rect.classList.add("pulse-once");
    });
  }

  function closeDetails() {
    const panel = document.getElementById("details-panel");
    const wasVisible = !panel.classList.contains("hidden");
    panel.classList.add("hidden");
    if (state.selectedEdge) {
      state.selectedEdge.classList.remove("selected");
      state.selectedEdge = null;
    }
    state.selectedRuleIdx = null;
    if (wasVisible && state.rules.length) render(state.rules);
  }

  // ── Utilities ──────────────────────────────────────────────────────────

  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2000);
  }

  // ── Demo data ──────────────────────────────────────────────────────────

  const DEMO_FILTER = `Chain INPUT (policy DROP 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination
  148 12048 ACCEPT     all  --  lo     *       0.0.0.0/0            0.0.0.0/0
 2341  195K ACCEPT     all  --  *      *       0.0.0.0/0            0.0.0.0/0            ctstate RELATED,ESTABLISHED
   12   720 ACCEPT     tcp  --  *      *       192.168.1.0/24       0.0.0.0/0            tcp dpt:22
    4   240 ACCEPT     tcp  --  *      *       10.0.0.0/8           0.0.0.0/0            tcp dpt:443
    0     0 ACCEPT     tcp  --  *      *       0.0.0.0/0            0.0.0.0/0            tcp dpt:80
    3   180 DROP       all  --  *      *       203.0.113.42         0.0.0.0/0
    0     0 LOG        all  --  *      *       0.0.0.0/0            0.0.0.0/0            LOG flags 0 level 4

Chain FORWARD (policy DROP 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination
  860 75000 ACCEPT     all  --  eth1   eth0    192.168.1.0/24       0.0.0.0/0
    2   120 REJECT     tcp  --  eth0   *       0.0.0.0/0            192.168.1.50         tcp dpt:3389 reject-with icmp-port-unreachable

Chain OUTPUT (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination
`;

  const DEMO_NAT = `Chain PREROUTING (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination
    0     0 DNAT       tcp  --  eth0   *       0.0.0.0/0            198.51.100.10        tcp dpt:80 to:192.168.1.100:8080
    0     0 DNAT       tcp  --  eth0   *       0.0.0.0/0            198.51.100.10        tcp dpt:443 to:192.168.1.100:8443

Chain POSTROUTING (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination
  742 56300 MASQUERADE all  --  *      eth0    192.168.1.0/24       0.0.0.0/0
`;

  // ── UI handlers ────────────────────────────────────────────────────────

  /* Render cost scales roughly linearly with rule count (one SVG path +
     one marker + two nodes per edge). Past a few hundred rules the
     bezier layout and full re-render cross the "noticeable lag" line.
     Soft limit warns, hard limit truncates with a visible toast so
     the user knows they're not seeing the whole picture.            */
  const SOFT_RULE_LIMIT = 200;
  const HARD_RULE_LIMIT = 600;

  function doVisualize() {
    const filterText = document.getElementById("filter-input").value;
    const natText = document.getElementById("nat-input").value;
    const filter = parseIptables(filterText, "filter");
    const nat = parseIptables(natText, "nat");
    let all = filter.rules.concat(nat.rules);
    const chains = filter.chains.concat(nat.chains);
    closeDetails();
    if (!all.length && (filterText.trim() || natText.trim())) {
      showToast("No rules parsed — check your input");
    }
    if (all.length > HARD_RULE_LIMIT) {
      showToast(`Too many rules (${all.length}) — rendering the first ${HARD_RULE_LIMIT}`);
      all = all.slice(0, HARD_RULE_LIMIT);
    } else if (all.length > SOFT_RULE_LIMIT) {
      showToast(`Large rule set (${all.length}) — render may be slow`);
    }
    render(all);
    renderPolicyBar(chains);
  }

  function loadDemo() {
    document.getElementById("filter-input").value = DEMO_FILTER;
    document.getElementById("nat-input").value = DEMO_NAT;
    doVisualize();
  }

  function clearAll() {
    document.getElementById("filter-input").value = "";
    document.getElementById("nat-input").value = "";
    closeDetails();
    render([]);
    renderPolicyBar([]);
  }

  function copyCommand() {
    const cmd = document.getElementById("d-cmd").textContent;
    if (!cmd) return;
    navigator.clipboard.writeText(cmd).then(
      () => showToast("Command copied"),
      () => showToast("Copy failed")
    );
  }

  // ── Init ───────────────────────────────────────────────────────────────

  function init() {
    siteTheme.init();

    document.getElementById("visualize-btn").addEventListener("click", doVisualize);
    document.getElementById("demo-btn").addEventListener("click", loadDemo);
    document.getElementById("clear-btn").addEventListener("click", clearAll);
    document.getElementById("details-close").addEventListener("click", closeDetails);
    document.getElementById("copy-cmd").addEventListener("click", copyCommand);

    /* Hovering a legend item dims edges whose target doesn't match the
       category. CSS in style.css does the dim; this just sets a data attr.
       NAT and OTHER are multi-target, handled by the CSS selector list.     */
    const vizWrap = document.querySelector(".viz-wrap");
    document.querySelectorAll(".legend-item[data-focus]").forEach((item) => {
      const focus = item.getAttribute("data-focus");
      item.addEventListener("mouseenter", () => vizWrap.setAttribute("data-focus", focus));
      item.addEventListener("mouseleave", () => vizWrap.removeAttribute("data-focus"));
    });

    /* Safety-net: per-edge mouseleave doesn't reliably fire when the
       cursor skims between adjacent paths (edges overlap in SVG hit
       testing). Catching mouseleave on the wrapper guarantees the
       tooltip clears once the cursor truly leaves the graph.         */
    vizWrap.addEventListener("mouseleave", hideTooltip);

    document.getElementById("collapse-filter").addEventListener("click", () => {
      const pane = document.getElementById("collapse-filter").closest(".input-pane");
      pane.classList.toggle("collapsed");
    });
    document.getElementById("collapse-nat").addEventListener("click", () => {
      const pane = document.getElementById("collapse-nat").closest(".input-pane");
      pane.classList.toggle("collapsed");
    });

    // Re-visualize on Ctrl/Cmd+Enter in either textarea
    ["filter-input", "nat-input"].forEach((id) => {
      document.getElementById(id).addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          doVisualize();
        }
      });
    });

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (state.rules.length) render(state.rules);
      }, 100);
    });

    // Click on blank viz area (not an edge) closes the details panel
    document.getElementById("viz").addEventListener("click", (e) => {
      if (!e.target.closest(".edge")) closeDetails();
    });

    // Start with empty state
    render([]);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
