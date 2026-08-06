(function () {
  "use strict";

  const $ = domGetter("terminal-builder");

  const STORAGE_KEY = "terminalBuilderState";

  // ── Syntax highlighter ───────────────────────────────────────────────────
  // Adapted from tools/md-to-html/app.js — same tokenizer approach, but the
  // language list here matches the <select> values directly (no aliasing
  // needed) and the colour palette is chosen per-render based on the user's
  // background colour rather than a fixed theme.

  // Base KEYWORDS/tokenRegex/baseColor come from the shared
  // tools/syntax-highlight.js module (loaded before this file) — also used
  // by md-to-html. "terminal" isn't one of its languages; it shares bash's
  // reserved-word set but layers prompt/command/sudo highlighting below —
  // "shell / bash" itself stays plain (reserved words, strings, comments,
  // numbers only) for people who want real script syntax.
  const KEYWORDS = Object.assign({}, SyntaxHighlight.KEYWORDS, { terminal: SyntaxHighlight.KEYWORDS.sh });

  // "terminal" mode is for pasted terminal sessions, not shell scripts —
  // real content is overwhelmingly command names (whoami, nmap, curl…), not
  // reserved words (if/then/fi). Colour common commands so a typical paste
  // doesn't render with zero highlight.
  const SH_COMMANDS = new Set([
    "whoami","id","uname","ls","dir","cd","pwd","cat","less","more","head","tail","echo","printf",
    "cp","mv","rm","mkdir","rmdir","touch","chmod","chown","chgrp","ln","find","locate","which","whereis",
    "grep","egrep","fgrep","awk","sed","sort","uniq","wc","cut","tr","tee","xargs","diff","patch",
    "tar","gzip","gunzip","zip","unzip","curl","wget","ssh","scp","sftp","ftp","nc","netcat","ping","traceroute",
    "nmap","ifconfig","ip","netstat","ss","iptables","route","arp","dig","nslookup","host",
    "ps","top","htop","kill","killall","pkill","jobs","bg","fg","nohup","systemctl","service","crontab",
    "sudo","su","passwd","useradd","userdel","usermod","groupadd","adduser","chpasswd",
    "git","python","python3","pip","pip3","php","perl","ruby","node","npm","go","gcc","make","docker","kubectl",
    "vim","vi","nano","emacs","man","history","alias","clear","exit","logout","reboot","shutdown",
    "mount","umount","df","du","free","uptime","date","cal","whois",
    "base64","md5sum","sha1sum","sha256sum","openssl","gpg",
    "hydra","john","hashcat","sqlmap","gobuster","dirb","nikto","searchsploit","msfconsole","msfvenom","tcpdump","responder",
  ]);

  // Box-drawing characters used by multi-line prompt themes (Kali's default
  // zsh prompt, Powerlevel10k, Pure, ...), e.g.:
  //   ┌──(user㉿host)-[~]
  //   └─$ whoami
  const BOX_CHARS = "┌┐└┘├┤┬┴┼─│┏┓┗┛┣┫┳┻╋━┃╭╮╰╯";

  // Matches a classic bash/zsh prompt at the start of a line: either a full
  // `user@host[:path]` segment ending in $ (bash user), # (root), or %
  // (zsh), a bare $ / % on its own (a bare # is deliberately excluded — it's
  // indistinguishable from a real "# comment" without a username), or one of
  // the two box-drawing prompt lines shown above.
  const SH_PROMPT_RE = new RegExp(
    "^(?:[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+(?::[^\\s$#%]*)?[$#%]" +
    "|[$%]" +
    "|[" + BOX_CHARS + "]+\\([^)]*\\)(?:-\\[[^\\]]*\\])?" +
    "|[" + BOX_CHARS + "]+[$#]" +
    ")$"
  );

  // Shared tail of the "terminal" tokenizer regex — user@host/bare-prompt
  // alternatives plus the ordinary comment/string/number/identifier ones.
  // Kept as its own literal (rather than hand-built) so its escaping is
  // simple to eyeball; the box-drawing alternatives are prepended to
  // `.source` at regex-build time since they need the BOX_CHARS variable.
  const TERMINAL_TOKEN_BASE = /^[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+(?::[^\s$#%]*)?[$#%](?=[ \t]|$)|^[$%](?=[ \t])|#[^\n]*|"(?:[^"\\]|\\.)*"|'[^']*'|\b\d+\b|[A-Za-z_][A-Za-z0-9_]*/;

  // Extracts the username from a prompt token, when that token carries one.
  // Used to flag `root` prompts red — box-drawing command-line prefixes
  // (└─$) carry no username of their own, so they inherit the most recent
  // info line's root/non-root state instead (tracked per highlightCode call).
  const USERHOST_PROMPT_RE = /^([A-Za-z0-9_.-]+)@[A-Za-z0-9_.-]+(?::[^\s$#%]*)?[$#%]$/;
  const BOX_INFO_LINE_RE = new RegExp("^[" + BOX_CHARS + "]+\\(([A-Za-z0-9_.-]+)[@㉿][^)]*\\)(?:-\\[[^\\]]*\\])?$");
  const BOX_CMD_LINE_RE = new RegExp("^[" + BOX_CHARS + "]+[$#]$");
  // Leading run of box-drawing glyphs on a prompt token, split off so it can
  // be coloured separately (syn.box) from the user@host/$/# part.
  const BOX_PREFIX_RE = new RegExp("^[" + BOX_CHARS + "]+");
  // Breaks a box-drawing info line into its pieces so each can be coloured
  // independently: box glyphs, the ()-wrapped user@host, and the optional
  // -[path] segment. Group 3 (path) is undefined when there's no bracket.
  const BOX_INFO_PARTS_RE = new RegExp("^([" + BOX_CHARS + "]+)\\(([^)]*)\\)(?:-\\[([^\\]]*)\\])?$");

  const escapeHtml = SyntaxHighlight.escapeHtml;

  function highlightCode(rawCode, lang, syn) {
    if (lang === "plain" || !KEYWORDS[lang]) return escapeHtml(rawCode);

    const kwSet = KEYWORDS[lang];

    let re;
    if (lang === "terminal") {
      // Prompt alternatives are anchored to line start (needs "m"); the
      // box-drawing ones are listed first so a Kali-style two-line prompt is
      // captured whole, ahead of the plain identifier/comment alternatives.
      // Not one of SyntaxHighlight's languages — built locally since the
      // box-drawing/prompt regex is unique to this tool.
      re = new RegExp(
        "^[" + BOX_CHARS + "]+\\([^)]*\\)(?:-\\[[^\\]]*\\])?" +
        "|^[" + BOX_CHARS + "]+[$#](?=[ \\t]|$)" +
        "|" + TERMINAL_TOKEN_BASE.source,
        "gm"
      );
    } else {
      re = SyntaxHighlight.tokenRegex(lang);
    }

    let out = "";
    let last = 0;
    let m;
    let lastPromptRoot = false;

    while ((m = re.exec(rawCode)) !== null) {
      if (m.index > last) out += escapeHtml(rawCode.slice(last, m.index));
      const tok = m[0];
      let color = null;
      let bold = false;
      let segmentHtml = null;

      if (lang === "terminal" && SH_PROMPT_RE.test(tok)) {
        const userMatch = tok.match(USERHOST_PROMPT_RE) || tok.match(BOX_INFO_LINE_RE);
        if (userMatch) lastPromptRoot = userMatch[1] === "root";
        else if (!BOX_CMD_LINE_RE.test(tok)) lastPromptRoot = false; // bare $ / % carries no user info
        const roleColor = lastPromptRoot ? syn.promptRoot : syn.prompt;
        const boxColor = lastPromptRoot ? syn.boxRoot : syn.box;

        const infoParts = tok.match(BOX_INFO_PARTS_RE);
        if (infoParts) {
          // e.g. ┌──(user㉿host)-[~]: box glyphs + ()-brackets in `box`/
          // `boxRoot`, the user@host content in the prompt/root colour,
          // and the path inside -[...] (if present) in `path`.
          const [, boxChars, parenInner, pathInner] = infoParts;
          segmentHtml =
            `<span style="color:${boxColor}">${escapeHtml(boxChars)}(</span>` +
            `<span style="color:${roleColor}">${escapeHtml(parenInner)}</span>` +
            `<span style="color:${boxColor}">)</span>`;
          if (pathInner !== undefined) {
            segmentHtml +=
              `<span style="color:${boxColor}">-[</span>` +
              `<span style="color:${syn.path}">${escapeHtml(pathInner)}</span>` +
              `<span style="color:${boxColor}">]</span>`;
          }
        } else {
          const boxMatch = tok.match(BOX_PREFIX_RE);
          if (boxMatch) {
            const boxPart = boxMatch[0];
            const rest = tok.slice(boxPart.length);
            segmentHtml = `<span style="color:${boxColor}">${escapeHtml(boxPart)}</span>`;
            if (rest) segmentHtml += `<span style="color:${roleColor}">${escapeHtml(rest)}</span>`;
          } else {
            color = roleColor;
          }
        }
      } else {
        // html/css/comment/string/number/keyword: shared with md-to-html
        // via SyntaxHighlight.baseColor(); sudo/command are terminal-only.
        color = SyntaxHighlight.baseColor(lang, tok, kwSet, syn);
        if (color === null && lang === "terminal") {
          if (tok === "sudo") { color = syn.sudo; bold = true; }
          else if (SH_COMMANDS.has(tok)) color = syn.command;
        }
      }

      if (segmentHtml !== null) {
        out += segmentHtml;
      } else {
        out += color
          ? `<span style="color:${color}${bold ? ";font-weight:bold" : ""}">${escapeHtml(tok)}</span>`
          : escapeHtml(tok);
      }
      last = re.lastIndex;
    }

    if (last < rawCode.length) out += escapeHtml(rawCode.slice(last));
    return out;
  }

  // ── Colour helpers ───────────────────────────────────────────────────────
  // The user only picks one colour (the terminal background). Everything
  // else — body text, syntax colours, title-bar shade — is derived from it
  // so the output always stays readable, whether they pick something near
  // black or near white.

  function hexToRgb(hex) {
    let h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex(r, g, b) {
    const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return "#" + c(r) + c(g) + c(b);
  }

  function relativeLuminance({ r, g, b }) {
    const chan = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
  }

  function isDarkColor(hex) {
    return relativeLuminance(hexToRgb(hex)) < 0.5;
  }

  function mix(hex, target, amt) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(r + (target - r) * amt, g + (target - g) * amt, b + (target - b) * amt);
  }

  // `command` colours the curated SH_COMMANDS set; `sudo` is its own slot so
  // privilege escalation reads as visually distinct from an ordinary
  // command; `prompt` colours a matched user@host$ prompt segment,
  // `promptRoot` overrides that when the prompt's username is root. `box`
  // colours the box-drawing glyphs (┌──/└─), the ()-brackets around
  // user@host, and the -[ ] brackets around the path for a normal user
  // (unchanged green); `boxRoot` overrides that with blue when the prompt's
  // username is root. `path` colours the current-directory text itself.
  const DARK_SYNTAX  = { keyword: "#ff79c6", string: "#f1fa8c", comment: "#8890b0", number: "#bd93f9", command: "#ffa657", sudo: "#ff5555", prompt: "#61afef", promptRoot: "#ff8787", box: "#50fa7b", boxRoot: "#4a90d9", path: "#e8e8e8" };
  const LIGHT_SYNTAX = { keyword: "#a626a4", string: "#50a14f", comment: "#a0a1a7", number: "#986801", command: "#c2410c", sudo: "#e45649", prompt: "#4078f2", promptRoot: "#d9484f", box: "#1e8e3e", boxRoot: "#1a56db", path: "#1c1c1c" };

  const BG_PRESETS = {
    default:  "#1a1a1a",
    defender: "#14233a",
    attacker: "#331313",
  };

  function presetForColor(hex) {
    const norm = hex.toLowerCase();
    for (const key of Object.keys(BG_PRESETS)) {
      if (BG_PRESETS[key].toLowerCase() === norm) return key;
    }
    return "custom";
  }

  function pickTextColor(bgHex) {
    return isDarkColor(bgHex) ? "#e8e8e8" : "#1c1c1c";
  }

  function pickSyntaxPalette(bgHex) {
    return isDarkColor(bgHex) ? DARK_SYNTAX : LIGHT_SYNTAX;
  }

  function titleBarColor(bgHex) {
    return isDarkColor(bgHex) ? mix(bgHex, 255, 0.14) : mix(bgHex, 0, 0.10);
  }

  // ── Terminal HTML builder ────────────────────────────────────────────────
  // Fully self-contained: inline styles only, websafe monospace stack (not
  // the toolbox's self-hosted font), so the snippet renders identically
  // when pasted into an external site with none of this repo's CSS present.

  const OUTPUT_FONT = "'SFMono-Regular','Consolas','Liberation Mono','Menlo','Courier New',monospace";

  function buildTerminalHTML(state, opts) {
    const pretty = !!(opts && opts.pretty);
    const bg = state.bgColor;
    const textColor = pickTextColor(bg);
    const syn = pickSyntaxPalette(bg);
    const barColor = titleBarColor(bg);
    const titleColor = isDarkColor(bg) ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)";
    const body = highlightCode(state.code, state.lang, syn);
    const title = escapeHtml(state.title);

    const shadow = state.shadow ? "box-shadow:0 12px 28px rgba(0,0,0,0.35);" : "";
    const outer  = `<div style="background:${bg};border-radius:8px;overflow:hidden;${shadow}font-family:${OUTPUT_FONT};max-width:100%;">`;
    const dotsJustify = state.dotsAlign === "right" ? "justify-content:flex-end;" : "";
    const bar    = `<div style="display:flex;align-items:center;${dotsJustify}padding:9px 14px;background:${barColor};position:relative;">`;
    const dotRed = `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#ff5f56;margin-right:7px;"></span>`;
    const dotYlw = `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#ffbd2e;margin-right:7px;"></span>`;
    const dotGrn = `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#27c93f;"></span>`;
    const dots = state.dotsAlign === "none" ? "" : dotRed + dotYlw + dotGrn;
    // Title bar text stays slightly smaller than the body, scaled off the
    // user's font-size setting at the same ratio as the original fixed
    // 12.5px-at-13px-body default.
    const titleFontSize = Math.round(state.fontSize * (12.5 / 13) * 10) / 10;
    const titleEl = `<span style="position:absolute;left:0;right:0;text-align:center;font-size:${titleFontSize}px;color:${titleColor};pointer-events:none;">${title}</span>`;
    const wrapStyle = state.wrap
      ? "white-space:pre-wrap;overflow-wrap:break-word;"
      : "white-space:pre;overflow-x:auto;";
    // <pre> is whitespace-sensitive, so its contents are never touched by
    // pretty-printing — only the surrounding chrome tags get indented.
    const pre    = `<pre style="margin:0;padding:16px 18px;${wrapStyle}font-size:${state.fontSize}px;line-height:1.6;color:${textColor};"><code style="font-family:inherit;">${body}</code></pre>`;

    if (!pretty) {
      return outer + bar + dots + titleEl + "</div>" + pre + "</div>";
    }

    const dotLines = state.dotsAlign === "none"
      ? []
      : ["    " + dotRed, "    " + dotYlw, "    " + dotGrn];

    return [
      outer,
      "  " + bar,
      ...dotLines,
      "    " + titleEl,
      "  </div>",
      "  " + pre,
      "</div>",
    ].join("\n");
  }

  // ── State ─────────────────────────────────────────────────────────────────

  const DEMO_TITLE = "user@host: ~/project";
  const DEMO_CODE = [
    "user@localhost$ whoami",
    "www-data",
  ].join("\n");

  const DEFAULTS = {
    title: DEMO_TITLE,
    lang: "terminal",
    bgPreset: "default",
    bgColor: BG_PRESETS.default,
    code: DEMO_CODE,
    formatOutput: true,
    fontSize: 13,
    shadow: false,
    wrap: false,
    dotsAlign: "left",
  };

  const FONT_SIZE_MIN = 10;
  const FONT_SIZE_MAX = 28;

  const state = Object.assign({}, DEFAULTS);

  function persist() {
    safeStorage.save(STORAGE_KEY, JSON.stringify(state));
  }

  function render() {
    $("preview-mount").innerHTML = buildTerminalHTML(state);
    $("html-output").value = buildTerminalHTML(state, { pretty: state.formatOutput });
  }

  function update() {
    render();
    persist();
  }

  let updateTimer = null;
  function scheduleUpdate(delay) {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(update, delay);
  }

  function copyHTML() {
    const val = $("html-output").value;
    if (!val) { showToast("Nothing to copy"); return; }
    copyText(val).then(
      () => showToast("Copied!"),
      () => showToast("Copy failed")
    );
  }

  function updateBgColorVisibility() {
    $("tb-bgcolor").classList.toggle("hidden", state.bgPreset !== "custom");
  }

  // Syncs every settings input to the current state — used on load and by
  // the reset button, so the two stay in lockstep with a single source of
  // the field list.
  function syncFormFromState() {
    $("tb-title").value = state.title;
    $("tb-lang").value = state.lang;
    $("tb-bg-preset").value = state.bgPreset;
    $("tb-bgcolor").value = state.bgColor;
    $("tb-code").value = state.code;
    $("tb-format-toggle").checked = state.formatOutput;
    $("tb-fontsize").value = state.fontSize;
    $("tb-shadow").checked = state.shadow;
    $("tb-wrap").checked = state.wrap;
    $("tb-dots-align").value = state.dotsAlign;
    updateBgColorVisibility();
  }

  function resetToDefaults() {
    Object.assign(state, DEFAULTS);
    syncFormFromState();
    update();
  }

  function init() {
    siteTheme.init();

    const saved = safeStorage.get(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.assign(state, parsed);
        // Older saved state predates the preset dropdown — infer which
        // preset (if any) the stored colour matches so the dropdown
        // doesn't silently disagree with the swatch.
        if (!("bgPreset" in parsed)) state.bgPreset = presetForColor(state.bgColor);
        // Older saved state predates the left/right/none dropdown and
        // instead has a "buttons on right" boolean — carry its intent
        // forward instead of silently resetting everyone to "left".
        if ("dotsRight" in parsed && !("dotsAlign" in parsed)) {
          state.dotsAlign = parsed.dotsRight ? "right" : "left";
        }
        delete state.dotsRight;
      } catch (e) {
        console.warn("terminal-builder: saved state JSON invalid", e);
      }
    }

    syncFormFromState();

    $("tb-title").addEventListener("input", () => {
      state.title = $("tb-title").value;
      scheduleUpdate(150);
    });

    $("tb-lang").addEventListener("change", () => {
      state.lang = $("tb-lang").value;
      update();
    });

    $("tb-bg-preset").addEventListener("change", () => {
      state.bgPreset = $("tb-bg-preset").value;
      if (state.bgPreset !== "custom") {
        state.bgColor = BG_PRESETS[state.bgPreset];
        $("tb-bgcolor").value = state.bgColor;
      }
      updateBgColorVisibility();
      update();
    });

    $("tb-bgcolor").addEventListener("input", () => {
      state.bgColor = $("tb-bgcolor").value;
      scheduleUpdate(60);
    });

    $("tb-code").addEventListener("input", () => {
      state.code = $("tb-code").value;
      scheduleUpdate(150);
    });

    $("tb-fontsize").addEventListener("input", () => {
      const n = parseInt($("tb-fontsize").value, 10);
      if (!Number.isNaN(n)) {
        state.fontSize = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, n));
      }
      scheduleUpdate(150);
    });

    $("tb-format-toggle").addEventListener("change", () => {
      state.formatOutput = $("tb-format-toggle").checked;
      update();
    });

    $("tb-shadow").addEventListener("change", () => {
      state.shadow = $("tb-shadow").checked;
      update();
    });

    $("tb-wrap").addEventListener("change", () => {
      state.wrap = $("tb-wrap").checked;
      update();
    });

    $("tb-dots-align").addEventListener("change", () => {
      state.dotsAlign = $("tb-dots-align").value;
      update();
    });

    $("copy-btn").addEventListener("click", copyHTML);
    $("reset-btn").addEventListener("click", resetToDefaults);

    update();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
