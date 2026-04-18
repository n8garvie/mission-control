import Link from "next/link";

export default function IdeasPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-gray-500 hover:text-gray-900 transition-colors"
              >
                ← Back
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-lg">
                  💡
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Idea Inbox</h1>
                  <p className="text-sm text-gray-500">Review and approve ideas</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center px-4">
                <span className="text-2xl font-bold text-amber-600">0</span>
                <span className="text-xs text-gray-500 block">Scouted</span>
              </div>
              <div className="text-center px-4 border-l border-gray-200">
                <span className="text-2xl font-bold text-blue-600">0</span>
                <span className="text-xs text-gray-500 block">Approved</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Scouted Ideas Section */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🔍</span>
            Scouted Ideas
            <span className="text-sm font-normal text-gray-500">(0)</span>
          </h2>
          
          <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">All caught up!</h3>
            <p className="text-gray-500">No scouted ideas to review</p>
          </div>
        </section>

        {/* Approved Ideas Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>✅</span>
            Approved Ideas
            <span className="text-sm font-normal text-gray-500">(0)</span>
          </h2>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <p className="text-sm text-green-700">
              Approved ideas will appear here. Check the <Link href="/dashboard" className="font-medium underline">Dashboard</Link> to track builds.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
