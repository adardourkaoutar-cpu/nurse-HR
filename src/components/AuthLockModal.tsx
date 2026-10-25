import React, { useState } from 'react';
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthLockModalProps {
  hasExistingPassword: boolean;
  onUnlock: (password: string) => boolean;
  onSetPassword: (password: string) => void;
}

export const AuthLockModal: React.FC<AuthLockModalProps> = ({
  hasExistingPassword,
  onUnlock,
  onSetPassword,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg('Veuillez saisir votre mot de passe.');
      return;
    }

    const success = onUnlock(password);
    if (!success) {
      setErrorMsg('Mot de passe incorrect. Veuillez réessayer.');
      setPassword('');
    }
  };

  const handleSetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 4) {
      setErrorMsg('Le mot de passe doit comporter au moins 4 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Les deux mots de passe ne correspondent pas.');
      return;
    }

    onSetPassword(password);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-7 space-y-6 text-slate-900 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 mx-auto flex items-center justify-center shadow-xs">
            <Lock className="w-7 h-7 text-teal-700" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              {hasExistingPassword ? 'Accès Sécurisé · BlocRH' : 'Configuration du Mot de Passe'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {hasExistingPassword
                ? 'Protection des données personnelles et dossiers du staff infirmier'
                : 'Choisissez un mot de passe personnel pour protéger les données du bloc opératoire'}
            </p>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        {hasExistingPassword ? (
          /* UNLOCK FORM */
          <form onSubmit={handleUnlockSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Mot de passe d'accès
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="Entrez votre mot de passe..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 pr-10 bg-slate-50/50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg transition-colors text-xs shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              <KeyRound className="w-4 h-4" />
              Déverrouiller l'application
            </button>
          </form>
        ) : (
          /* INITIAL SETUP FORM */
          <form onSubmit={handleSetPasswordSubmit} className="space-y-4 text-xs">
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Définir votre mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="Ex: 4 caractères ou plus..."
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confirmer le mot de passe *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Répétez le même mot de passe..."
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                Confidentialité garantie
              </div>
              <p>
                Ce mot de passe sera requis pour ouvrir l'application et consulter les identifiants, PPR, CNI et congés. Vous pourrez le modifier à tout moment.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg transition-colors text-xs shadow-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Enregistrer et Déverrouiller
            </button>
          </form>
        )}

        <div className="text-center text-[11px] text-slate-400 border-t border-slate-100 pt-3">
          Service du Bloc Opératoire · Données Hospitalières Protégées
        </div>

      </div>
    </div>
  );
};
