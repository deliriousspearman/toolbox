(function () {
  "use strict";

  // ── Themes ────────────────────────────────────────────────────────────────

  const THEMES = {
    dracula: {
      body:       { background: "#282a36", color: "#f8f8f2", fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: "1.7", padding: "2rem 3rem", maxWidth: "860px", margin: "0 auto" },
      h1:         { color: "#bd93f9", borderBottom: "2px solid #44475a", paddingBottom: "0.25em", marginTop: "1.5em", marginBottom: "0.5em" },
      h2:         { color: "#bd93f9", borderBottom: "1px solid #44475a", paddingBottom: "0.2em", marginTop: "1.4em", marginBottom: "0.4em" },
      h3:         { color: "#ff79c6", marginTop: "1.2em", marginBottom: "0.3em" },
      h4:         { color: "#ff79c6", marginTop: "1.1em", marginBottom: "0.3em" },
      h5:         { color: "#ffb86c", marginTop: "1em", marginBottom: "0.3em" },
      h6:         { color: "#ffb86c", marginTop: "1em", marginBottom: "0.3em" },
      p:          { margin: "0.85em 0" },
      strong:     { color: "#ffb86c" },
      em:         { color: "#f1fa8c", fontStyle: "italic" },
      del:        { color: "#6272a4", textDecoration: "line-through" },
      a:          { color: "#8be9fd", textDecoration: "none" },
      code:       { background: "#44475a", color: "#50fa7b", padding: "2px 6px", borderRadius: "3px", fontFamily: '"Courier New", monospace', fontSize: "0.9em" },
      pre:        { background: "#44475a", color: "#f8f8f2", padding: "1em 1.2em", borderRadius: "4px", overflowX: "auto", margin: "1em 0", fontFamily: '"Courier New", monospace' },
      blockquote: { borderLeft: "4px solid #6272a4", paddingLeft: "1em", color: "#6272a4", margin: "1em 0", fontStyle: "italic" },
      ul:         { paddingLeft: "1.8em", margin: "0.7em 0" },
      ol:         { paddingLeft: "1.8em", margin: "0.7em 0" },
      li:         { margin: "0.3em 0" },
      hr:         { border: "none", borderTop: "1px solid #44475a", margin: "2em 0" },
      table:      { borderCollapse: "collapse", width: "100%", margin: "1em 0" },
      th:         { background: "#44475a", color: "#bd93f9", padding: "8px 12px", border: "1px solid #6272a4", textAlign: "left" },
      td:         { padding: "8px 12px", border: "1px solid #6272a4" },
      img:        { maxWidth: "100%", height: "auto" },
      syntax:     { keyword: "#ff79c6", string: "#f1fa8c", comment: "#6272a4", number: "#bd93f9" },
    },
    nord: {
      body:       { background: "#2e3440", color: "#d8dee9", fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: "1.7", padding: "2rem 3rem", maxWidth: "860px", margin: "0 auto" },
      h1:         { color: "#88c0d0", borderBottom: "2px solid #4c566a", paddingBottom: "0.25em", marginTop: "1.5em", marginBottom: "0.5em" },
      h2:         { color: "#88c0d0", borderBottom: "1px solid #4c566a", paddingBottom: "0.2em", marginTop: "1.4em", marginBottom: "0.4em" },
      h3:         { color: "#81a1c1", marginTop: "1.2em", marginBottom: "0.3em" },
      h4:         { color: "#81a1c1", marginTop: "1.1em", marginBottom: "0.3em" },
      h5:         { color: "#5e81ac", marginTop: "1em", marginBottom: "0.3em" },
      h6:         { color: "#5e81ac", marginTop: "1em", marginBottom: "0.3em" },
      p:          { margin: "0.85em 0" },
      strong:     { color: "#ebcb8b" },
      em:         { color: "#a3be8c", fontStyle: "italic" },
      del:        { color: "#4c566a", textDecoration: "line-through" },
      a:          { color: "#88c0d0", textDecoration: "none" },
      code:       { background: "#3b4252", color: "#a3be8c", padding: "2px 6px", borderRadius: "3px", fontFamily: '"Courier New", monospace', fontSize: "0.9em" },
      pre:        { background: "#3b4252", color: "#d8dee9", padding: "1em 1.2em", borderRadius: "4px", overflowX: "auto", margin: "1em 0", fontFamily: '"Courier New", monospace' },
      blockquote: { borderLeft: "4px solid #4c566a", paddingLeft: "1em", color: "#4c566a", margin: "1em 0", fontStyle: "italic" },
      ul:         { paddingLeft: "1.8em", margin: "0.7em 0" },
      ol:         { paddingLeft: "1.8em", margin: "0.7em 0" },
      li:         { margin: "0.3em 0" },
      hr:         { border: "none", borderTop: "1px solid #4c566a", margin: "2em 0" },
      table:      { borderCollapse: "collapse", width: "100%", margin: "1em 0" },
      th:         { background: "#3b4252", color: "#88c0d0", padding: "8px 12px", border: "1px solid #4c566a", textAlign: "left" },
      td:         { padding: "8px 12px", border: "1px solid #4c566a" },
      img:        { maxWidth: "100%", height: "auto" },
      syntax:     { keyword: "#81a1c1", string: "#a3be8c", comment: "#616e88", number: "#b48ead" },
    },
  };

  // ── State ─────────────────────────────────────────────────────────────────

  let currentThemeName = "dracula";
  let customTheme      = null;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function styleStr(obj) {
    return Object.entries(obj)
      .map(([k, v]) => `${k.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${v}`)
      .join("; ");
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function activeTheme() {
    return currentThemeName === "custom" ? customTheme : THEMES[currentThemeName];
  }

  // ── Inline transforms ─────────────────────────────────────────────────────

  function inlineToHtml(text, th) {
    // 1. Extract and protect inline code spans
    const codes = [];
    text = text.replace(/`([^`]+)`/g, (_, c) => {
      const idx = codes.length;
      codes.push(`<code style="${styleStr(th.code)}">${escapeHtml(c)}</code>`);
      return `\x00C${idx}\x00`;
    });

    // 2. HTML-escape remaining text
    text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // 3. Images (must come before links)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
      (_, alt, src) => `<img src="${src}" alt="${alt}" style="${styleStr(th.img)}">`);

    // 4. Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      (_, label, href) => `<a href="${href}" style="${styleStr(th.a)}">${label}</a>`);

    // 5. Bold + italic (must come before bold or italic alone)
    text = text.replace(/\*\*\*(.+?)\*\*\*/g,
      (_, c) => `<strong style="${styleStr(th.strong)}"><em style="${styleStr(th.em)}">${c}</em></strong>`);

    // 6. Bold
    text = text.replace(/\*\*(.+?)\*\*/g,
      (_, c) => `<strong style="${styleStr(th.strong)}">${c}</strong>`);
    text = text.replace(/__(.+?)__/g,
      (_, c) => `<strong style="${styleStr(th.strong)}">${c}</strong>`);

    // 7. Italic
    text = text.replace(/\*(.+?)\*/g,
      (_, c) => `<em style="${styleStr(th.em)}">${c}</em>`);
    text = text.replace(/_(.+?)_/g,
      (_, c) => `<em style="${styleStr(th.em)}">${c}</em>`);

    // 8. Strikethrough
    text = text.replace(/~~(.+?)~~/g,
      (_, c) => `<del style="${styleStr(th.del)}">${c}</del>`);

    // 9. Restore inline code spans
    text = text.replace(/\x00C(\d+)\x00/g, (_, i) => codes[+i]);

    return text;
  }

  // ── Syntax highlighter ────────────────────────────────────────────────────

  function highlightCode(rawCode, lang, syn) {
    const LANG_ALIASES = {
      javascript: "js", jsx: "js", ts: "js", typescript: "js", tsx: "js",
      python: "py", py: "py",
      bash: "sh", shell: "sh", zsh: "sh", sh: "sh",
      html: "html", xml: "html",
      css: "css", scss: "css",
      json: "json",
      sql: "sql",
      rust: "rust", rs: "rust",
      go: "go",
    };
    const norm = LANG_ALIASES[lang];
    if (!norm) return escapeHtml(rawCode);

    const KEYWORDS = {
      js:   new Set(["break","case","catch","class","const","continue","debugger","default","delete","do","else","export","extends","finally","for","function","if","import","in","instanceof","let","new","return","static","super","switch","this","throw","try","typeof","var","void","while","with","yield","async","await","of","from","true","false","null","undefined","NaN","Infinity"]),
      py:   new Set(["and","as","assert","async","await","break","class","continue","def","del","elif","else","except","finally","for","from","global","if","import","in","is","lambda","not","or","pass","raise","return","try","while","with","yield","True","False","None"]),
      sh:   new Set(["if","then","else","elif","fi","for","do","done","while","until","case","esac","function","return","in","exit","echo","source","export","local","readonly","unset"]),
      json: new Set(["true","false","null"]),
      sql:  new Set(["select","from","where","join","left","right","inner","outer","on","group","by","having","order","limit","offset","insert","into","values","update","set","delete","create","table","index","drop","alter","add","and","or","not","null","as","distinct","count","sum","avg","max","min","in","exists","like","between","union","all","with","case","when","then","else","end","is","asc","desc","unique","primary","key","foreign","references","constraint"]),
      rust: new Set(["as","break","const","continue","crate","else","enum","extern","false","fn","for","if","impl","in","let","loop","match","mod","move","mut","pub","ref","return","self","Self","static","struct","super","trait","true","type","unsafe","use","where","while","async","await","dyn"]),
      go:   new Set(["break","case","chan","const","continue","default","defer","else","fallthrough","for","func","go","goto","if","import","interface","map","package","range","return","select","struct","switch","type","var","true","false","nil"]),
      html: new Set([]),
      css:  new Set(["important","inherit","initial","unset","none","auto","normal","bold","italic","solid","dashed","dotted","hidden","visible","absolute","relative","fixed","sticky","flex","grid","block","inline","float","left","right","center","top","bottom","middle"]),
    };

    const kwSet = KEYWORDS[norm];

    let re;
    if (norm === "py") {
      re = /(#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b0x[0-9a-fA-F]+\b|\b\d+\.?\d*(?:e[+-]?\d+)?\b|[A-Za-z_][A-Za-z0-9_]*)/g;
    } else if (norm === "sh") {
      re = /(#[^\n]*|"(?:[^"\\]|\\.)*"|'[^']*'|\b\d+\b|[A-Za-z_][A-Za-z0-9_]*)/g;
    } else if (norm === "html") {
      re = /(<!--[\s\S]*?-->|<\/?[A-Za-z][A-Za-z0-9-]*|\/?>|"[^"]*"|'[^']*'|[A-Za-z][A-Za-z0-9-]*(?==))/g;
    } else if (norm === "css") {
      re = /(\/\*[\s\S]*?\*\/|"[^"]*"|'[^']*'|#[0-9a-fA-F]{3,8}\b|\b\d+\.?\d*(?:px|em|rem|%|vh|vw|pt|s|ms|deg)?\b|@[A-Za-z-]+|:[A-Za-z-]+|[A-Za-z_-][A-Za-z0-9_-]*)/g;
    } else {
      re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b0x[0-9a-fA-F]+\b|\b\d+\.?\d*(?:e[+-]?\d+)?\b|[A-Za-z_$][A-Za-z0-9_$]*)/g;
    }

    let out = "";
    let last = 0;
    let m;

    while ((m = re.exec(rawCode)) !== null) {
      if (m.index > last) out += escapeHtml(rawCode.slice(last, m.index));
      const tok = m[0];
      let color = null;

      if (norm === "html") {
        if (tok.startsWith("<!--")) color = syn.comment;
        else if (tok.startsWith("<") || tok === "/>") color = syn.keyword;
        else if (tok[0] === '"' || tok[0] === "'") color = syn.string;
      } else if (norm === "css") {
        if (tok.startsWith("/*")) color = syn.comment;
        else if (tok[0] === '"' || tok[0] === "'") color = syn.string;
        else if (tok.startsWith("#") && /^#[0-9a-fA-F]{3,8}$/.test(tok)) color = syn.number;
        else if (/^\d/.test(tok)) color = syn.number;
        else if (tok.startsWith("@") || tok.startsWith(":")) color = syn.keyword;
        else if (kwSet.has(tok)) color = syn.keyword;
      } else {
        if (tok.startsWith("//") || tok.startsWith("/*") || tok.startsWith("#")) color = syn.comment;
        else if (tok[0] === '"' || tok[0] === "'" || tok[0] === "`") color = syn.string;
        else if (/^(?:0x[\da-fA-F]+|\d)/.test(tok)) color = syn.number;
        else if (kwSet.has(norm === "sql" ? tok.toLowerCase() : tok)) color = syn.keyword;
      }

      out += color
        ? `<span style="color:${color}">${escapeHtml(tok)}</span>`
        : escapeHtml(tok);
      last = re.lastIndex;
    }

    if (last < rawCode.length) out += escapeHtml(rawCode.slice(last));
    return out;
  }

  // ── Block renderers ───────────────────────────────────────────────────────

  function renderList(lines, isOrdered, th) {
    const items = [];

    for (const line of lines) {
      const ulM = line.match(/^(\s*)[-*+]\s+(.*)/);
      const olM = line.match(/^(\s*)\d+\.\s+(.*)/);
      const m   = ulM || olM;
      if (!m) continue;

      const indent  = m[1].length;
      const content = m[2];
      const childOl = !!olM;

      if (indent < 2) {
        items.push({ content, childOl: false, children: [] });
      } else if (items.length > 0) {
        items[items.length - 1].children.push({ content, childOl });
      }
    }

    const tag       = isOrdered ? "ol" : "ul";
    const listStyle = isOrdered ? th.ol  : th.ul;
    let html        = `<${tag} style="${styleStr(listStyle)}">`;

    for (const item of items) {
      html += `<li style="${styleStr(th.li)}">${inlineToHtml(item.content, th)}`;

      if (item.children.length > 0) {
        const cOl    = item.children[0].childOl;
        const cTag   = cOl ? "ol" : "ul";
        const cStyle = cOl ? th.ol : th.ul;
        html += `<${cTag} style="${styleStr(cStyle)}">`;
        for (const child of item.children) {
          html += `<li style="${styleStr(th.li)}">${inlineToHtml(child.content, th)}</li>`;
        }
        html += `</${cTag}>`;
      }

      html += `</li>`;
    }

    html += `</${tag}>`;
    return html;
  }

  function renderTable(tableLines, th) {
    // Filter out the separator row (row index 1) and parse cells
    const rows = tableLines
      .filter((_, i) => i !== 1)
      .map(line => line.split("|").slice(1, -1).map(c => c.trim()));

    if (rows.length === 0) return "";

    let html = `<table style="${styleStr(th.table)}">`;

    html += "<thead><tr>";
    for (const cell of rows[0]) {
      html += `<th style="${styleStr(th.th)}">${inlineToHtml(cell, th)}</th>`;
    }
    html += "</tr></thead>";

    if (rows.length > 1) {
      html += "<tbody>";
      for (const row of rows.slice(1)) {
        html += "<tr>";
        for (const cell of row) {
          html += `<td style="${styleStr(th.td)}">${inlineToHtml(cell, th)}</td>`;
        }
        html += "</tr>";
      }
      html += "</tbody>";
    }

    html += "</table>";
    return html;
  }

  // ── Block-level parser ────────────────────────────────────────────────────

  function parseBlocks(text, th) {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const parts = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // ── Fenced code block
      if (/^```/.test(line)) {
        const lang = (line.match(/^```(\w+)/) || [])[1] || "";
        const codeLines = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        const codeContent = highlightCode(codeLines.join("\n"), lang.toLowerCase(), th.syntax);
        parts.push(
          `<pre style="${styleStr(th.pre)}"><code style="background:none;padding:0;border-radius:0;font-size:1em;font-family:inherit">${codeContent}</code></pre>`
        );
        continue;
      }

      // ── ATX Heading
      const hM = line.match(/^(#{1,6})\s+(.*)/);
      if (hM) {
        const lvl      = hM[1].length;
        const tag      = `h${lvl}`;
        const hStyle   = th[tag] || th.h6;
        parts.push(`<${tag} style="${styleStr(hStyle)}">${inlineToHtml(hM[2], th)}</${tag}>`);
        i++;
        continue;
      }

      // ── Horizontal rule  (--- *** ___ or spaced variants)
      if (/^(- ?){3,}$|^(\* ?){3,}$|^(_ ?){3,}$/.test(line.trim()) && line.trim().length >= 3) {
        parts.push(`<hr style="${styleStr(th.hr)}">`);
        i++;
        continue;
      }

      // ── Blockquote
      if (/^>\s?/.test(line)) {
        const bqLines = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          bqLines.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }
        const inner = parseBlocks(bqLines.join("\n"), th);
        parts.push(`<blockquote style="${styleStr(th.blockquote)}">${inner}</blockquote>`);
        continue;
      }

      // ── Table  (header row followed by |---|---| separator)
      if (/^\|/.test(line) && i + 1 < lines.length && /^\|[-:| ]+\|/.test(lines[i + 1])) {
        const tLines = [];
        while (i < lines.length && /^\|/.test(lines[i])) {
          tLines.push(lines[i]);
          i++;
        }
        parts.push(renderTable(tLines, th));
        continue;
      }

      // ── Unordered list
      if (/^(\s*)[-*+]\s+/.test(line)) {
        const lLines = [];
        while (
          i < lines.length &&
          lines[i].trim() !== "" &&
          (/^\s*[-*+]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))
        ) {
          lLines.push(lines[i]);
          i++;
        }
        parts.push(renderList(lLines, false, th));
        continue;
      }

      // ── Ordered list
      if (/^(\s*)\d+\.\s+/.test(line)) {
        const lLines = [];
        while (
          i < lines.length &&
          lines[i].trim() !== "" &&
          (/^\s*\d+\.\s+/.test(lines[i]) || /^\s*[-*+]\s+/.test(lines[i]))
        ) {
          lLines.push(lines[i]);
          i++;
        }
        parts.push(renderList(lLines, true, th));
        continue;
      }

      // ── Blank line
      if (line.trim() === "") {
        i++;
        continue;
      }

      // ── Paragraph  (anything else)
      const pLines = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !/^#{1,6}\s/.test(lines[i]) &&
        !/^```/.test(lines[i]) &&
        !/^>\s?/.test(lines[i]) &&
        !/^(- ?){3,}$|^(\* ?){3,}$|^(_ ?){3,}$/.test(lines[i].trim()) &&
        !/^\s*[-*+]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i]) &&
        !/^\|/.test(lines[i])
      ) {
        pLines.push(lines[i]);
        i++;
      }
      if (pLines.length > 0) {
        parts.push(`<p style="${styleStr(th.p)}">${inlineToHtml(pLines.join("\n"), th)}</p>`);
      }
    }

    return parts.join("\n");
  }

  // ── Full document builder ─────────────────────────────────────────────────

  function parseMd(text) {
    const th   = activeTheme();
    const body = parseBlocks(text, th);
    return [
      "<!DOCTYPE html>",
      '<html lang="en">',
      "<head>",
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      "<title>Document</title>",
      "</head>",
      `<body style="${styleStr(th.body)}">`,
      body,
      "</body>",
      "</html>",
    ].join("\n");
  }

  // ── UI actions ────────────────────────────────────────────────────────────

  function convert() {
    const text = document.getElementById("md-input").value;
    document.getElementById("html-output").value = text.trim() ? parseMd(text) : "";
  }

  let toastTimer = null;

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2000);
  }

  function copyHTML() {
    const val = document.getElementById("html-output").value;
    if (!val) { showToast("Nothing to copy"); return; }
    navigator.clipboard.writeText(val).then(
      () => showToast("Copied!"),
      () => showToast("Copy failed")
    );
  }

  function downloadHTML() {
    const val = document.getElementById("html-output").value;
    if (!val) { showToast("Nothing to download"); return; }
    const blob = new Blob([val], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "output.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  function uploadMD() {
    document.getElementById("file-input").click();
  }

  function onFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById("md-input").value = ev.target.result;
      convert();
    };
    reader.readAsText(file);
    e.target.value = ""; // allow re-uploading the same file
  }

  // ── Customize modal ───────────────────────────────────────────────────────

  function hexFromCss(cssValue) {
    const m = (cssValue || "").match(/#[0-9a-fA-F]{3,8}/);
    return m ? m[0] : "#000000";
  }

  function openCustomizer() {
    const t = customTheme;
    document.getElementById("c-bg").value        = hexFromCss(t.body.background);
    document.getElementById("c-text").value      = hexFromCss(t.body.color);
    ["h1","h2","h3","h4","h5","h6"].forEach(h => {
      document.getElementById(`c-${h}`).value = hexFromCss(t[h].color);
    });
    document.getElementById("c-link").value      = hexFromCss(t.a.color);
    document.getElementById("c-code-bg").value   = hexFromCss(t.code.background);
    document.getElementById("c-code-text").value = hexFromCss(t.code.color);
    document.getElementById("c-blockquote").value = hexFromCss(t.blockquote.color);
    document.getElementById("c-strong").value    = hexFromCss(t.strong.color);
    document.getElementById("customize-modal").classList.remove("hidden");
  }

  function applyCustomizer() {
    const bg       = document.getElementById("c-bg").value;
    const text     = document.getElementById("c-text").value;
    const link     = document.getElementById("c-link").value;
    const codeBg   = document.getElementById("c-code-bg").value;
    const codeText = document.getElementById("c-code-text").value;
    const bq       = document.getElementById("c-blockquote").value;
    const strong   = document.getElementById("c-strong").value;

    const t = customTheme;
    t.body.background = bg;
    t.body.color      = text;
    ["h1","h2","h3","h4","h5","h6"].forEach(h => {
      t[h].color = document.getElementById(`c-${h}`).value;
    });
    t.a.color         = link;
    t.code.background = codeBg;
    t.pre.background  = codeBg;
    t.code.color      = codeText;
    t.pre.color       = codeText;
    t.blockquote.color      = bq;
    t.blockquote.borderLeft = t.blockquote.borderLeft.replace(/#[0-9a-fA-F]+/, bq);
    t.strong.color    = strong;

    currentThemeName = "custom";
    document.getElementById("theme-select").value = "custom";

    closeCustomizer();
    convert();
  }

  function closeCustomizer() {
    document.getElementById("customize-modal").classList.add("hidden");
  }

  // ── Site-wide light/dark theme ────────────────────────────────────────────

  function applyTheme(isLight) {
    document.body.classList.toggle("light", isLight);
    const btn = document.getElementById("theme-btn");
    if (btn) btn.textContent = isLight ? "\u263D" : "\u2600";
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    customTheme = deepCopy(THEMES.dracula);

    applyTheme(localStorage.getItem("siteTheme") === "light");
    document.getElementById("theme-btn").addEventListener("click", () => {
      const nowLight = !document.body.classList.contains("light");
      applyTheme(nowLight);
      localStorage.setItem("siteTheme", nowLight ? "light" : "dark");
    });

    document.getElementById("md-input").addEventListener("input", convert);

    document.getElementById("theme-select").addEventListener("change", (e) => {
      currentThemeName = e.target.value;
      convert();
    });

    document.getElementById("upload-btn").addEventListener("click", uploadMD);
    document.getElementById("file-input").addEventListener("change", onFileSelected);
    document.getElementById("copy-btn").addEventListener("click", copyHTML);
    document.getElementById("download-btn").addEventListener("click", downloadHTML);

    document.getElementById("customize-btn").addEventListener("click", openCustomizer);
    document.getElementById("customize-close").addEventListener("click", closeCustomizer);
    document.getElementById("customize-apply").addEventListener("click", applyCustomizer);
    document.getElementById("customize-cancel").addEventListener("click", closeCustomizer);
    document.getElementById("customize-modal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("customize-modal")) closeCustomizer();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCustomizer();
    });

    // Pre-fill with a demo document
    document.getElementById("md-input").value = `# Welcome to MD → HTML

Convert **Markdown** to styled HTML with inline CSS — no external stylesheets needed.

## Features

- Two built-in themes: *Dracula* and *Nord*
- Custom theme editor — change colours live in the browser
- Upload a \`.md\` file, then **copy** or **download** the result

## Code example

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

Inline \`code\` is styled too.

## Blockquote

> The output HTML is fully self-contained — every element carries its own \`style="…"\` attribute.

## Table

| Element  | Tag        | Theme colour |
| -------- | ---------- | ------------ |
| Heading  | h1 – h6    | purple / teal |
| Code     | pre, code  | green        |
| Link     | a          | cyan / blue  |

---

*Enjoy!*`;

    convert();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
