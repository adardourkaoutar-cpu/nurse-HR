import React, { useState } from 'react';
import { X, Lock, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ChangePasswordModalProps {
  onSaveNewPassword: (oldPassword: string, newPassword: string) => { success: boolean; error?: string };
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  onSaveNewPassword,
  onClose,
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      setErrorMsg('Veuillez saisir votre mot de passe actuel.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('Le nouveau mot de passe doit comporter au moins 4 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('La confirmation du nouveau mot de passe ne correspond pas.');
      return;
    }

    const res = onSaveNewPassword(oldPassword, newPassword);
    if (!res.success) {
      setErrorMsg(res.error || 'Mot de passe actuel incorrect.');
    } else {
      setSuccessMsg('Mot de passe mis à jour avec succès.');
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-teal-700" />
            <h2 className="text-base font-bold text-slate-900">
              Modifier le Mot de Passe
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Mot de passe actuel *
            </label>
            <input
              type="password"
              required
              autoFocus
              value={oldPassword}
              onChange={(e) => {
                setOldPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Nouveau mot de passe *
            </label>
            <input
              type="password"
              required
              placeholder="Minimum 4 caractères..."
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Confirmer le nouveau mot de passe *
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-teal-500 font-mono"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-teal-700 text-white font-medium rounded hover:bg-teal-800 shadow-xs flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Mettre à jour
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
