import Image from "next/image";

// Real screens from the Starlane phone app (docs/client-platform/mobile), on a
// test company's books, fanned out in phone frames. The app is in testing, and
// the section copy says so; nothing here implies a published store listing.

const SCREENS = [
  { k: "bridge", l: "The Bridge", alt: "The Bridge on the phone: ₹2,72,500 owed, ₹2,08,500 overdue, receivables by overdue band and new Watch alerts." },
  { k: "alert", l: "An alert", alt: "A Watch alert on the phone: Mehta Hardware invoice S/101 is more than 30 days overdue, with why it was raised." },
  { k: "mission", l: "A mission", alt: "A collections mission on the phone: collect the overdue amount from Mehta Hardware within 14 days, progress from the books, one firm reminder waiting for approval, and sending switched off for this test company." },
  { k: "scan", l: "Scan", alt: "Scan on the phone: why Mehta Hardware's invoice is 45 days overdue, with each figure labelled fact or calculated." },
  { k: "memory", l: "Memory", alt: "Memory on the phone: Mehta Hardware usually pays about 8 days after the due date, with That's right, Correct and Forget." },
];

export function PhoneRow() {
  return (
    <ul className="slph">
      {SCREENS.map((s, i) => (
        <li key={s.k} className={`slph-item slph-${i}`} data-reveal>
          <div className="slph-phone">
            <div className="slph-status" aria-hidden><span className="slph-island" /></div>
            <Image src={`/product/phone/${s.k}.webp`} width={780} height={1688} sizes="(max-width: 860px) 62vw, 240px" alt={s.alt} />
          </div>
          <p className="slph-l">{s.l}</p>
        </li>
      ))}
    </ul>
  );
}
