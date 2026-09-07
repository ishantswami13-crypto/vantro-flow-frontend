import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ background: "#080808" }}>
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(79,110,247,0.1)", border: "1px solid rgba(79,110,247,0.2)" }}>
        <span className="text-4xl">🔍</span>
      </div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "#F2F2F2" }}>Page nahi mila</h1>
      <p className="text-sm mb-6 max-w-sm" style={{ color: "#888888" }}>
        Yeh page exist nahi karta ya move ho gaya hai.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
        style={{ background: "#4F6EF7", color: "#ffffff" }}
      >
        Dashboard pe jaayein
      </Link>
    </div>
  );
}
