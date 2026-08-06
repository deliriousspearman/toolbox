// Shared code-syntax tokenizer used by md-to-html and terminal-builder.
//
// Both tools render the same handful of languages (js/py/sh/json/sql/rust/
// go/html/css) with the same reserved-word sets and the same per-language
// token regex, then walk matches and assign a colour from a caller-supplied
// palette (`syn`). This module holds that shared core; each tool still owns
// its own render loop so tool-specific behaviour (terminal-builder's prompt/
// sudo/command highlighting) can layer on top without this module knowing
// about it.
//
// Exposed as window.SyntaxHighlight: { KEYWORDS, escapeHtml, tokenRegex, baseColor }

(function (global) {
  "use strict";

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

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Per-language token regex. `lang` should already be normalised (e.g. via
  // a caller-side alias map) to one of the KEYWORDS keys above; unrecognised
  // values fall through to the generic (js-like) pattern, same as before.
  function tokenRegex(lang) {
    if (lang === "py") {
      return /(#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b0x[0-9a-fA-F]+\b|\b\d+\.?\d*(?:e[+-]?\d+)?\b|[A-Za-z_][A-Za-z0-9_]*)/g;
    }
    if (lang === "sh") {
      return /(#[^\n]*|"(?:[^"\\]|\\.)*"|'[^']*'|\b\d+\b|[A-Za-z_][A-Za-z0-9_]*)/g;
    }
    if (lang === "html") {
      return /(<!--[\s\S]*?-->|<\/?[A-Za-z][A-Za-z0-9-]*|\/?>|"[^"]*"|'[^']*'|[A-Za-z][A-Za-z0-9-]*(?==))/g;
    }
    if (lang === "css") {
      return /(\/\*[\s\S]*?\*\/|"[^"]*"|'[^']*'|#[0-9a-fA-F]{3,8}\b|\b\d+\.?\d*(?:px|em|rem|%|vh|vw|pt|s|ms|deg)?\b|@[A-Za-z-]+|:[A-Za-z-]+|[A-Za-z_-][A-Za-z0-9_-]*)/g;
    }
    return /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b0x[0-9a-fA-F]+\b|\b\d+\.?\d*(?:e[+-]?\d+)?\b|[A-Za-z_$][A-Za-z0-9_$]*)/g;
  }

  /* Base per-token colour shared by both tools' render loops. Returns null
     when the token isn't coloured by this shared logic — callers layer
     their own extra rules on top by checking for null first (e.g.
     terminal-builder's prompt/sudo/command highlighting).

     `lang` is only special-cased for "html" and "css"; every other value
     (including terminal-builder's "terminal", which isn't one of the
     KEYWORDS keys) takes the generic comment/string/number/keyword path,
     matching both tools' original behaviour.                            */
  function baseColor(lang, tok, kwSet, syn) {
    if (lang === "html") {
      if (tok.startsWith("<!--")) return syn.comment;
      if (tok.startsWith("<") || tok === "/>") return syn.keyword;
      if (tok[0] === '"' || tok[0] === "'") return syn.string;
      return null;
    }
    if (lang === "css") {
      if (tok.startsWith("/*")) return syn.comment;
      if (tok[0] === '"' || tok[0] === "'") return syn.string;
      if (tok.startsWith("#") && /^#[0-9a-fA-F]{3,8}$/.test(tok)) return syn.number;
      if (/^\d/.test(tok)) return syn.number;
      if (tok.startsWith("@") || tok.startsWith(":")) return syn.keyword;
      if (kwSet.has(tok)) return syn.keyword;
      return null;
    }
    if (tok.startsWith("//") || tok.startsWith("/*") || tok.startsWith("#")) return syn.comment;
    if (tok[0] === '"' || tok[0] === "'" || tok[0] === "`") return syn.string;
    if (/^(?:0x[\da-fA-F]+|\d)/.test(tok)) return syn.number;
    if (kwSet.has(lang === "sql" ? tok.toLowerCase() : tok)) return syn.keyword;
    return null;
  }

  global.SyntaxHighlight = { KEYWORDS, escapeHtml, tokenRegex, baseColor };
})(window);
