import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-4xl">🔍</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Page nahi mila</h1>
      <p className="text-gray-500 mb-6 max-w-sm">
        Yeh page exist nahi karta ya move ho gaya hai.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
      >
        Dashboard pe jaayein
      </Link>
    </div>
  );
}
