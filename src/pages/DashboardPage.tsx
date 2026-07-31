import { Navbar } from '../components/layout/Navbar'

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Boards</h1>
        <p className="text-gray-500 text-sm">Boards dashboard coming in Phase 2.</p>
      </main>
    </div>
  )
}
