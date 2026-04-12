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

  function copyMD() {
    const val = document.getElementById("md-input").value;
    if (!val.trim()) { showToast("Nothing to copy"); return; }
    navigator.clipboard.writeText(val).then(
      () => showToast("Copied!"),
      () => showToast("Copy failed")
    );
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

  function downloadMD() {
    const val = document.getElementById("md-input").value;
    if (!val.trim()) { showToast("Nothing to download"); return; }
    const blob = new Blob([val], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "output.md";
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
      localStorage.setItem("mdToHtmlContent", ev.target.result);
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

  // ── Context menu ──────────────────────────────────────────────────────────

  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? "\u2318" : "Ctrl";

  const CTX_MENU_DEF = [
    { label: "Add Link", action: "addLink" },
    { label: "Add External Link", action: "addExtLink" },
    { label: "Format", children: [
      { label: "Bold", action: "bold", shortcut: modKey + "+B" },
      { label: "Italic", action: "italic", shortcut: modKey + "+I" },
      { label: "Strikethrough", action: "strikethrough" },
      { label: "Highlight", action: "highlight" },
      { label: "Code", action: "code" },
      { label: "Comment", action: "comment" },
    ]},
    { label: "Paragraph", children: [
      { label: "Bullet List", action: "bulletList" },
      { label: "Numbered List", action: "numberedList" },
      { label: "Task List", action: "taskList" },
      { label: "Heading 1", action: "h1" },
      { label: "Heading 2", action: "h2" },
      { label: "Heading 3", action: "h3" },
      { label: "Heading 4", action: "h4" },
      { label: "Heading 5", action: "h5" },
      { label: "Heading 6", action: "h6" },
      { label: "Quote", action: "quote" },
    ]},
    { label: "Insert", children: [
      { label: "Footnote", action: "footnote" },
      { label: "Table", action: "table" },
      { label: "Callout", action: "callout" },
      { label: "Horizontal Rule", action: "hr" },
      { label: "Code Block", action: "codeBlock" },
    ]},
    { type: "separator" },
    { label: "Cut", action: "cut", shortcut: modKey + "+X" },
    { label: "Copy", action: "copy", shortcut: modKey + "+C" },
    { label: "Paste", action: "paste", shortcut: modKey + "+V" },
    { label: "Paste as Plain Text", action: "pastePlain", shortcut: modKey + "+Shift+V" },
    { label: "Select All", action: "selectAll", shortcut: modKey + "+A" },
  ];

  let ctxState = { start: 0, end: 0, text: "" };
  let subTimer = null;

  function buildCtxItems(container, items) {
    for (const item of items) {
      if (item.type === "separator") {
        const sep = document.createElement("div");
        sep.className = "ctx-sep";
        container.appendChild(sep);
        continue;
      }

      const row = document.createElement("div");
      row.className = "ctx-item";

      const label = document.createElement("span");
      label.textContent = item.label;
      row.appendChild(label);

      if (item.children) {
        row.classList.add("has-sub");
        const arrow = document.createElement("span");
        arrow.className = "ctx-arrow";
        arrow.textContent = "\u25B8";
        row.appendChild(arrow);

        const sub = document.createElement("div");
        sub.className = "ctx-submenu";
        buildCtxItems(sub, item.children);
        row.appendChild(sub);

        row.addEventListener("mouseenter", function () {
          clearTimeout(subTimer);
          // close sibling submenus
          container.querySelectorAll(":scope > .ctx-item.has-sub.open").forEach(function (el) {
            if (el !== row) el.classList.remove("open");
          });
          row.classList.add("open");
          // flip if overflowing viewport
          const rect = sub.getBoundingClientRect();
          sub.classList.toggle("flip-h", rect.right > window.innerWidth);
          sub.classList.toggle("flip-v", rect.bottom > window.innerHeight);
        });
        row.addEventListener("mouseleave", function () {
          subTimer = setTimeout(function () { row.classList.remove("open"); }, 150);
        });
        sub.addEventListener("mouseenter", function () { clearTimeout(subTimer); });
      } else {
        if (item.shortcut) {
          const sc = document.createElement("span");
          sc.className = "ctx-shortcut";
          sc.textContent = item.shortcut;
          row.appendChild(sc);
        }
        row.addEventListener("click", function () {
          hideCtxMenu();
          execCtxAction(item.action);
        });
      }

      container.appendChild(row);
    }
  }

  function showCtxMenu(x, y) {
    hideCtxMenu();
    const menu = document.getElementById("ctx-menu");
    menu.innerHTML = "";
    buildCtxItems(menu, CTX_MENU_DEF);

    menu.style.left = x + "px";
    menu.style.top = y + "px";
    menu.classList.remove("hidden");

    // clamp to viewport
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = Math.max(0, x - rect.width) + "px";
    if (rect.bottom > window.innerHeight) menu.style.top = Math.max(0, y - rect.height) + "px";
  }

  function hideCtxMenu() {
    const menu = document.getElementById("ctx-menu");
    menu.classList.add("hidden");
    menu.innerHTML = "";
  }

  // ── Text manipulation helpers ───────────────────────────────────────────

  function replaceSelection(before, after, defaultText) {
    const ta = document.getElementById("md-input");
    const s = ctxState.start;
    const e = ctxState.end;
    const val = ta.value;
    const selected = val.slice(s, e);
    const insert = selected || defaultText || "";
    ta.value = val.slice(0, s) + before + insert + after + val.slice(e);
    ta.focus();
    if (selected) {
      ta.setSelectionRange(s + before.length, s + before.length + selected.length);
    } else {
      ta.setSelectionRange(s + before.length, s + before.length + insert.length);
    }
    convert();
  }

  function insertAtCursor(text) {
    const ta = document.getElementById("md-input");
    const s = ctxState.start;
    const e = ctxState.end;
    const val = ta.value;
    ta.value = val.slice(0, s) + text + val.slice(e);
    ta.focus();
    const pos = s + text.length;
    ta.setSelectionRange(pos, pos);
    convert();
  }

  function prefixLines(prefixFn) {
    const ta = document.getElementById("md-input");
    const val = ta.value;
    const s = ctxState.start;
    const e = ctxState.end;
    const lineStart = val.lastIndexOf("\n", s - 1) + 1;
    let lineEnd = val.indexOf("\n", e);
    if (lineEnd === -1) lineEnd = val.length;
    const selected = val.slice(lineStart, lineEnd);
    const lines = selected.split("\n");
    const transformed = lines.map(function (line, i) { return prefixFn(line, i); }).join("\n");
    ta.value = val.slice(0, lineStart) + transformed + val.slice(lineEnd);
    ta.focus();
    ta.setSelectionRange(lineStart, lineStart + transformed.length);
    convert();
  }

  // ── Action dispatcher ───────────────────────────────────────────────────

  function execCtxAction(action) {
    const ta = document.getElementById("md-input");

    switch (action) {
      // Links
      case "addLink":
        replaceSelection("[", "](url)", "text");
        break;
      case "addExtLink":
        replaceSelection("[", "](https://)", "text");
        break;

      // Format
      case "bold":
        replaceSelection("**", "**", "text");
        break;
      case "italic":
        replaceSelection("*", "*", "text");
        break;
      case "strikethrough":
        replaceSelection("~~", "~~", "text");
        break;
      case "highlight":
        replaceSelection("==", "==", "text");
        break;
      case "code":
        replaceSelection("`", "`", "code");
        break;
      case "comment":
        replaceSelection("<!-- ", " -->", "comment");
        break;

      // Paragraph
      case "bulletList":
        prefixLines(function (line) { return "- " + line; });
        break;
      case "numberedList":
        prefixLines(function (line, i) { return (i + 1) + ". " + line; });
        break;
      case "taskList":
        prefixLines(function (line) { return "- [ ] " + line; });
        break;
      case "h1": case "h2": case "h3": case "h4": case "h5": case "h6":
        var lvl = +action[1];
        prefixLines(function (line) { return "#".repeat(lvl) + " " + line; });
        break;
      case "quote":
        prefixLines(function (line) { return "> " + line; });
        break;

      // Insert
      case "footnote":
        var existing = (ta.value.match(/\[\^(\d+)\]/g) || []);
        var nums = existing.map(function (m) { return parseInt(m.match(/\d+/)[0], 10); });
        var next = nums.length ? Math.max.apply(null, nums) + 1 : 1;
        var ref = "[^" + next + "]";
        var val = ta.value;
        var s = ctxState.start;
        var e = ctxState.end;
        ta.value = val.slice(0, s) + ref + val.slice(e) + "\n\n" + ref + ": ";
        ta.focus();
        var endPos = ta.value.length;
        ta.setSelectionRange(endPos, endPos);
        convert();
        break;
      case "table":
        insertAtCursor("\n| Header | Header |\n| ------ | ------ |\n| Cell   | Cell   |\n");
        break;
      case "callout":
        insertAtCursor("\n> [!NOTE]\n> Content\n");
        break;
      case "hr":
        insertAtCursor("\n---\n");
        break;
      case "codeBlock":
        insertAtCursor("\n```\n\n```\n");
        break;

      // Clipboard
      case "cut":
        if (ctxState.text) {
          navigator.clipboard.writeText(ctxState.text).then(function () {
            var val = ta.value;
            ta.value = val.slice(0, ctxState.start) + val.slice(ctxState.end);
            ta.focus();
            ta.setSelectionRange(ctxState.start, ctxState.start);
            convert();
          }, function () { showToast("Clipboard access denied"); });
        }
        break;
      case "copy":
        if (ctxState.text) {
          navigator.clipboard.writeText(ctxState.text).then(
            function () { showToast("Copied!"); },
            function () { showToast("Clipboard access denied"); }
          );
        }
        break;
      case "paste":
      case "pastePlain":
        navigator.clipboard.readText().then(function (text) {
          var val = ta.value;
          ta.value = val.slice(0, ctxState.start) + text + val.slice(ctxState.end);
          ta.focus();
          var pos = ctxState.start + text.length;
          ta.setSelectionRange(pos, pos);
          convert();
        }, function () { showToast("Clipboard access denied"); });
        break;
      case "selectAll":
        ta.focus();
        ta.setSelectionRange(0, ta.value.length);
        break;
    }
  }

  // ── Site-wide light/dark theme ────────────────────────────────────────────

  function applyTheme(isLight) {
    document.body.classList.toggle("light", isLight);
    const btn = document.getElementById("theme-btn");
    if (btn) btn.textContent = isLight ? "\u263D" : "\u2600";
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  // ── Expand / collapse panes ───────────────────────────────────────────────

  function toggleExpand(paneId) {
    const md   = document.getElementById("pane-md");
    const html = document.getElementById("pane-html");
    const target = paneId === "md" ? md : html;
    const other  = paneId === "md" ? html : md;

    if (other.classList.contains("collapsed")) {
      // restore both
      other.classList.remove("collapsed");
    } else {
      // collapse the other pane
      other.classList.add("collapsed");
    }
  }

  function init() {
    customTheme = deepCopy(THEMES.dracula);

    applyTheme(localStorage.getItem("siteTheme") === "light");
    document.getElementById("theme-btn").addEventListener("click", () => {
      const nowLight = !document.body.classList.contains("light");
      applyTheme(nowLight);
      localStorage.setItem("siteTheme", nowLight ? "light" : "dark");
    });

    document.getElementById("md-input").addEventListener("input", () => {
      convert();
      localStorage.setItem("mdToHtmlContent", document.getElementById("md-input").value);
    });

    document.getElementById("theme-select").addEventListener("change", (e) => {
      currentThemeName = e.target.value;
      convert();
    });

    document.getElementById("upload-btn").addEventListener("click", uploadMD);
    document.getElementById("file-input").addEventListener("change", onFileSelected);
    document.getElementById("expand-md").addEventListener("click", () => toggleExpand("md"));
    document.getElementById("expand-html").addEventListener("click", () => toggleExpand("html"));
    document.getElementById("copy-md-btn").addEventListener("click", copyMD);
    document.getElementById("copy-btn").addEventListener("click", copyHTML);
    document.getElementById("download-btn").addEventListener("click", downloadHTML);
    document.getElementById("download-md-btn").addEventListener("click", downloadMD);

    document.getElementById("customize-btn").addEventListener("click", openCustomizer);
    document.getElementById("customize-close").addEventListener("click", closeCustomizer);
    document.getElementById("customize-apply").addEventListener("click", applyCustomizer);
    document.getElementById("customize-cancel").addEventListener("click", closeCustomizer);
    document.getElementById("customize-modal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("customize-modal")) closeCustomizer();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeCustomizer(); hideCtxMenu(); }
    });

    // Context menu on markdown input
    document.getElementById("md-input").addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const ta = e.target;
      ctxState.start = ta.selectionStart;
      ctxState.end = ta.selectionEnd;
      ctxState.text = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      showCtxMenu(e.clientX, e.clientY);
    });

    document.addEventListener("mousedown", (e) => {
      const menu = document.getElementById("ctx-menu");
      if (!menu.classList.contains("hidden") && !menu.contains(e.target)) hideCtxMenu();
    });

    window.addEventListener("resize", hideCtxMenu);
    document.getElementById("md-input").addEventListener("scroll", hideCtxMenu);

    const DEMO = `# Welcome to MD → HTML

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

    function loadContent(text) {
      document.getElementById("md-input").value = text;
      convert();
    }

    const saved = localStorage.getItem("mdToHtmlContent");

    if (saved && saved.trim()) {
      const modal = document.getElementById("restore-modal");
      modal.classList.remove("hidden");

      document.getElementById("restore-continue").addEventListener("click", () => {
        loadContent(saved);
        modal.classList.add("hidden");
      });

      document.getElementById("restore-clear").addEventListener("click", () => {
        localStorage.removeItem("mdToHtmlContent");
        loadContent(DEMO);
        modal.classList.add("hidden");
      });
    } else {
      loadContent(DEMO);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
