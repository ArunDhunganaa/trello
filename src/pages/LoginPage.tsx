import { LoginForm } from '../components/auth/LoginForm'

const AppIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="white" aria-hidden="true">
    <rect x="2" y="3" width="7" height="14" rx="1.5" />
    <rect x="13" y="3" width="9" height="9" rx="1.5" />
    <rect x="13" y="16" width="9" height="5" rx="1.5" />
  </svg>
)

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <AppIcon />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your workspace</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
