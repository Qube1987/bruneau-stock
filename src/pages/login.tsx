import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (error: any) {
      if (error?.message?.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.');
      } else if (error?.message?.includes('Email not confirmed')) {
        setError('Veuillez confirmer votre email avant de vous connecter.');
      } else {
        setError('Erreur de connexion. Veuillez réessayer.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[#29235C]">
            Connexion
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  'appearance-none rounded-none relative block w-full px-3 py-2 border',
                  'border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md',
                  'focus:outline-none focus:ring-[#E72C63] focus:border-[#E72C63] focus:z-10 sm:text-sm'
                )}
                placeholder="Email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  'appearance-none rounded-none relative block w-full px-3 py-2 border',
                  'border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md',
                  'focus:outline-none focus:ring-[#E72C63] focus:border-[#E72C63] focus:z-10 sm:text-sm'
                )}
                placeholder="Mot de passe"
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}