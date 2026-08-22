/**
 * SomaSikolo - Dashboard Executive Overview Module
 */

import React from 'react';
import { 
  Users, 
  GraduationCap, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  UserPlus, 
  FileCheck, 
  Receipt, 
  QrCode, 
  Calendar,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart3,
  Printer
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { useSchool } from '../../contexts/SchoolContext';
import { formatFCFA } from '../../constants/maliEducation';
import { NavTab } from '../../components/layout/Sidebar';
import { PdfService } from '../../services/pdfService';
import { AcademicSuccessCharts } from '../../components/dashboard/AcademicSuccessCharts';

interface DashboardProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardModule: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { stats, students, classes, payments, settings } = useSchool();

  // Gender breakdown
  const femaleCount = students.filter(s => s.gender === 'F' && s.status === 'ACTIF').length;
  const maleCount = students.filter(s => s.gender === 'M' && s.status === 'ACTIF').length;

  // Chart data: Monthly revenue vs expenses
  const financialData = [
    { month: 'Sept', Recettes: 1250000, Depenses: 650000 },
    { month: 'Oct', Recettes: 2450000, Depenses: 670000 },
    { month: 'Nov', Recettes: 2100000, Depenses: 670000 },
    { month: 'Déc', Recettes: 1980000, Depenses: 670000 },
    { month: 'Janv', Recettes: 2300000, Depenses: 670000 },
  ];

  // Distribution by level
  const pieData = [
    { name: '1er Cycle (1è-6è)', value: 120, color: '#10b981' },
    { name: '2è Cycle (7è-9è DEF)', value: 145, color: '#0d9488' },
    { name: 'Lycée Général (BAC)', value: 180, color: '#0284c7' },
    { name: 'CAP / BT Technique', value: 65, color: '#6366f1' },
  ];

  const pendingList = payments.filter(p => p.remainingAmount > 0).slice(0, 5);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner / Welcome Card */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-3 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Système Officiel • MEN Mali ({settings.currentAcademicYear})</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
            Tableau de Bord Administratif
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1 max-w-xl">
            {settings.schoolName} — {settings.academyName} • {settings.capName}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => PdfService.generateMenOfficialReportPdf(stats, students, classes, settings)}
            className="flex items-center space-x-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-full shadow-md transition-all cursor-pointer"
            title="Générer le Rapport Statistique Officiel pour le MEN / Académie"
          >
            <Printer className="w-4 h-4" />
            <span>Rapport MEN Mali</span>
          </button>
          <button
            onClick={() => onNavigate('students')}
            className="flex items-center space-x-2 px-5 py-3 bg-blue-900 hover:bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Inscrire Élève</span>
          </button>
          <button
            onClick={() => onNavigate('payments')}
            className="flex items-center space-x-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-md transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>Encaissement</span>
          </button>
          <button
            onClick={() => onNavigate('attendance')}
            className="flex items-center space-x-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-md transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Suivi Présences</span>
          </button>
          <button
            onClick={() => onNavigate('bulletins')}
            className="flex items-center space-x-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-md transition-all cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            <span>Bulletins</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Students */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Effectif Total</p>
            <p className="text-5xl font-black text-blue-900 tracking-tighter">{stats.totalStudents}</p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full tracking-wide">
              {femaleCount} Filles
            </span>
            <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full tracking-wide">
              {maleCount} Garçons
            </span>
          </div>
        </div>

        {/* Classes */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Classes & Salles</p>
            <p className="text-5xl font-black text-blue-900 tracking-tighter">{stats.totalClasses}</p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full tracking-wide">
              Fondamental & Lycée
            </span>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Recettes Encaissées</p>
            <p className="text-4xl font-black text-blue-900 tracking-tighter">
              {(stats.totalRevenueFCFA / 1000000).toFixed(1)}M <span className="text-sm font-bold text-slate-400">CFA</span>
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full tracking-wide">
              Frais & Scolarité
            </span>
          </div>
        </div>

        {/* Featured Average / Pending */}
        <div className="bg-emerald-600 p-6 rounded-[2rem] shadow-lg shadow-emerald-600/20 text-white flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-2">Moyenne Générale</p>
            <p className="text-5xl font-black tracking-tighter">14.2<span className="text-2xl font-bold text-emerald-200">/20</span></p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[10px] font-black bg-white/20 text-white px-2.5 py-0.5 rounded-full tracking-wide">
              Progression ↑ TRIM 1
            </span>
          </div>
        </div>
      </div>

      {/* Academic Success Visualization Module */}
      <AcademicSuccessCharts onNavigateToGrades={() => onNavigate('grades')} />

      {/* Charts & Treasury Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Financial Chart */}
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                Évolution Financière Mensuelle
              </h2>
              <p className="text-xs font-bold text-slate-400">Recettes Encaissées vs Charges Fixes (FCFA)</p>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full">
              Année {settings.currentAcademicYear}
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: '700' }} />
                <YAxis tick={{ fontSize: 10, fontWeight: '700' }} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip 
                  formatter={(val: any) => [`${formatFCFA(Number(val))}`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="Recettes" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Depenses" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Solde Trésorerie Box */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-blue-900 rounded-[2.5rem] p-8 text-white flex flex-col justify-between h-[200px] shadow-xl shadow-blue-900/30">
            <div className="flex justify-between items-start">
              <h2 className="text-xs font-black uppercase tracking-widest text-blue-200">Solde Trésorerie</h2>
              <DollarSign className="w-6 h-6 text-blue-300" />
            </div>
            <p className="text-4xl font-black tracking-tight">
              {(stats.totalRevenueFCFA).toLocaleString()} <span className="text-lg font-bold text-blue-300">CFA</span>
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-blue-200">
                <span>Objectif Annuel</span>
                <span>85% Reach</span>
              </div>
              <div className="h-2 bg-blue-950 rounded-full w-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[85%]" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Cycles Éducatifs</h3>
            <div className="space-y-3 text-xs font-bold">
              {pieData.map((item) => (
                <div key={item.name} className="flex justify-between items-center">
                  <span className="text-slate-700">{item.name}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] text-white" style={{ backgroundColor: item.color }}>
                    {item.value} élève(s)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
              Relances Scolarités Dues
            </h2>
            <p className="text-xs font-bold text-slate-400">Paiements partiels et arriérés prioritaires FCFA</p>
          </div>
          <button
            onClick={() => onNavigate('payments')}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all cursor-pointer"
          >
            Gestion Comptable
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                <th className="px-8 py-4">N° Reçu</th>
                <th className="px-4 py-4">Élève & Matricule</th>
                <th className="px-4 py-4">Classe</th>
                <th className="px-4 py-4">Versé (FCFA)</th>
                <th className="px-4 py-4">Reste Dû</th>
                <th className="px-8 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm font-bold text-slate-700">
              {pendingList.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4 font-mono font-bold text-blue-900">{p.receiptNumber}</td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-900">{p.studentName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{p.studentMatricule}</p>
                  </td>
                  <td className="px-4 py-4 text-xs">{p.className}</td>
                  <td className="px-4 py-4 text-emerald-700">{formatFCFA(p.amountPaid)}</td>
                  <td className="px-4 py-4 text-rose-600 font-black">{formatFCFA(p.remainingAmount)}</td>
                  <td className="px-8 py-4 text-right">
                    <button
                      onClick={() => onNavigate('payments')}
                      className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-emerald-200 transition-all"
                    >
                      Encaisser
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
