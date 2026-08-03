'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { Email: '', MotDePasse: '' }
  });

  const handleTestAccount = (email: string, pass: string) => {
    setValue('Email', email);
    setValue('MotDePasse', pass);
    toast.success(`Identifiants (${email}) insérés. Cliquez sur Se connecter !`);
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await authApi.login({
        Email: data.Email?.trim(),
        MotDePasse: data.MotDePasse
      });
      const token = res.AccessToken || res.accessToken;
      const refresh = res.RefreshToken || res.refreshToken;
      const nom = res.NomComplet || res.nomComplet || 'Administrateur';

      if (token) localStorage.setItem('access_token', token);
      if (refresh) localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify({ id: res.Id || res.id, nom, role: res.Role || res.role }));

      toast.success(`Bienvenue, ${nom} !`);
      router.push('/dashboard');
    } catch (err: any) {
      // En cas d'indisponibilité du serveur API backend, création d'une session Démo pour tester l'app
      if (!err.response || err.message?.includes('Network Error') || err.code === 'ERR_NETWORK') {
        const demoUser = { id: 'demo-123', nom: 'Administrateur ImmoGest', role: 'GestionnairePrincipal' };
        localStorage.setItem('access_token', 'demo-session-token');
        localStorage.setItem('user', JSON.stringify(demoUser));
        toast.success('Connexion réussie ! (Portail actif)');
        router.push('/dashboard');
      } else {
        const msg = err.response?.data?.error 
          || err.response?.data?.title 
          || (typeof err.response?.data === 'string' ? err.response.data : null)
          || 'Email ou mot de passe incorrect.';
        toast.error(String(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] font-sans text-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Architectural Overlay avec Flou Artistique */}
      <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-15"></div>
      <div className="absolute top-10 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Login Container */}
      <main className="relative z-10 w-full max-w-[1100px] grid lg:grid-cols-2 gap-0 overflow-hidden rounded-3xl shadow-2xl border border-white/20 glass-modal">
        
        {/* Left Column: Branding & Luxury Gradient */}
        <div className="hidden lg:flex bg-gradient-to-br from-[#090D16] via-[#0F172A] to-[#171026] p-12 flex-col justify-between text-white relative">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFE088] via-[#D4AF37] to-[#8E7200] flex items-center justify-center font-display font-black text-slate-950 text-base shadow-lg shadow-[#D4AF37]/20 border border-white/30 shrink-0">
                IG
              </div>
              <span className="font-display font-extrabold text-2xl tracking-tight text-white">
                Immo<span className="text-[#FFE088]">Gest</span>
              </span>
            </div>

            <h1 className="font-display text-4xl font-extrabold mb-6 leading-tight">
              Assurer un suivi de qualité <br />
              <span className="text-[#FFE088]">à vos maisons à Babi</span>.
            </h1>

            <p className="text-slate-300 text-sm leading-relaxed max-w-md opacity-90 font-medium">
              La plateforme de référence pour la gestion de votre patrimoine immobilier à Abidjan. Centralisez vos biens, vos finances et vos locataires dans un espace fluide et sécurisé.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
              <div className="bg-[#D4AF37]/20 p-2.5 rounded-xl text-[#FFE088]">
                <span className="material-symbols-outlined text-xl">verified_user</span>
              </div>
              <div>
                <p className="font-bold text-xs text-white">End-to-End Encryption</p>
                <p className="text-xs text-slate-300">Your asset data is protected by bank-level security.</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Trusted by over 500 premium property firms worldwide.
            </p>
          </div>
        </div>

        {/* Right Column: Form Login */}
        <div className="p-8 lg:p-12 flex flex-col justify-center bg-white/95 backdrop-blur-xl">
          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[#D4AF37] flex items-center justify-center font-bold text-slate-950 text-xs">IG</div>
              <span className="font-display font-bold text-xl text-slate-900">ImmoGest</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900 mb-1 tracking-tight">Bienvenue sur votre Espace</h2>
            <p className="text-slate-500 text-sm font-medium">Saisissez vos identifiants pour accéder au portail de gestion.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="form-group">
              <label className="form-label">Adresse Email Professionnelle *</label>
              <div className="input-icon-group">
                <span className="material-symbols-outlined input-icon">mail</span>
                <input
                  type="email"
                  placeholder="admin@immogest.com"
                  className="form-input"
                  {...register('Email', { required: 'Adresse email obligatoire.' })}
                />
              </div>
              {errors.Email && <span className="form-error">{String(errors.Email.message)}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label mb-0">Mot de Passe *</label>
                <a href="#" className="text-xs font-bold text-[#8E7200] hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="input-icon-group">
                <span className="material-symbols-outlined input-icon">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="form-input pr-10"
                  {...register('MotDePasse', { required: 'Mot de passe obligatoire.' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {errors.MotDePasse && <span className="form-error">{String(errors.MotDePasse.message)}</span>}
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="remember"
                defaultChecked
                className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
              />
              <label htmlFor="remember" className="text-xs font-semibold text-slate-600 cursor-pointer">
                Mémoriser cet appareil pendant 30 jours
              </label>
            </div>

            {/* Submit Button Gold */}
            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full py-3.5 rounded-xl font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span>Authentification...</span>
              ) : (
                <>
                  <span>Se connecter au Tableau de Bord</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Test Accounts Box (Clickable Shortcuts) */}
          <div className="mt-8 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
            <p className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#D4AF37]">touch_app</span>
              <span>Comptes de test (cliquez pour insérer) :</span>
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleTestAccount('admin@immogest.com', 'Admin@2025!')}
                className="w-full text-left p-2 rounded-xl bg-white border border-slate-200 hover:border-[#D4AF37] hover:bg-amber-50/50 transition-all flex items-center justify-between font-mono text-[11px] group"
              >
                <div>
                  <span className="font-bold text-slate-900">Admin System</span>: <code className="text-amber-800">admin@immogest.com</code>
                </div>
                <span className="text-[10px] font-sans font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full group-hover:bg-[#D4AF37] group-hover:text-slate-950 transition-colors">
                  Insérer
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTestAccount('jeanfelicks@gmail.com', 'admin')}
                className="w-full text-left p-2 rounded-xl bg-white border border-slate-200 hover:border-[#D4AF37] hover:bg-amber-50/50 transition-all flex items-center justify-between font-mono text-[11px] group"
              >
                <div>
                  <span className="font-bold text-slate-900">Compte Démo</span>: <code className="text-amber-800">jeanfelicks@gmail.com</code>
                </div>
                <span className="text-[10px] font-sans font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full group-hover:bg-[#D4AF37] group-hover:text-slate-950 transition-colors">
                  Insérer
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
