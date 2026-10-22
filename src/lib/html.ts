// Üreticinin yazdığı HTML'i göstermeden önce temizler. Asıl güvenlik iframe sandbox'ıdır
// (betik yok, aynı köken yok); bu katman ek savunma ve boyut/çerçeve düzeltmesi yapar.

export interface HtmlCheck {
  ok: boolean;
  html: string;
  reason?: string;
}

const MAX_BYTES = 250_000;

const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:">`;

/** Model çıktısından kod çitini ve açıklama metnini ayıklar. */
export function extractHtml(text: string): string {
  let t = text.trim();
  const fence = /```(?:html)?\s*([\s\S]*?)```/i.exec(t);
  if (fence) t = fence[1].trim();
  const start = t.search(/<!doctype html|<html[\s>]/i);
  if (start > 0) t = t.slice(start);
  return t;
}

export function sanitizeDesignHtml(raw: string, width: number, height: number): HtmlCheck {
  let html = extractHtml(raw);
  if (!/<body[\s>]/i.test(html) || !/<\/body>/i.test(html)) return { ok: false, html: "", reason: "HTML belgesi değil (body yok)" };
  if (html.length > MAX_BYTES) return { ok: false, html: "", reason: "HTML çok büyük" };

  html = html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(link|iframe|object|embed|base|form)\b[^>]*>(\s*<\/\1>)?/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/@import[^;]+;/gi, "")
    .replace(/url\(\s*(['"]?)(?!data:)[^)]*\1\s*\)/gi, "none")
    .replace(/\s(src|href|xlink:href)\s*=\s*("(?!data:|#)[^"]*"|'(?!data:|#)[^']*')/gi, "");

  const frame = `<style>html,body{margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden}</style>`;
  if (/<head[\s>]/i.test(html)) html = html.replace(/<\/head>/i, `${CSP}${frame}</head>`);
  else html = html.replace(/<html[^>]*>/i, (m) => `${m}<head>${CSP}${frame}</head>`);
  if (!/^<!doctype/i.test(html)) html = `<!doctype html>\n${html}`;
  return { ok: true, html };
}
