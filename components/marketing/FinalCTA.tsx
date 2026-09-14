import Link from "next/link";

// Section 10 — final CTA. Minimal, large type, one action.
export function FinalCTA() {
  return (
    <section className="sl-section sl-section-monumental" style={{ textAlign: "center" }}>
      <div className="sl-wrap sl-rv">
        <h2 className="sl-h2" style={{ maxWidth: 720, margin: "0 auto 36px" }}>
          See what your business isn't seeing yet.
        </h2>
        <Link href="/signup" className="sl-btn sl-btn-solid">
          Request access
        </Link>
      </div>
    </section>
  );
}
