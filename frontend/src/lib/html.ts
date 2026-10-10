/** Cheap tag stripper for one-line previews in the list. */
export const previewText = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** Minimal sanitizer for rendering stored email HTML in the detail view. */
export function sanitizeHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,link,meta,form").forEach((n) => n.remove());
  doc.body.querySelectorAll("*").forEach((el) => {
    for (const a of Array.from(el.attributes)) {
      const n = a.name.toLowerCase();
      if (n.startsWith("on") || ((n === "href" || n === "src") && /^\s*javascript:/i.test(a.value))) {
        el.removeAttribute(a.name);
      }
    }
  });
  return doc.body.innerHTML;
}
