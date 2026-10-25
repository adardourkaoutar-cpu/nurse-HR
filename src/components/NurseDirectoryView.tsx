import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  HeartPulse, 
  Calendar, 
  MoreHorizontal, 
  Eye, 
  Edit3, 
  Trash2, 
  Plus, 
  Download,
  AlertCircle,
  FileCheck,
  Layers,
  ArrowDownUp,
  UserCheck,
  Stethoscope,
  Scissors
} from 'lucide-react';
import { NurseStaff, Specialite, Fonction } from '../types/nurse';
import { 
  calculateAnciennete, 
  calculateAge, 
  getSoldeCongeAdmin, 
  getSoldeCongeMaladie, 
  formatDateFr,
  formatFonction 
} from '../utils/calculations';

interface NurseDirectoryViewProps {
  nurses: NurseStaff[];
  onSelectNurse: (nurse: NurseStaff) => void;
  onEditNurse: (nurse: NurseStaff) => void;
  onDeleteNurse: (id: string) => void;
  onNewNurse: () => void;
  onDeclareLeave: (nurse: NurseStaff) => void;
  initialFilter?: string;
}

// Ordre d'affichage des spécialités
const SPECIALITES_ORDER: Specialite[] = ['IAR', 'IBO', 'IP', 'ISM'];

const SPECIALITE_INFO: Record<Specialite, { code: string; label: string; desc: string; badgeColor: string }> = {
  'IAR': {
    code: 'IAR',
    label: 'Infirmier en Anesthésie-Réanimation',
    desc: 'Anesthésie per-opératoire & réanimation bloc',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200'
  },
  'IBO': {
    code: 'IBO',
    label: 'Infirmier de Bloc Opératoire',
    desc: 'Instrumentation, pansement & aide-opératoire',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200'
  },
  'IP': {
    code: 'IP',
    label: 'Infirmier Polyvalent',
    desc: 'Soins infirmiers polyvalents & assistance opératoire',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200'
  },
  'ISM': {
    code: 'ISM',
    label: 'Infirmier en Santé Mentale',
    desc: 'Accompagnement psychologique péri-opératoire',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200'
  },
};

export const NurseDirectoryView: React.FC<NurseDirectoryViewProps> = ({
  nurses,
  onSelectNurse,
  onEditNurse,
  onDeleteNurse,
  onNewNurse,
  onDeclareLeave,
  initialFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [situationFilter, setSituationFilter] = useState<string>(initialFilter || 'tous');
  const [specialiteFilter, setSpecialiteFilter] = useState<string>('tous');
  const [fonctionFilter, setFonctionFilter] = useState<string>('tous');
  const [navetteFilter, setNavetteFilter] = useState<string>('tous');
  const [viewMode, setViewMode] = useState<'groupe' | 'tableau'>('groupe');

  // Filtrage combiné
  const filteredNurses = useMemo(() => {
    return nurses.filter(nurse => {
      // Recherche textuelle
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || (
        nurse.nom.toLowerCase().includes(q) ||
        nurse.prenom.toLowerCase().includes(q) ||
        nurse.ppr.toLowerCase().includes(q) ||
        nurse.cni.toLowerCase().includes(q) ||
        nurse.specialite.toLowerCase().includes(q) ||
        nurse.fonction.toLowerCase().includes(q) ||
        nurse.lieuResidence.toLowerCase().includes(q)
      );

      // Filtre Situation
      let matchSituation = true;
      if (situationFilter === 'normal') {
        matchSituation = nurse.situationActuelle === 'Système normal';
      } else if (situationFilter === 'garde') {
        matchSituation = nurse.situationActuelle === 'Système de garde';
      } else if (situationFilter === 'conge') {
        matchSituation = nurse.situationActuelle.includes('Congé');
      } else if (situationFilter === 'dispo') {
        matchSituation = nurse.situationActuelle === 'Mis en disponibilité' || nurse.situationActuelle === 'Sous drapeau';
      } else if (situationFilter === 'navettiste') {
        matchSituation = nurse.navette === true;
      }

      // Filtre Spécialité
      const matchSpecialite = specialiteFilter === 'tous' || nurse.specialite === specialiteFilter;

      // Filtre Fonction (avec combinaison aide opératoire & panseur)
      let matchFonction = true;
      if (fonctionFilter !== 'tous') {
        if (fonctionFilter === 'Aide-opératoire / Panseur') {
          matchFonction = nurse.fonction === 'Aide-opératoire / Panseur' || 
                          nurse.fonction === 'Aide-opératoire' || 
                          nurse.fonction === 'Panseur';
        } else {
          matchFonction = nurse.fonction === fonctionFilter;
        }
      }

      // Filtre Navette
      const matchNavette = navetteFilter === 'tous' || (navetteFilter === 'oui' ? nurse.navette : !nurse.navette);

      return matchSearch && matchSituation && matchSpecialite && matchFonction && matchNavette;
    });
  }, [nurses, searchQuery, situationFilter, specialiteFilter, fonctionFilter, navetteFilter]);

  // SPEC REQUIREMENT:
  // "classifier le personnel selon la spécialité, puis selon la date de naissance (du grand au petit)"
  // -> Du grand au petit en âge = Personne la plus âgée d'abord (date de naissance la plus ancienne en premier: 1970 avant 1990)
  const classifiedNurses = useMemo(() => {
    return [...filteredNurses].sort((a, b) => {
      // 1. Spécialité (selon ordre statutaire: IAR -> IBO -> IP -> ISM)
      const indexA = SPECIALITES_ORDER.indexOf(a.specialite);
      const indexB = SPECIALITES_ORDER.indexOf(b.specialite);
      const posA = indexA === -1 ? 99 : indexA;
      const posB = indexB === -1 ? 99 : indexB;
      if (posA !== posB) {
        return posA - posB;
      }

      // 2. Date de naissance (du grand au petit = aîné en tête, date de naissance croissante)
      // Ex: 1972-03-10 (54 ans) passera avant 1994-08-20 (32 ans)
      const dateA = a.dateNaissance || '9999-99-99';
      const dateB = b.dateNaissance || '9999-99-99';
      return dateA.localeCompare(dateB);
    });
  }, [filteredNurses]);

  // Groupement par spécialité pour la vue groupée
  const groupedNurses = useMemo(() => {
    const groups: { specialite: Specialite; items: NurseStaff[] }[] = [];

    SPECIALITES_ORDER.forEach(spec => {
      const items = classifiedNurses.filter(n => n.specialite === spec);
      if (specialiteFilter === 'tous' || specialiteFilter === spec) {
        groups.push({
          specialite: spec,
          items,
        });
      }
    });

    return groups;
  }, [classifiedNurses, specialiteFilter]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'PPR', 'CNI', 'Nom', 'Prenom', 'Sexe', 'Grossesse', 'Specialite', 'Fonction',
      'Date_Naissance', 'Age', 'Lieu_Naissance', 'Etat_Marital', 'Enfants',
      'Grade', 'Date_Recrutement', 'Anciennete', 'Statut_Fonction_Publique',
      'Residence', 'Navette', 'Trajet_Navette',
      'Conge_Admin_Droit', 'Conge_Admin_Reporte', 'Conge_Admin_Consomme', 'Conge_Admin_Restant',
      'Conge_Maladie_Consomme_Jours', 'Conge_Maladie_Restant_Jours',
      'Situation_Actuelle'
    ];

    const rows = classifiedNurses.map(n => {
      const anc = calculateAnciennete(n.dateRecrutement);
      const age = calculateAge(n.dateNaissance);
      const soldeAdmin = getSoldeCongeAdmin(n);
      const soldeMaladie = getSoldeCongeMaladie(n);

      return [
        `"${n.ppr}"`,
        `"${n.cni}"`,
        `"${n.nom}"`,
        `"${n.prenom}"`,
        `"${n.sexe || 'Non précisé'}"`,
        `"${n.enceinte ? 'Enceinte (Congé Maternité 90j)' : 'Non'}"`,
        `"${n.specialite}"`,
        `"${formatFonction(n.fonction)}"`,
        `"${n.dateNaissance}"`,
        age !== null ? age : '',
        `"${n.lieuNaissance}"`,
        `"${n.etatMarital}"`,
        n.nombreEnfants,
        `"${n.grade}"`,
        `"${n.dateRecrutement}"`,
        `"${anc.texte}"`,
        `"${n.etatFonctionPublique}"`,
        `"${n.lieuResidence}"`,
        n.navette ? 'Oui' : 'Non',
        `"${n.trajetNavette || ''}"`,
        soldeAdmin.droitAnnuel,
        soldeAdmin.reporte,
        soldeAdmin.consomme,
        soldeAdmin.restant,
        soldeMaladie.consomme,
        soldeMaladie.restant,
        `"${n.situationActuelle}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Staff_Infirmier_Classe_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper pour afficher une ligne du tableau
  const renderNurseRow = (nurse: NurseStaff, rankIndex?: number) => {
    const anc = calculateAnciennete(nurse.dateRecrutement);
    const age = calculateAge(nurse.dateNaissance);
    const soldeAdmin = getSoldeCongeAdmin(nurse);
    const soldeMaladie = getSoldeCongeMaladie(nurse);

    return (
      <tr 
        key={nurse.id}
        className="hover:bg-slate-50/90 transition-colors group"
      >
        {/* Agent identification & Sexe */}
        <td className="py-3 px-3">
          <div className="flex items-center gap-2">
            {rankIndex !== undefined && (
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                {rankIndex + 1}
              </span>
            )}
            <div>
              <div 
                onClick={() => onSelectNurse(nurse)}
                className="font-bold text-slate-900 hover:text-teal-700 cursor-pointer flex items-center gap-1.5"
              >
                <span>{nurse.nom} {nurse.prenom}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                  nurse.sexe === 'Femme' 
                    ? 'bg-pink-50 text-pink-700 border border-pink-200' 
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {nurse.sexe || 'Agent'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                PPR: <strong className="text-slate-800">{nurse.ppr}</strong> · CNI: {nurse.cni}
              </div>
              {nurse.sexe === 'Femme' && nurse.etatMarital === 'Marié(e)' && nurse.enceinte && (
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                    Enceinte (Maternité 90j)
                  </span>
                </div>
              )}
            </div>
          </div>
        </td>

        {/* Spécialité & Rôle (Aide-opératoire / Panseur combiné) */}
        <td className="py-3 px-3">
          <div className="inline-block px-2 py-0.5 rounded text-[11px] font-bold border mb-1 bg-slate-100 text-slate-800 border-slate-200">
            {nurse.specialite}
          </div>
          <div className="text-[11px] font-semibold text-slate-900">
            {formatFonction(nurse.fonction)}
          </div>
        </td>

        {/* Date de Naissance & Âge (Tri du grand au petit) */}
        <td className="py-3 px-3">
          <div className="font-mono tabular-nums text-xs font-semibold text-slate-900">
            {formatDateFr(nurse.dateNaissance)}
          </div>
          <div className="mt-0.5">
            {age !== null ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.2 bg-teal-50 text-teal-800 rounded border border-teal-200">
                {age} ans
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">Non renseigné</span>
            )}
          </div>
        </td>

        {/* Grade & Ancienneté */}
        <td className="py-3 px-3">
          <div className="font-medium text-slate-800">
            {nurse.grade}
          </div>
          <div className="text-[11px] text-slate-500 tabular-nums">
            Anc: <span className="font-semibold text-slate-700">{anc.texte}</span>
          </div>
          <div className="text-[10px] text-slate-400">
            Recruté(e) le {formatDateFr(nurse.dateRecrutement)}
          </div>
        </td>

        {/* Statut Fonction Publique */}
        <td className="py-3 px-3">
          <div className="text-slate-800 font-medium">
            {nurse.etatFonctionPublique}
          </div>
          <div className="text-[11px] text-slate-500">
            {nurse.etatMarital} {nurse.nombreEnfants > 0 ? `· ${nurse.nombreEnfants} enf.` : ''}
          </div>
        </td>

        {/* Situation Actuelle */}
        <td className="py-3 px-3">
          <span className={`inline-flex items-center text-xs font-semibold ${
            nurse.situationActuelle === 'Système normal'
              ? 'text-emerald-700'
              : nurse.situationActuelle === 'Système de garde'
                ? 'text-amber-700'
                : nurse.situationActuelle === 'Congé administratif'
                  ? 'text-indigo-700'
                  : nurse.situationActuelle === 'Congé de maladie'
                    ? 'text-rose-700'
                    : 'text-slate-700'
          }`}>
            {nurse.situationActuelle}
          </span>
        </td>

        {/* Congé Administratif */}
        <td className="py-3 px-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-mono tabular-nums font-bold text-slate-900">
              {soldeAdmin.restant}j <span className="font-normal text-slate-500">restants</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              /{soldeAdmin.totalAcquis}j
            </span>
          </div>
          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-1.5 rounded-full ${
                soldeAdmin.restant <= 5 ? 'bg-amber-500' : 'bg-teal-600'
              }`}
              style={{ width: `${(soldeAdmin.restant / Math.max(1, soldeAdmin.totalAcquis)) * 100}%` }}
            ></div>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
            22j + Rep: {soldeAdmin.reporte}j
          </div>
        </td>

        {/* Congé Maladie */}
        <td className="py-3 px-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-mono tabular-nums font-bold text-slate-900">
              {soldeMaladie.restant}j
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              /90j
            </span>
          </div>
          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-1.5 rounded-full ${
                soldeMaladie.consomme >= 60 ? 'bg-rose-500' : 'bg-slate-400'
              }`}
              style={{ width: `${(soldeMaladie.restant / 90) * 100}%` }}
            ></div>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
            Consommé: {soldeMaladie.consomme}j
          </div>
        </td>

        {/* Résidence & Navette */}
        <td className="py-3 px-3">
          <div className="font-medium text-slate-800">
            {nurse.lieuResidence}
          </div>
          {nurse.navette ? (
            <div className="text-[11px] text-teal-700 font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3 text-teal-600" />
              Navette
              {nurse.trajetNavette && (
                <span className="text-slate-500 truncate max-w-[100px]" title={nurse.trajetNavette}>
                  ({nurse.trajetNavette})
                </span>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">
              Résident local
            </div>
          )}
        </td>

        {/* Actions */}
        <td className="py-3 px-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => onSelectNurse(nurse)}
              title="Consulter le dossier complet"
              className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>

            <button
              onClick={() => onDeclareLeave(nurse)}
              title="Poser une demande de congé"
              className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-slate-100 rounded transition-colors"
            >
              <Calendar className="w-4 h-4" />
            </button>

            <button
              onClick={() => onEditNurse(nurse)}
              title="Modifier les informations"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (window.confirm(`Confirmer la suppression de ${nurse.nom} ${nurse.prenom} (PPR: ${nurse.ppr}) ?`)) {
                  onDeleteNurse(nurse.id);
                }
              }}
              title="Supprimer du fichier"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Search and Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
        
        {/* Top line: Search input + Actions + View Mode */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Live Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par Nom, PPR, CNI, Spécialité, Ville..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-50/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>

          {/* View mode toggle & CTAs */}
          <div className="flex items-center gap-2">
            
            {/* Toggle view mode */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setViewMode('groupe')}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'groupe'
                    ? 'bg-white text-teal-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Classer en groupes distincts par spécialité"
              >
                <Layers className="w-3.5 h-3.5" />
                Groupé par Spécialité
              </button>
              <button
                onClick={() => setViewMode('tableau')}
                className={`px-2.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'tableau'
                    ? 'bg-white text-teal-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tableau continu trié par spécialité puis âge"
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
                Tableau Unique
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Exporter CSV ({classifiedNurses.length})
            </button>

            <button
              onClick={onNewNurse}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvel Infirmier
            </button>
          </div>

        </div>

        {/* Classification & Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          
          {/* Situation Segmented Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-medium mr-1">Situation:</span>
            
            <button
              onClick={() => setSituationFilter('tous')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                situationFilter === 'tous'
                  ? 'bg-slate-900 text-white font-medium'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({nurses.length})
            </button>

            <button
              onClick={() => setSituationFilter('normal')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                situationFilter === 'normal'
                  ? 'bg-emerald-700 text-white font-medium'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Normal ({nurses.filter(n => n.situationActuelle === 'Système normal').length})
            </button>

            <button
              onClick={() => setSituationFilter('garde')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                situationFilter === 'garde'
                  ? 'bg-amber-700 text-white font-medium'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Garde ({nurses.filter(n => n.situationActuelle === 'Système de garde').length})
            </button>

            <button
              onClick={() => setSituationFilter('conge')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                situationFilter === 'conge'
                  ? 'bg-indigo-700 text-white font-medium'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
              }`}
            >
              En Congé ({nurses.filter(n => n.situationActuelle.includes('Congé')).length})
            </button>

            <button
              onClick={() => setSituationFilter('navettiste')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                situationFilter === 'navettiste'
                  ? 'bg-teal-700 text-white font-medium'
                  : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
              }`}
            >
              Navettistes ({nurses.filter(n => n.navette).length})
            </button>
          </div>

          {/* Selectors for Spécialité & Fonction combinée */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Spécialité Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Spécialité:</span>
              <select
                value={specialiteFilter}
                onChange={(e) => setSpecialiteFilter(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
              >
                <option value="tous">Toutes ({nurses.length})</option>
                <option value="IAR">IAR ({nurses.filter(n => n.specialite === 'IAR').length})</option>
                <option value="IBO">IBO ({nurses.filter(n => n.specialite === 'IBO').length})</option>
                <option value="IP">IP ({nurses.filter(n => n.specialite === 'IP').length})</option>
                <option value="ISM">ISM ({nurses.filter(n => n.specialite === 'ISM').length})</option>
              </select>
            </div>

            {/* Combined Fonction Selector (Aide-opératoire et Panseur combinés) */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Rôle au Bloc:</span>
              <select
                value={fonctionFilter}
                onChange={(e) => setFonctionFilter(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
              >
                <option value="tous">Tous les rôles</option>
                <option value="Infirmier chef">Infirmier chef</option>
                <option value="Anesthésiste">Anesthésiste</option>
                <option value="Aide-opératoire / Panseur">Aide-opératoire / Panseur (combinés)</option>
                <option value="Stérilisation">Stérilisation</option>
              </select>
            </div>

          </div>

        </div>

        {/* Classification Notice Bar */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 flex items-center justify-between text-[11px] text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-bold text-teal-800 uppercase tracking-wider">Critère de classement :</span>
            <span>Spécialité statutaire (IAR ➔ IBO ➔ IP ➔ ISM), puis <strong>Date de Naissance du plus grand au plus petit</strong> (aîné en tête).</span>
          </div>
          <div className="text-slate-400 font-mono hidden sm:block">
            Catégorie unifiée : Aide-opératoire & Panseur
          </div>
        </div>

      </div>

      {/* 2. Content Display */}
      {classifiedNurses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-900">Aucun infirmier trouvé</h3>
          <p className="text-xs text-slate-500 mt-1">
            Modifiez vos filtres ou effectuez une nouvelle recherche pour afficher des résultats.
          </p>
        </div>
      ) : viewMode === 'groupe' ? (
        
        /* 2.A: VUE GROUPÉE PAR SPÉCIALITÉ */
        <div className="space-y-5">
          {groupedNurses.map((group) => {
            const info = SPECIALITE_INFO[group.specialite];
            if (group.items.length === 0 && specialiteFilter !== 'tous') return null;

            return (
              <div 
                key={group.specialite}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
              >
                {/* Group Header */}
                <div className="bg-slate-50/90 border-b border-slate-200 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${info.badgeColor}`}>
                      {info.code}
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        {info.label}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {info.desc} · <span className="text-teal-700 font-semibold">Classé par âge (du plus grand au plus petit)</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-full font-mono">
                      {group.items.length} infirmier{group.items.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Table for this specialty */}
                {group.items.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 italic">
                    Aucun agent enregistré dans la spécialité {group.specialite} avec les critères actuels.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3"># Agent & Rôle</th>
                          <th className="py-2.5 px-3">Spécialité & Rôle</th>
                          <th className="py-2.5 px-3">Date Naissance & Âge (Grand ➔ Petit)</th>
                          <th className="py-2.5 px-3">Grade & Ancienneté</th>
                          <th className="py-2.5 px-3">Statut FP</th>
                          <th className="py-2.5 px-3">Situation</th>
                          <th className="py-2.5 px-3">Congé Admin</th>
                          <th className="py-2.5 px-3">Maladie</th>
                          <th className="py-2.5 px-3">Résidence</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {group.items.map((nurse, idx) => renderNurseRow(nurse, idx))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      ) : (

        /* 2.B: VUE TABLEAU UNIQUE GLOBAL */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3"># Agent & Rôle</th>
                  <th className="py-3 px-3">Spécialité & Rôle</th>
                  <th className="py-3 px-3">Date Naissance & Âge (Grand ➔ Petit)</th>
                  <th className="py-3 px-3">Grade & Ancienneté</th>
                  <th className="py-3 px-3">Statut FP</th>
                  <th className="py-3 px-3">Situation</th>
                  <th className="py-3 px-3">Congé Admin</th>
                  <th className="py-3 px-3">Maladie</th>
                  <th className="py-3 px-3">Résidence</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classifiedNurses.map((nurse, idx) => renderNurseRow(nurse, idx))}
              </tbody>
            </table>
          </div>

          {/* Scannable footer */}
          <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Affichage de <span className="font-bold text-slate-900 tabular-nums">{classifiedNurses.length}</span> sur <span className="font-bold text-slate-900 tabular-nums">{nurses.length}</span> infirmiers
            </div>
            <div className="font-mono text-slate-400">
              Classement : Spécialité ➔ Date de Naissance (du grand au petit)
            </div>
          </div>
        </div>

      )}

    </div>
  );
};
