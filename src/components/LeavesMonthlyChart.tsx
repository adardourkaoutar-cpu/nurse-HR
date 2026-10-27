import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Calendar, 
  BarChart3, 
  PieChart as PieIcon, 
  Layers, 
  Filter, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { DemandeConge, TypeConge } from '../types/nurse';

interface LeavesMonthlyChartProps {
  demandes: DemandeConge[];
  referenceYear?: number;
  onNavigateToLeaves?: () => void;
}

// Monthly labels in French
const MOIS_LABELS = [
  { mois: 1, court: 'Jan', nom: 'Janvier' },
  { mois: 2, court: 'Fév', nom: 'Février' },
  { mois: 3, court: 'Mar', nom: 'Mars' },
  { mois: 4, court: 'Avr', nom: 'Avril' },
  { mois: 5, court: 'Mai', nom: 'Mai' },
  { mois: 6, court: 'Juin', nom: 'Juin' },
  { mois: 7, court: 'Juil', nom: 'Juillet' },
  { mois: 8, court: 'Aoû', nom: 'Août' },
  { mois: 9, court: 'Sep', nom: 'Septembre' },
  { mois: 10, court: 'Oct', nom: 'Octobre' },
  { mois: 11, court: 'Nov', nom: 'Novembre' },
  { mois: 12, court: 'Déc', nom: 'Décembre' },
];

// Color definitions for leave categories
const LEAVE_COLORS = {
  admin: {
    fill: '#0d9488', // Teal-600
    border: '#0f766e',
    label: 'Congé Administratif',
    bgLight: 'bg-teal-50',
    text: 'text-teal-900',
    dot: 'bg-teal-600',
  },
  maladie: {
    fill: '#e11d48', // Rose-600
    border: '#be123c',
    label: 'Congé de Maladie',
    bgLight: 'bg-rose-50',
    text: 'text-rose-900',
    dot: 'bg-rose-600',
  },
  maternite: {
    fill: '#8b5cf6', // Violet-500
    border: '#7c3aed',
    label: 'Maternité (90j)',
    bgLight: 'bg-purple-50',
    text: 'text-purple-900',
    dot: 'bg-purple-600',
  },
  exceptionnel: {
    fill: '#f59e0b', // Amber-500
    border: '#d97706',
    label: 'Exceptionnel / Autres',
    bgLight: 'bg-amber-50',
    text: 'text-amber-900',
    dot: 'bg-amber-500',
  },
};

export const LeavesMonthlyChart: React.FC<LeavesMonthlyChartProps> = ({
  demandes,
  referenceYear = 2026,
  onNavigateToLeaves,
}) => {
  // Selected year filter
  const [selectedYear, setSelectedYear] = useState<number>(referenceYear);

  // Metric to display: total days ('jours') vs request count ('demandes')
  const [metric, setMetric] = useState<'jours' | 'demandes'>('jours');

  // Chart type: stacked ('empile') vs grouped ('groupe')
  const [chartType, setChartType] = useState<'empile' | 'groupe'>('empile');

  // Filter confirmed only vs all
  const [onlyConfirmed, setOnlyConfirmed] = useState<boolean>(false);

  // Available years extracted from requests
  const availableYears = useMemo(() => {
    const years = new Set<number>([referenceYear, 2025, 2026, 2027]);
    demandes.forEach(d => {
      const dateTarget = d.dateCessation || d.dateDemande;
      if (dateTarget) {
        const y = parseInt(dateTarget.substring(0, 4), 10);
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [demandes, referenceYear]);

  // Aggregate leave data per month for the chosen year
  const monthlyData = useMemo(() => {
    // Initialize 12 months with zero values
    const data = MOIS_LABELS.map(m => ({
      moisIndex: m.mois,
      name: m.court,
      moisNom: m.nom,
      // Values in days
      adminJours: 0,
      maladieJours: 0,
      materniteJours: 0,
      exceptionnelJours: 0,
      totalJours: 0,
      // Values in count
      adminCount: 0,
      maladieCount: 0,
      materniteCount: 0,
      exceptionnelCount: 0,
      totalCount: 0,
    }));

    demandes.forEach(dem => {
      if (onlyConfirmed && dem.etatDemande !== 'Confirmé') {
        return;
      }

      // Determine date of relevance (dateCessation preferred)
      const dateStr = dem.dateCessation || dem.dateDemande;
      if (!dateStr) return;

      const [yearStr, monthStr] = dateStr.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);

      if (y !== selectedYear || m < 1 || m > 12) return;

      const monthIndex = m - 1;
      const nbJours = dem.nombreJours || 0;
      const type = dem.typeConge;

      if (type === 'Congé Administratif') {
        data[monthIndex].adminJours += nbJours;
        data[monthIndex].adminCount += 1;
      } else if (type === 'Congé de Maladie') {
        data[monthIndex].maladieJours += nbJours;
        data[monthIndex].maladieCount += 1;
      } else if (type === 'Congé de Maternité (90 jours)' || type === 'Maternité / Paternité') {
        data[monthIndex].materniteJours += nbJours;
        data[monthIndex].materniteCount += 1;
      } else {
        // Congé Exceptionnel, Pèlerinage, Mariage / Événement Familial
        data[monthIndex].exceptionnelJours += nbJours;
        data[monthIndex].exceptionnelCount += 1;
      }

      data[monthIndex].totalJours += nbJours;
      data[monthIndex].totalCount += 1;
    });

    return data;
  }, [demandes, selectedYear, onlyConfirmed]);

  // Yearly cumulative stats
  const annualTotals = useMemo(() => {
    let totAdminJ = 0;
    let totMaladieJ = 0;
    let totMaterniteJ = 0;
    let totExceptionnelJ = 0;

    let totAdminC = 0;
    let totMaladieC = 0;
    let totMaterniteC = 0;
    let totExceptionnelC = 0;

    monthlyData.forEach(m => {
      totAdminJ += m.adminJours;
      totMaladieJ += m.maladieJours;
      totMaterniteJ += m.materniteJours;
      totExceptionnelJ += m.exceptionnelJours;

      totAdminC += m.adminCount;
      totMaladieC += m.maladieCount;
      totMaterniteC += m.materniteCount;
      totExceptionnelC += m.exceptionnelCount;
    });

    const grandTotalJours = totAdminJ + totMaladieJ + totMaterniteJ + totExceptionnelJ;
    const grandTotalCount = totAdminC + totMaladieC + totMaterniteC + totExceptionnelC;

    // Peak month detection
    let peakMonthName = '-';
    let peakMonthDays = 0;
    monthlyData.forEach(m => {
      if (m.totalJours > peakMonthDays) {
        peakMonthDays = m.totalJours;
        peakMonthName = m.moisNom;
      }
    });

    const pieData = [
      { name: 'Admin (22j)', value: metric === 'jours' ? totAdminJ : totAdminC, color: LEAVE_COLORS.admin.fill },
      { name: 'Maladie', value: metric === 'jours' ? totMaladieJ : totMaladieC, color: LEAVE_COLORS.maladie.fill },
      { name: 'Maternité', value: metric === 'jours' ? totMaterniteJ : totMaterniteC, color: LEAVE_COLORS.maternite.fill },
      { name: 'Exceptionnel', value: metric === 'jours' ? totExceptionnelJ : totExceptionnelC, color: LEAVE_COLORS.exceptionnel.fill },
    ].filter(item => item.value > 0);

    return {
      totAdminJ,
      totMaladieJ,
      totMaterniteJ,
      totExceptionnelJ,
      grandTotalJours,
      grandTotalCount,
      peakMonthName,
      peakMonthDays,
      pieData,
    };
  }, [monthlyData, metric]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const monthObj = monthlyData.find(m => m.name === label);
      const isDays = metric === 'jours';
      const unit = isDays ? 'jours' : 'demande(s)';

      return (
        <div className="bg-slate-900 text-white rounded-lg p-3 shadow-xl border border-slate-700 text-xs min-w-[200px] z-50">
          <div className="font-bold border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between">
            <span className="text-teal-400 font-semibold">{monthObj?.moisNom || label} {selectedYear}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Total : {isDays ? monthObj?.totalJours : monthObj?.totalCount} {unit}
            </span>
          </div>

          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => {
              const val = entry.value || 0;
              return (
                <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full inline-block" 
                      style={{ backgroundColor: entry.color }} 
                    />
                    <span className="text-slate-300">{entry.name} :</span>
                  </div>
                  <span className="font-bold font-mono text-white">
                    {val} {unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const hasData = annualTotals.grandTotalJours > 0 || annualTotals.grandTotalCount > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
              <BarChart3 className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
              Analyse RH · Statistiques Annuelles
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
              Recharts Data Viz
            </span>
          </div>

          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Répartition Mensuelle des Congés · Année {selectedYear}</span>
          </h3>
          <p className="text-xs text-slate-500">
            Suivi des absences statutaires (Administratif, Maladie, Maternité, Exceptionnel) et impact sur le staff du bloc opératoire
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Year selector */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Metric Toggle: Jours vs Demandes */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setMetric('jours')}
              className={`px-2.5 py-1 font-semibold rounded transition-colors ${
                metric === 'jours'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Jours d'absence
            </button>
            <button
              type="button"
              onClick={() => setMetric('demandes')}
              className={`px-2.5 py-1 font-semibold rounded transition-colors ${
                metric === 'demandes'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nbr demandes
            </button>
          </div>

          {/* Chart Style Toggle: Empilé vs Groupé */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setChartType('empile')}
              className={`px-2 py-1 font-medium rounded transition-colors flex items-center gap-1 ${
                chartType === 'empile'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Histogramme empilé (cumul par mois)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Empilé</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('groupe')}
              className={`px-2 py-1 font-medium rounded transition-colors flex items-center gap-1 ${
                chartType === 'groupe'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Barres groupées par type"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Groupé</span>
            </button>
          </div>

          {/* Filter: Confirmed only */}
          <button
            type="button"
            onClick={() => setOnlyConfirmed(!onlyConfirmed)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              onlyConfirmed 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Afficher uniquement les demandes confirmées"
          >
            <Filter className="w-3 h-3" />
            <span>{onlyConfirmed ? 'Confirmés uniquement' : 'Tous statuts'}</span>
          </button>
        </div>

      </div>

      {/* 2. Key Indicator Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        {/* Total Admin */}
        <div className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/50 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-teal-800">
            <span>Congés Administratifs</span>
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
          </div>
          <div className="text-xl font-bold text-teal-950 tabular-nums">
            {annualTotals.totAdminJ} <span className="text-xs font-normal text-teal-700">jours</span>
          </div>
          <div className="text-[11px] text-teal-700">
            {annualTotals.grandTotalJours > 0 
              ? `${Math.round((annualTotals.totAdminJ / annualTotals.grandTotalJours) * 100)}% du total des absences` 
              : 'Quota 22j + reliquat'}
          </div>
        </div>

        {/* Total Maladie */}
        <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50/50 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800">
            <span>Congés de Maladie</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
          </div>
          <div className="text-xl font-bold text-rose-950 tabular-nums">
            {annualTotals.totMaladieJ} <span className="text-xs font-normal text-rose-700">jours</span>
          </div>
          <div className="text-[11px] text-rose-700">
            Plafond statutaire : 90j max/an
          </div>
        </div>

        {/* Total Maternité */}
        <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50/50 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-purple-800">
            <span>Maternité & Paternité</span>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
          </div>
          <div className="text-xl font-bold text-purple-950 tabular-nums">
            {annualTotals.totMaterniteJ} <span className="text-xs font-normal text-purple-700">jours</span>
          </div>
          <div className="text-[11px] text-purple-700">
            Durée légale : 90 jours
          </div>
        </div>

        {/* Pic d'absence */}
        <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Mois Pic d'Absence</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-base font-bold text-slate-900 truncate">
            {annualTotals.peakMonthDays > 0 ? annualTotals.peakMonthName : 'Aucun'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {annualTotals.peakMonthDays > 0 ? `${annualTotals.peakMonthDays} jours cumulés` : 'Données stables'}
          </div>
        </div>

      </div>

      {/* 3. Main Chart & Donut Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
        
        {/* Main Bar Chart (3 Columns) */}
        <div className="lg:col-span-3 h-[320px] w-full">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 15, right: 15, left: -15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#475569', fontSize: 11 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  align="right"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-slate-700 font-medium mr-2">{value}</span>}
                />

                {/* Congé Administratif */}
                <Bar
                  dataKey={metric === 'jours' ? 'adminJours' : 'adminCount'}
                  name="Congé Administratif"
                  fill={LEAVE_COLORS.admin.fill}
                  stackId={chartType === 'empile' ? 'stack' : undefined}
                  radius={chartType === 'empile' ? [0, 0, 0, 0] : [3, 3, 0, 0]}
                />

                {/* Congé Maladie */}
                <Bar
                  dataKey={metric === 'jours' ? 'maladieJours' : 'maladieCount'}
                  name="Congé Maladie"
                  fill={LEAVE_COLORS.maladie.fill}
                  stackId={chartType === 'empile' ? 'stack' : undefined}
                  radius={chartType === 'empile' ? [0, 0, 0, 0] : [3, 3, 0, 0]}
                />

                {/* Congé Maternité */}
                <Bar
                  dataKey={metric === 'jours' ? 'materniteJours' : 'materniteCount'}
                  name="Maternité (90j)"
                  fill={LEAVE_COLORS.maternite.fill}
                  stackId={chartType === 'empile' ? 'stack' : undefined}
                  radius={chartType === 'empile' ? [0, 0, 0, 0] : [3, 3, 0, 0]}
                />

                {/* Congé Exceptionnel */}
                <Bar
                  dataKey={metric === 'jours' ? 'exceptionnelJours' : 'exceptionnelCount'}
                  name="Exceptionnel / Autres"
                  fill={LEAVE_COLORS.exceptionnel.fill}
                  stackId={chartType === 'empile' ? 'stack' : undefined}
                  radius={chartType === 'empile' ? [3, 3, 0, 0] : [3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-lg p-6 text-center space-y-2">
              <Calendar className="w-8 h-8 text-slate-400" />
              <div className="text-sm font-semibold text-slate-700">
                Aucune absence enregistrée pour l'année {selectedYear}
              </div>
              <p className="text-xs text-slate-500 max-w-sm">
                Les barres d'absence mensuelle s'actualiseront automatiquement dès qu'une demande de congé est enregistrée.
              </p>
              {onNavigateToLeaves && (
                <button
                  type="button"
                  onClick={onNavigateToLeaves}
                  className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800 underline"
                >
                  Accéder à la gestion des congés
                </button>
              )}
            </div>
          )}
        </div>

        {/* Donut Distribution Breakdown (1 Column) */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-slate-200 h-[320px]">
          <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5 self-start">
            <PieIcon className="w-3.5 h-3.5 text-teal-700" />
            <span>Part Annuelle ({selectedYear})</span>
          </div>

          {annualTotals.pieData.length > 0 ? (
            <>
              <div className="w-full h-44 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={annualTotals.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {annualTotals.pieData.map((entry, index) => (
                        <Cell key={`pie-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any) => [`${val} ${metric === 'jours' ? 'jours' : 'demandes'}`, '']} 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center metric */}
                <div className="absolute text-center pointer-events-none">
                  <div className="text-xs text-slate-400 font-medium">Total</div>
                  <div className="text-base font-bold text-slate-900 tabular-nums">
                    {metric === 'jours' ? annualTotals.grandTotalJours : annualTotals.grandTotalCount}
                  </div>
                  <div className="text-[10px] text-slate-500">{metric === 'jours' ? 'jours' : 'dem.'}</div>
                </div>
              </div>

              {/* Mini Legend List */}
              <div className="w-full space-y-1.5 text-[11px] pt-1">
                {annualTotals.pieData.map((item, idx) => {
                  const total = metric === 'jours' ? annualTotals.grandTotalJours : annualTotals.grandTotalCount;
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return (
                    <div key={`legend-${idx}`} className="flex items-center justify-between text-slate-600">
                      <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                        <span className="truncate">{item.name}</span>
                      </div>
                      <span className="font-semibold text-slate-900 tabular-nums font-mono">
                        {item.value} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-4 text-xs text-slate-400">
              Aucune donnée à afficher pour ce camembert
            </div>
          )}
        </div>

      </div>

      {/* 4. Footer Note */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
          <span>Données calculées en temps réel sur la base des dates de cessation et de reprise du bloc opératoire.</span>
        </div>
        <div className="font-mono text-slate-400">
          Mise à jour automatique avec Cloud Firestore
        </div>
      </div>

    </div>
  );
};
