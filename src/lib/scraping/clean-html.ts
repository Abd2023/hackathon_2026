import * as cheerio from "cheerio";

export function cleanHtml(rawHtml: string): string {
  const $ = cheerio.load(rawHtml);
  
  // Remove scripts, styles, noscript, iframes
  $("script, style, noscript, iframe, svg, path, nav, footer, header").remove();

  // Remove hidden elements
  $("[style*='display: none'], [style*='display:none']").remove();

  // Return text content with cleaned spacing
  const text = $("body").text();
  return text.replace(/\s+/g, " ").trim();
}
