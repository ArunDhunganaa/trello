import { Navbar } from '../components/layout/Navbar'

export function BoardPage() {
  return (
    <div className="min-h-screen bg-sky-500 flex flex-col">
      <Navbar />
      <main className="flex-1 p-4">
        <p className="text-white text-sm">Board view with lists and cards coming in Phase 3.</p>
      </main>
    </div>
  )
}
