import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Loader2, TrendingUp, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

export default function Index() {
  const { isAuthenticated, login, register } = useAuth();
  const navigate = useNavigate();
  const [showReset, setShowReset] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Branding */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <span className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            FinSight
          </span>
        </div>
        <p className="text-gray-500 text-sm max-w-xs">
          Turn every cedi into progress.
        </p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-gray-100">
        {showReset ? (
          <>
            <CardHeader className="pb-2">
              <button
                onClick={() => setShowReset(false)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </button>
              <CardTitle className="text-xl text-gray-800">Reset Password</CardTitle>
              <CardDescription>Enter your email and choose a new password.</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <ForgotPasswordForm onDone={() => setShowReset(false)} />
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl text-center text-gray-800">Welcome back</CardTitle>
              <CardDescription className="text-center">
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <LoginForm
                    onSuccess={() => navigate('/dashboard')}
                    login={login}
                    onForgotPassword={() => setShowReset(true)}
                  />
                </TabsContent>

                <TabsContent value="register">
                  <RegisterForm onSuccess={() => navigate('/dashboard')} register={register} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </>
        )}
      </Card>

      <p className="mt-6 text-xs text-gray-400">
        © {new Date().getFullYear()} FinSight · Earn. Manage. Grow.
      </p>
    </div>
  );
}


// ─── Login form ───────────────────────────────────────────────────────────────

interface LoginFormProps {
  login: (email: string, password: string) => Promise<void>;
  onSuccess: () => void;
  onForgotPassword: () => void;
}

function LoginForm({ login, onSuccess, onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
          >
            Forgot password?
          </button>
        </div>
        <Input
          id="login-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={loading}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          'Sign In'
        )}
      </Button>
    </form>
  );
}


// ─── Register form ────────────────────────────────────────────────────────────

interface RegisterFormProps {
  register: (email: string, name: string, password: string) => Promise<void>;
  onSuccess: () => void;
}

function RegisterForm({ register, onSuccess }: RegisterFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, name, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="register-name">Full Name</Label>
        <Input
          id="register-name"
          type="text"
          placeholder="Kweku Mensah"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-password">Password</Label>
        <Input
          id="register-password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          disabled={loading}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account…
          </>
        ) : (
          'Create Account'
        )}
      </Button>

      <p className="text-xs text-center text-gray-400 pt-1">
        Password must be at least 8 characters.
      </p>
    </form>
  );
}


// ─── Reset password form ──────────────────────────────────────────────────────

function ForgotPasswordForm({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/reset-password', { email, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4 py-2">
        <p className="text-emerald-600 font-medium">Password updated successfully!</p>
        <p className="text-sm text-gray-500">You can now log in with your new password.</p>
        <Button variant="outline" className="w-full" onClick={onDone}>
          Back to login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reset-password">New Password</Label>
        <Input
          id="reset-password"
          type="password"
          placeholder="At least 8 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reset-confirm">Confirm Password</Label>
        <Input
          id="reset-confirm"
          type="password"
          placeholder="Repeat new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          disabled={loading}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating…
          </>
        ) : (
          'Reset Password'
        )}
      </Button>
    </form>
  );
}
