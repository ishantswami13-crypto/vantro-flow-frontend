import Image from "next/image";
import Link from "next/link";

// Sanitized capture of the real read-only 2xA impact route. It contains only
// fictional demo entities and deterministic demonstration figures.
export function ProductReveal() {
  return (
    <section id="product" aria-label="Starlane intelligence product capture" className="sl-wrap-wide sl-wrap sl-product">
      <figure>
        <div className="sl-frame sl-product-ui">
          <div className="sl-product-heading">
            <span>Intelligence / Impact</span>
            <span>Simulated demonstration · Read-only</span>
          </div>
          <div className="sl-product-capture">
            <Image src="/product/intelligence-impact-2xa.png" width={2368} height={448} priority sizes="(max-width: 767px) 100vw, 1180px" alt="Starlane intelligence impact view showing a simulated Sichuan earthquake demonstration with revenue exposed, time to stockout, affected orders, and confidence metrics." />
          </div>
        </div>
        <figcaption className="sl-product-caption">
          <span><strong>Simulated demonstration.</strong> Real product view using fictional demo data and deterministic figures.<br />Historical event replay; not customer results.</span>
          <Link href="/intelligence" className="sl-link-arrow">Open Intelligence →</Link>
        </figcaption>
      </figure>
    </section>
  );
}
