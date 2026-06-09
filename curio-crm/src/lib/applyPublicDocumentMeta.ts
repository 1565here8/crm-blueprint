import { demoMetaDescription } from "../../shared/demoCopy";
import { getPublicBrand, isPublicDemoSkin } from "./publicBrand";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

/** Host-aware title + meta for public www. Always noindex until broker handoff. */
export function applyPublicDocumentMeta(): void {
  const brand = getPublicBrand();
  const demoSkin = isPublicDemoSkin();
  document.title = demoSkin
    ? `${brand.name} — multi-asset broker demo (simulated)`
    : `${brand.name} — multi-asset trading platform`;
  const description = demoSkin
    ? demoMetaDescription(brand.name)
    : `${brand.name} — client portal for equities, FX, crypto, and metals. Professional multi-asset trading on ${brand.domain}.`;
  setMeta("description", description);
  setMeta("robots", "noindex, nofollow");
  setMeta("googlebot", "noindex, nofollow");
  setMeta("og:title", demoSkin ? `${brand.name} — broker demo platform` : `${brand.name} — client portal`, "property");
  setMeta("og:description", description, "property");
}
