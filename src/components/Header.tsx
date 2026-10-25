import React from 'react';
import { 
  Users, 
  Bell, 
  FileText, 
  Plus, 
  Database,
  Stethoscope,
  Lock,
  KeyRound,
  Calendar
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'personnel' | 'conges' | 'calendrier' | 'reminders';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  unreadRemindersCount: number;
  nursesCount: number;
  onOpenNewNurse: () => void;
  onOpenNewLeave: () => void;
  onOpenBackup: () => void;
  onLockApp: () => void;
  onOpenChangePassword: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  unreadRemindersCount,
  nursesCount,
  onOpenNewNurse,
  onOpenNewLeave,
  onOpenBackup,
  onLockApp,
  onOpenChangePassword,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap leading-tight">
                BlocRH
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Staff Infirmier · Service du Bloc Opératoire
              </div>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-slate-100 text-teal-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Tableau de bord
            </button>

            <button
              onClick={() => setActiveTab('personnel')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'personnel'
                  ? 'bg-slate-100 text-teal-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Personnel ({nursesCount})
            </button>

            <button
              onClick={() => setActiveTab('conges')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'conges'
                  ? 'bg-slate-100 text-teal-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Congés & Mouvements
            </button>

            <button
              onClick={() => setActiveTab('calendrier')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'calendrier'
                  ? 'bg-slate-100 text-teal-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendrier & Planning
            </button>

            <button
              onClick={() => setActiveTab('reminders')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'reminders'
                  ? 'bg-slate-100 text-teal-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Bell className="w-4 h-4" />
              Suivi & Rappels
              {unreadRemindersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-xs font-mono font-semibold bg-rose-500 text-white rounded-full">
                  {unreadRemindersCount}
                </span>
              )}
            </button>
          </nav>

          {/* Zone 3: Actions & Database options & Security */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Password settings */}
            <button
              onClick={onOpenChangePassword}
              title="Changer le mot de passe de protection"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <KeyRound className="w-4 h-4" />
            </button>

            {/* Lock button */}
            <button
              onClick={onLockApp}
              title="Verrouiller l'accès immédiatement"
              className="p-2 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Backup */}
            <button
              onClick={onOpenBackup}
              title="Sauvegarde & Exportation Base de Données"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Database className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenNewLeave}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              Demande Congé
            </button>

            <button
              onClick={onOpenNewNurse}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Ajouter Infirmier
            </button>
          </div>

        </div>

        {/* Mobile secondary navigation */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-2 border-t border-slate-100 no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-teal-700 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Tableau de bord
          </button>
          <button
            onClick={() => setActiveTab('personnel')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === 'personnel' ? 'bg-teal-700 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Personnel ({nursesCount})
          </button>
          <button
            onClick={() => setActiveTab('conges')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === 'conges' ? 'bg-teal-700 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Congés
          </button>
          <button
            onClick={() => setActiveTab('calendrier')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === 'calendrier' ? 'bg-teal-700 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Calendrier
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'reminders' ? 'bg-teal-700 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Rappels ({unreadRemindersCount})
          </button>
          <button
            onClick={onLockApp}
            className="px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap text-rose-700 bg-rose-50 flex items-center gap-1"
          >
            <Lock className="w-3.5 h-3.5" />
            Verrouiller
          </button>
        </div>

      </div>
    </header>
  );
};
