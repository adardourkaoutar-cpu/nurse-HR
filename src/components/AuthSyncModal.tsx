import React, { useState } from 'react';
import { 
  Cloud, 
  Mail, 
  Lock, 
  UserCheck, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  RefreshCw, 
  ShieldCheck, 
  Smartphone, 
  Laptop,
  ArrowRight
} from 'lucide-react';
import { User } from 'firebase/auth';
import { loginWithEmail, registerWithEmail, loginWithGoogle, logoutUser } from '../services/cloudSyncService';

interface AuthSyncModalProps {
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSyncNow: () => Promise<void>;
  isSyncing: boolean;
}

export const AuthSyncModal: React.FC<AuthSyncModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSyncNow,
  isSyncing
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('adardourkaoutar@gmail.com');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Veuillez remplir tous les champs.');
      return;
    }

    if (tab === 'register' && password !== confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    try {
      setLoading(true);
      if (tab === 'login') {
        await loginWithEmail(email.trim(), password);
        setSuccessMsg('Connexion réussie ! Vos données sont en cours de synchronisation.');
      } else {
        await registerWithEmail(email.trim(), password);
        setSuccessMsg('Compte créé avec succès ! Vos modifications existantes ont été téléversées dans le Cloud.');
      }
      await onSyncNow();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Une erreur est survenue.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Cette adresse email est déjà associée à un compte. Veuillez vous connecter.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Identifiants invalides (email ou mot de passe incorrect).';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Mot de passe trop faible (6 caractères minimum).';
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setLoading(true);
      await loginWithGoogle();
      setSuccessMsg('Authentification Google réussie ! Synchronisation active.');
      await onSyncNow();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Google auth error:', err);
      let errorText = err.message || 'Échec de la connexion avec Google.';
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain') || err.message?.includes('invalid')) {
        errorText = "Domaine Netlify non autorisé pour Google OAuth ou popup bloquée. Sur votre smartphone (raccourci), utilisez simplement la connexion par E-mail & Mot de passe ci-dessus !";
      } else if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        errorText = "La fenêtre popup Google a été bloquée par le raccourci mobile. Utilisez la connexion par E-mail et Mot de passe ci-dessus.";
      }
      setErrorMsg(errorText);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logoutUser();
      setSuccessMsg('Déconnexion effectuée.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la déconnexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-teal-100 text-teal-800 rounded-lg">
                <Cloud className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Synchronisation Multi-Appareils
                </h3>
                <p className="text-xs text-slate-500">
                  Accédez à vos tableaux de garde depuis n'importe quel poste
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Non-destructive guarantee notice */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Synchronisation PC ⮂ Mobile sans perte :</span>
            <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
              Connectez-vous avec ce même compte e-mail sur votre téléphone et votre ordinateur. Vos infirmiers, congés et plannings de garde s'actualiseront instantanément sur les deux appareils sans écraser votre travail.
            </p>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* If user is ALREADY authenticated */}
        {currentUser ? (
          <div className="space-y-4 pt-1">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Compte connecté :</span>
                <span className="font-semibold text-slate-900 font-mono">{currentUser.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">État de synchronisation :</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Actif dans le Cloud
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-around text-slate-600 text-[11px]">
                <span className="flex items-center gap-1"><Laptop className="w-3.5 h-3.5" /> Ordinateur</span>
                <span>⮂</span>
                <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> Mobile / Tablette</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onSyncNow}
                disabled={isSyncing}
                className="flex-1 py-2 px-3 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}</span>
              </button>

              <button
                onClick={handleLogout}
                disabled={loading}
                className="py-2 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        ) : (
          /* Form for LOGIN / REGISTER */
          <div className="space-y-4">
            
            {/* Tabs Switcher */}
            <div className="flex rounded-lg bg-slate-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
                  tab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`flex-1 py-1.5 rounded-md font-semibold transition-all ${
                  tab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Créer un compte
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Adresse Email :
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: infirmier.chef@sante.gov.ma"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Mot de passe :
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6 caractères minimum"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {tab === 'register' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Confirmer le mot de passe :
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Retapez le mot de passe"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{tab === 'login' ? 'Connexion & Synchronisation' : 'Créer mon compte & Synchroniser'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="shrink-0 mx-2 text-[10px] text-slate-400 uppercase font-semibold">Ou</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continuer avec Google</span>
            </button>

            {/* Mobile PWA note */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
              <Smartphone className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Conseil pour raccourci smartphone :</strong> Si Google affiche « Action non valide », c'est parce que les raccourcis mobiles bloquent les popups externes. Connectez-vous simplement avec votre <strong className="text-teal-900">E-mail et Mot de passe</strong> ci-dessus pour synchroniser en toute fluidité !
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
