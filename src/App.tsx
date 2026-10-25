import React, { useState, useEffect, useMemo } from 'react';
import { Header, ActiveTab } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { NurseDirectoryView } from './components/NurseDirectoryView';
import { LeavesManagementView } from './components/LeavesManagementView';
import { CalendarPlanningView } from './components/CalendarPlanningView';
import { RemindersCenterView } from './components/RemindersCenterView';
import { NurseDetailModal } from './components/NurseDetailModal';
import { NurseFormModal } from './components/NurseFormModal';
import { LeaveFormModal } from './components/LeaveFormModal';
import { PrintDocumentModal } from './components/PrintDocumentModal';
import { DatabaseBackupModal } from './components/DatabaseBackupModal';
import { AuthLockModal } from './components/AuthLockModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { RotationPlanningModal } from './components/RotationPlanningModal';
import { CheckCircle2 } from 'lucide-react';

import { NurseStaff, DemandeConge, SituationActuelle } from './types/nurse';
import { INITIAL_NURSES, INITIAL_DEMANDES } from './data/mockData';
import { generateReminders } from './utils/calculations';

const STORAGE_KEY_NURSES = 'blocrh_nurses_v2';
const STORAGE_KEY_DEMANDES = 'blocrh_demandes_v2';
const STORAGE_KEY_PASSWORD = 'blocrh_master_password_v1';

export default function App() {
  // 1. Password & Authentication State
  const [storedPassword, setStoredPassword] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_PASSWORD);
    } catch {
      return null;
    }
  });

  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // 2. Data State
  const [nurses, setNurses] = useState<NurseStaff[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NURSES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading nurses from localStorage', e);
    }
    return INITIAL_NURSES; // []
  });

  const [demandes, setDemandes] = useState<DemandeConge[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DEMANDES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading demandes from localStorage', e);
    }
    return INITIAL_DEMANDES; // []
  });

  // Save data to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_NURSES, JSON.stringify(nurses));
    } catch (e) {
      console.error('Error saving nurses to localStorage', e);
    }
  }, [nurses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DEMANDES, JSON.stringify(demandes));
    } catch (e) {
      console.error('Error saving demandes to localStorage', e);
    }
  }, [demandes]);

  // 3. Navigation & View State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [directoryInitialFilter, setDirectoryInitialFilter] = useState<string>('tous');

  // 4. Modals State
  const [selectedNurseForDetail, setSelectedNurseForDetail] = useState<NurseStaff | null>(null);
  const [editingNurse, setEditingNurse] = useState<NurseStaff | null>(null);
  const [isNurseFormOpen, setIsNurseFormOpen] = useState(false);
  const [isLeaveFormOpen, setIsLeaveFormOpen] = useState(false);
  const [leavePreselectedNurse, setLeavePreselectedNurse] = useState<NurseStaff | null>(null);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isRotationModalOpen, setIsRotationModalOpen] = useState(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Printing document modal state
  const [printDocConfig, setPrintDocConfig] = useState<{
    isOpen: boolean;
    nurse: NurseStaff | null;
    demande?: DemandeConge | null;
    typeDoc: 'cessation' | 'reprise' | 'dossier';
  }>({
    isOpen: false,
    nurse: null,
    typeDoc: 'cessation',
  });

  // 5. Dynamic Reminders calculation
  const reminders = useMemo(() => {
    return generateReminders(nurses, demandes, '2026-10-24');
  }, [nurses, demandes]);

  // 6. Authentication handlers
  const handleUnlock = (pwd: string): boolean => {
    if (pwd === storedPassword) {
      setIsUnlocked(true);
      return true;
    }
    return false;
  };

  const handleSetInitialPassword = (pwd: string) => {
    try {
      localStorage.setItem(STORAGE_KEY_PASSWORD, pwd);
      setStoredPassword(pwd);
      setIsUnlocked(true);
    } catch (e) {
      console.error('Error saving password', e);
    }
  };

  const handleSaveNewPassword = (oldPwd: string, newPwd: string): { success: boolean; error?: string } => {
    if (oldPwd !== storedPassword) {
      return { success: false, error: 'Mot de passe actuel incorrect.' };
    }
    try {
      localStorage.setItem(STORAGE_KEY_PASSWORD, newPwd);
      setStoredPassword(newPwd);
      return { success: true };
    } catch {
      return { success: false, error: 'Erreur lors de la sauvegarde du mot de passe.' };
    }
  };

  const handleLockApp = () => {
    setIsUnlocked(false);
  };

  // 7. Actions: Nurse Management
  const handleSaveNurse = (savedNurse: NurseStaff) => {
    setNurses(prev => {
      const exists = prev.some(n => n.id === savedNurse.id);
      if (exists) {
        return prev.map(n => n.id === savedNurse.id ? savedNurse : n);
      }
      return [savedNurse, ...prev];
    });

    if (selectedNurseForDetail && selectedNurseForDetail.id === savedNurse.id) {
      setSelectedNurseForDetail(savedNurse);
    }
    setIsNurseFormOpen(false);
    setEditingNurse(null);
  };

  const handleDeleteNurse = (id: string) => {
    setNurses(prev => prev.filter(n => n.id !== id));
    setDemandes(prev => prev.filter(d => d.nurseId !== id));
    if (selectedNurseForDetail?.id === id) {
      setSelectedNurseForDetail(null);
    }
  };

  const handleSaveRotation = (updatedNurses: NurseStaff[], summaryMsg: string) => {
    setNurses(updatedNurses);
    setToastNotice(summaryMsg);
    setTimeout(() => {
      setToastNotice(null);
    }, 6000);
  };

  // 8. Actions: Leave & Resumption Management
  const handleSaveLeave = (newDemande: DemandeConge) => {
    setDemandes(prev => [newDemande, ...prev]);

    if (newDemande.etatDemande === 'Confirmé') {
      const nurse = nurses.find(n => n.id === newDemande.nurseId);
      if (nurse) {
        let newSituation: SituationActuelle = nurse.situationActuelle;
        if (newDemande.typeConge === 'Congé Administratif') {
          newSituation = 'Congé administratif';
        } else if (newDemande.typeConge === 'Congé de Maladie') {
          newSituation = 'Congé de maladie';
        } else {
          newSituation = 'Congé exceptionnel';
        }

        setNurses(prev => prev.map(n => {
          if (n.id !== nurse.id) return n;
          return {
            ...n,
            situationActuelle: newSituation,
          };
        }));
      }
    }

    setIsLeaveFormOpen(false);
    setLeavePreselectedNurse(null);
  };

  const handleUpdateDemande = (updatedDemande: DemandeConge) => {
    setDemandes(prev => prev.map(d => d.id === updatedDemande.id ? updatedDemande : d));

    if (updatedDemande.etatDemande === 'Refusé') {
      setNurses(prev => prev.map(n => {
        if (n.id !== updatedDemande.nurseId) return n;
        if (n.situationActuelle.includes('Congé')) {
          return {
            ...n,
            situationActuelle: 'Système normal'
          };
        }
        return n;
      }));
    }
  };

  const handleValidateReprise = (demandeId: string, nurseId: string) => {
    const todayStr = '2026-10-24';

    setDemandes(prev => prev.map(d => {
      if (d.id === demandeId) {
        return {
          ...d,
          dateRepriseEffective: todayStr,
        };
      }
      return d;
    }));

    setNurses(prev => prev.map(nurse => {
      if (nurse.id !== nurseId) return nurse;

      const targetDemande = demandes.find(d => d.id === demandeId);
      const nextSituation: SituationActuelle = 'Système normal';

      let updatedCongeAdmin = { ...nurse.congeAdmin };
      let updatedCongeMaladie = { ...nurse.congeMaladie };

      if (targetDemande && targetDemande.typeConge === 'Congé Administratif') {
        updatedCongeAdmin.joursConsommes = Math.min(
          nurse.congeAdmin.limiteAnnuelle + nurse.congeAdmin.joursReportes,
          nurse.congeAdmin.joursConsommes + targetDemande.nombreJours
        );
      } else if (targetDemande && targetDemande.typeConge === 'Congé de Maladie') {
        updatedCongeMaladie.joursConsommes = Math.min(
          90,
          nurse.congeMaladie.joursConsommes + targetDemande.nombreJours
        );
      }

      return {
        ...nurse,
        situationActuelle: nextSituation,
        congeAdmin: updatedCongeAdmin,
        congeMaladie: updatedCongeMaladie,
      };
    }));

    const nurse = nurses.find(n => n.id === nurseId);
    if (nurse) {
      alert(`Reprise de service confirmée pour ${nurse.nom} ${nurse.prenom}.`);
    }
  };

  const handleConfirmPlannedLeave = (demandeId: string) => {
    setDemandes(prev => prev.map(d => {
      if (d.id === demandeId) {
        return {
          ...d,
          statutPrevisionnel: 'confirme_debut_mois',
          etatDemande: 'Confirmé',
        };
      }
      return d;
    }));

    const targetDemande = demandes.find(d => d.id === demandeId);
    if (targetDemande) {
      const today = '2026-10-24';
      if (today >= targetDemande.dateCessation && today <= targetDemande.dateReprisePrevue) {
        let newSituation: SituationActuelle = 'Congé administratif';
        if (targetDemande.typeConge === 'Congé de Maladie') newSituation = 'Congé de maladie';
        else if (targetDemande.typeConge.includes('Maternité')) newSituation = 'Congé de maternité';
        else if (targetDemande.typeConge !== 'Congé Administratif') newSituation = 'Congé exceptionnel';

        setNurses(prev => prev.map(n => n.id === targetDemande.nurseId ? { ...n, situationActuelle: newSituation } : n));
      }
    }
  };

  const handleCancelPlannedLeave = (demandeId: string) => {
    setDemandes(prev => prev.map(d => {
      if (d.id === demandeId) {
        return {
          ...d,
          statutPrevisionnel: 'annule',
          etatDemande: 'Refusé',
        };
      }
      return d;
    }));
  };

  const handleFilterSituationFromDashboard = (situation: string) => {
    if (situation === 'Système normal') setDirectoryInitialFilter('normal');
    else if (situation === 'Système de garde') setDirectoryInitialFilter('garde');
    else if (situation === 'Congé administratif' || situation === 'Congé de maladie') setDirectoryInitialFilter('conge');
    else setDirectoryInitialFilter('tous');
    setActiveTab('personnel');
  };

  const handlePrintDoc = (demande: DemandeConge, nurse: NurseStaff, typeDoc: 'cessation' | 'reprise') => {
    setPrintDocConfig({
      isOpen: true,
      nurse,
      demande,
      typeDoc,
    });
  };

  const handlePrintDossier = (nurse: NurseStaff) => {
    setPrintDocConfig({
      isOpen: true,
      nurse,
      typeDoc: 'dossier',
    });
  };

  const handleImportData = (data: { nurses: NurseStaff[]; demandes: DemandeConge[] }) => {
    setNurses(data.nurses);
    setDemandes(data.demandes);
  };

  const handleResetDefault = () => {
    setNurses([]);
    setDemandes([]);
    localStorage.removeItem(STORAGE_KEY_NURSES);
    localStorage.removeItem(STORAGE_KEY_DEMANDES);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      
      {/* 0. Password Lock Protection Screen (if not unlocked) */}
      {!isUnlocked && (
        <AuthLockModal
          hasExistingPassword={!!storedPassword}
          onUnlock={handleUnlock}
          onSetPassword={handleSetInitialPassword}
        />
      )}

      {/* Top Header Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadRemindersCount={reminders.filter(r => r.niveau === 'urgent').length}
        nursesCount={nurses.length}
        onOpenNewNurse={() => {
          setEditingNurse(null);
          setIsNurseFormOpen(true);
        }}
        onOpenNewLeave={() => {
          setLeavePreselectedNurse(null);
          setIsLeaveFormOpen(true);
        }}
        onOpenBackup={() => setIsBackupOpen(true)}
        onLockApp={handleLockApp}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Toast Notification Banner */}
        {toastNotice && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{toastNotice}</span>
            </div>
            <button
              onClick={() => setToastNotice(null)}
              className="text-emerald-800 hover:text-emerald-950 text-xs font-bold px-2 py-0.5 rounded hover:bg-emerald-100 transition-colors"
            >
              Fermer
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            nurses={nurses}
            demandes={demandes}
            reminders={reminders}
            onNavigateTab={(tab) => {
              if (tab === 'personnel') setActiveTab('personnel');
              else if (tab === 'conges') setActiveTab('conges');
              else if (tab === 'calendrier') setActiveTab('calendrier');
              else if (tab === 'reminders') setActiveTab('reminders');
            }}
            onSelectNurse={(nurse) => setSelectedNurseForDetail(nurse)}
            onValidateReprise={handleValidateReprise}
            onFilterSituation={handleFilterSituationFromDashboard}
            onNewNurse={() => {
              setEditingNurse(null);
              setIsNurseFormOpen(true);
            }}
            onOpenRotationModal={() => setIsRotationModalOpen(true)}
          />
        )}

        {activeTab === 'personnel' && (
          <NurseDirectoryView
            nurses={nurses}
            initialFilter={directoryInitialFilter}
            onSelectNurse={(nurse) => setSelectedNurseForDetail(nurse)}
            onEditNurse={(nurse) => {
              setEditingNurse(nurse);
              setIsNurseFormOpen(true);
            }}
            onDeleteNurse={handleDeleteNurse}
            onNewNurse={() => {
              setEditingNurse(null);
              setIsNurseFormOpen(true);
            }}
            onDeclareLeave={(nurse) => {
              setLeavePreselectedNurse(nurse);
              setIsLeaveFormOpen(true);
            }}
            onOpenRotationModal={() => setIsRotationModalOpen(true)}
          />
        )}

        {activeTab === 'conges' && (
          <LeavesManagementView
            nurses={nurses}
            demandes={demandes}
            onNewLeave={() => {
              setLeavePreselectedNurse(null);
              setIsLeaveFormOpen(true);
            }}
            onUpdateDemande={handleUpdateDemande}
            onValidateReprise={handleValidateReprise}
            onPrintDoc={handlePrintDoc}
          />
        )}

        {activeTab === 'calendrier' && (
          <CalendarPlanningView
            nurses={nurses}
            demandes={demandes}
            onConfirmPlannedLeave={handleConfirmPlannedLeave}
            onCancelPlannedLeave={handleCancelPlannedLeave}
            onNewLeave={() => {
              setLeavePreselectedNurse(null);
              setIsLeaveFormOpen(true);
            }}
            onSelectNurse={(nurse) => setSelectedNurseForDetail(nurse)}
            onOpenRotationModal={() => setIsRotationModalOpen(true)}
          />
        )}

        {activeTab === 'reminders' && (
          <RemindersCenterView
            reminders={reminders}
            nurses={nurses}
            demandes={demandes}
            onValidateReprise={handleValidateReprise}
            onSelectNurse={(nurse) => setSelectedNurseForDetail(nurse)}
            onPrintDoc={handlePrintDoc}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-800">BlocRH</span> · Gestion du Staff Infirmier du Bloc Opératoire
          </div>
          <div className="text-slate-400">
            Accès sécurisé par mot de passe · Données confidentielles du personnel hospitalier
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedNurseForDetail && (
        <NurseDetailModal
          nurse={selectedNurseForDetail}
          demandes={demandes}
          onClose={() => setSelectedNurseForDetail(null)}
          onEdit={(nurse) => {
            setSelectedNurseForDetail(null);
            setEditingNurse(nurse);
            setIsNurseFormOpen(true);
          }}
          onNewLeave={(nurse) => {
            setSelectedNurseForDetail(null);
            setLeavePreselectedNurse(nurse);
            setIsLeaveFormOpen(true);
          }}
          onPrintDossier={handlePrintDossier}
          onPrintLeaveDoc={handlePrintDoc}
        />
      )}

      {isNurseFormOpen && (
        <NurseFormModal
          initialNurse={editingNurse}
          onSave={handleSaveNurse}
          onClose={() => {
            setIsNurseFormOpen(false);
            setEditingNurse(null);
          }}
        />
      )}

      {isLeaveFormOpen && (
        <LeaveFormModal
          nurses={nurses}
          selectedNurse={leavePreselectedNurse}
          onSave={handleSaveLeave}
          onClose={() => {
            setIsLeaveFormOpen(false);
            setLeavePreselectedNurse(null);
          }}
        />
      )}

      {printDocConfig.isOpen && printDocConfig.nurse && (
        <PrintDocumentModal
          nurse={printDocConfig.nurse}
          demande={printDocConfig.demande}
          typeDoc={printDocConfig.typeDoc}
          onClose={() => setPrintDocConfig(prev => ({ ...prev, isOpen: false }))}
        />
      )}

      {isBackupOpen && (
        <DatabaseBackupModal
          nurses={nurses}
          demandes={demandes}
          onImportData={handleImportData}
          onResetDefault={handleResetDefault}
          onClose={() => setIsBackupOpen(false)}
        />
      )}

      {isChangePasswordOpen && (
        <ChangePasswordModal
          onSaveNewPassword={handleSaveNewPassword}
          onClose={() => setIsChangePasswordOpen(false)}
        />
      )}

      {isRotationModalOpen && (
        <RotationPlanningModal
          isOpen={isRotationModalOpen}
          onClose={() => setIsRotationModalOpen(false)}
          nurses={nurses}
          onSaveRotation={handleSaveRotation}
          initialYear={2026}
          initialMonth={11}
        />
      )}

    </div>
  );
}
