import React, { useRef, useState } from 'react';
import { X, Database, Download, Upload, RotateCcw, Check, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { NurseStaff, DemandeConge } from '../types/nurse';

interface DatabaseBackupModalProps {
  nurses: NurseStaff[];
  demandes: DemandeConge[];
  onImportData: (data: { nurses: NurseStaff[]; demandes: DemandeConge[] }) => void;
  onResetDefault: () => void;
  onClose: () => void;
}

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({
  nurses,
  demandes,
  onImportData,
  onResetDefault,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Export JSON
  const handleExportJSON = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      service: 'Bloc Opératoire Central',
      nurses,
      demandes,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Base_Donnees_BlocRH_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setSuccessMsg('Sauvegarde JSON téléchargée avec succès.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Import JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed.nurses || !Array.isArray(parsed.nurses)) {
          throw new Error('Format de fichier invalide (propriété nurses manquante).');
        }

        onImportData({
          nurses: parsed.nurses,
          demandes: Array.isArray(parsed.demandes) ? parsed.demandes : [],
        });

        setSuccessMsg(`Base restaurée : ${parsed.nurses.length} infirmiers importés avec succès.`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch (err: any) {
        setErrorMsg(`Erreur lors de l'import : ${err.message || 'Fichier JSON corrompu'}`);
        setTimeout(() => setErrorMsg(''), 5000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-teal-700" />
            <h2 className="text-base font-bold text-slate-900">
              Gestion & Sauvegarde de la Base de Données
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alerts */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 text-xs">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="text-xs text-slate-600 space-y-1">
          <p>
            Toutes les modifications apportées aux infirmiers, congés et rappels sont stockées en toute sécurité et persistées automatiquement dans votre navigateur.
          </p>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700 font-mono text-[11px] flex justify-between">
            <span>Infirmiers enregistrés : <strong className="text-slate-900">{nurses.length}</strong></span>
            <span>Demandes de congé : <strong className="text-slate-900">{demandes.length}</strong></span>
          </div>
        </div>

        {/* Actions Grid */}
        <div className="space-y-3 text-xs">
          
          {/* Export JSON */}
          <div className="p-3.5 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900">Exporter la Base Complète (JSON)</div>
              <div className="text-slate-500 text-[11px]">
                Télécharge un fichier JSON contenant l'ensemble des infirmiers et des historiques.
              </div>
            </div>
            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md whitespace-nowrap shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Exporter JSON
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-3.5 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-slate-900">Restaurer / Importer (JSON)</div>
              <div className="text-slate-500 text-[11px]">
                Charger un fichier de sauvegarde pour restaurer les dossiers ou synchroniser.
              </div>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-medium rounded-md whitespace-nowrap shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                Importer JSON
              </button>
            </div>
          </div>

          {/* Reset Clean Slate */}
          <div className="p-3.5 border border-rose-100 bg-rose-50/30 rounded-lg flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-rose-900">Réinitialiser la base à zéro</div>
              <div className="text-rose-700 text-[11px]">
                Remet à 0 tous les compteurs, infirmiers et congés pour repartir d'une base vierge.
              </div>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Voulez-vous remettre à 0 tous les noms du personnel et les chiffres pour repartir d\'une base vierge ?')) {
                  onResetDefault();
                  setSuccessMsg('Base de données remise à zéro avec succès.');
                }
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-rose-700 bg-white border border-rose-200 hover:bg-rose-100 font-medium rounded-md whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Remettre à zéro
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-medium"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
