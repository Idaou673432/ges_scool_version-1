/**
 * SomaSikolo - Cartes Scolaires QR & Badges Module (Amélioré)
 */import React, { useState, useEffect } from 'react';
import { QrCode, Printer, Building2, CheckSquare, Square, Search, RefreshCw, ShieldCheck, Phone, MapPin, Sparkles, Filter, CreditCard, Download } from 'lucide-react';
import { useSchool } from '../../contexts/SchoolContext';
import { PdfService } from '../../services/pdfService';
import { Student } from '../../types';

export const CardsModule: React.FC = () => {
  const { students, classes, settings } = useSchool();
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cardFaceMode, setCardFaceMode] = useState<'RECTO' | 'VERSO' | 'BOTH'>('RECTO');
  const [cardTheme, setCardTheme] = useState<'MALI_GOLD' | 'ROYAL_AZUR' | 'EMERALD_PRESTIGE' | 'BURGUNDY_GOLD' | 'OBSIDIAN_GOLD'>('MALI_GOLD');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentQrs, setStudentQrs] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter active students based on class & search
  const filteredStudents = students.filter(s => {
    const isClassMatch = selectedClassId === 'ALL' || s.classId === selectedClassId;
    const isSearchMatch =
      s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.matricule.toLowerCase().includes(searchQuery.toLowerCase());
    return s.status === 'ACTIF' && isClassMatch && isSearchMatch;
  });

  // Select / Deselect All
  useEffect(() => {
    setSelectedStudentIds(filteredStudents.map(s => s.id));
  }, [selectedClassId, searchQuery, students.length]);

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  // Generate QR Codes
  useEffect(() => {
    const generateQrs = async () => {
      setIsGenerating(true);
      const map: Record<string, string> = {};
      for (const std of filteredStudents) {
        map[std.id] = await PdfService.generateStudentCardQr(std);
      }
      setStudentQrs(map);
      setIsGenerating(false);
    };
    if (filteredStudents.length > 0) {
      generateQrs();
    }
  }, [selectedClassId, searchQuery, students]);

  const handlePrint = () => {
    window.print();
  };

  const studentsToPrint = filteredStudents.filter(s => selectedStudentIds.includes(s.id));

  // Theme styling configurations
  const themeStyles = {
    MALI_GOLD: {
      bg: 'bg-emerald-950',
      border: 'border-2 border-amber-400/90 shadow-[0_0_20px_rgba(245,158,11,0.25)]',
      headerBg: 'bg-emerald-900/90',
      accentText: 'text-amber-300 font-black',
      pillBg: 'bg-amber-400/20 text-amber-300 border-amber-400/40',
      gradient: 'from-emerald-950 via-teal-950 to-emerald-900'
    },
    ROYAL_AZUR: {
      bg: 'bg-blue-950',
      border: 'border-2 border-amber-300/80 shadow-[0_0_20px_rgba(59,130,246,0.3)]',
      headerBg: 'bg-blue-900/90',
      accentText: 'text-sky-300 font-black',
      pillBg: 'bg-blue-500/20 text-blue-200 border-blue-400/40',
      gradient: 'from-blue-950 via-slate-900 to-indigo-950'
    },
    EMERALD_PRESTIGE: {
      bg: 'bg-teal-950',
      border: 'border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3)]',
      headerBg: 'bg-teal-900/90',
      accentText: 'text-emerald-300 font-black',
      pillBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
      gradient: 'from-teal-950 via-emerald-900 to-slate-950'
    },
    BURGUNDY_GOLD: {
      bg: 'bg-rose-950',
      border: 'border-2 border-amber-400/80 shadow-[0_0_20px_rgba(225,29,72,0.3)]',
      headerBg: 'bg-rose-900/90',
      accentText: 'text-amber-300 font-black',
      pillBg: 'bg-rose-500/20 text-rose-200 border-rose-400/40',
      gradient: 'from-rose-950 via-slate-950 to-rose-900'
    },
    OBSIDIAN_GOLD: {
      bg: 'bg-slate-950',
      border: 'border-2 border-amber-400/90 shadow-[0_0_20px_rgba(251,191,36,0.35)]',
      headerBg: 'bg-slate-900/90',
      accentText: 'text-amber-400 font-black',
      pillBg: 'bg-amber-400/20 text-amber-300 border-amber-400/50',
      gradient: 'from-slate-950 via-zinc-900 to-black'
    }
  }[cardTheme];

  return (
    <div className="space-y-8 pb-12">
      {/* Dynamic Print Styles for Clean A4 Output */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, header, nav, sidebar {
            display: none !important;
          }
          #printable-card-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .card-printable-item {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            border: 1px dashed #cbd5e1 !important;
            border-radius: 1.5rem !important;
          }
        }
      `}</style>

      {/* Header Banner - Screen Only */}
      <div className="no-print flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-3">
            <CreditCard className="w-7 h-7 text-blue-900" />
            <span>Impression des Cartes Scolaires Officielles</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">
            Génération HD • Format Badge Élargi Officiel (Recto / Verso) • QR Code de Sécurité
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Card Face Mode Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-full text-xs font-black uppercase tracking-widest">
            <button
              onClick={() => setCardFaceMode('RECTO')}
              className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
                cardFaceMode === 'RECTO' ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Recto
            </button>
            <button
              onClick={() => setCardFaceMode('VERSO')}
              className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
                cardFaceMode === 'VERSO' ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Verso
            </button>
            <button
              onClick={() => setCardFaceMode('BOTH')}
              className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
                cardFaceMode === 'BOTH' ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Recto + Verso
            </button>
          </div>

          <button
            onClick={() => PdfService.generateStudentCardsBatchPdf(studentsToPrint, classes, settings)}
            disabled={studentsToPrint.length === 0}
            className="flex items-center gap-2 px-5 py-3.5 bg-amber-400 hover:bg-amber-500 disabled:bg-slate-300 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg transition-all cursor-pointer"
            title="Télécharger directement un document PDF A4 prêt à imprimer"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger PDF A4 ({studentsToPrint.length})</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={studentsToPrint.length === 0}
            className="flex items-center gap-2 px-6 py-3.5 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-300 text-white font-black text-[10px] uppercase tracking-widest rounded-full shadow-lg shadow-blue-900/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer Direct ({studentsToPrint.length})</span>
          </button>
        </div>
      </div>

      {/* Toolbar & Filters - Screen Only */}
      <div className="no-print bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Select All Button */}
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-700 transition-all cursor-pointer"
          >
            {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-blue-900" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>Tout Sélectionner ({filteredStudents.length})</span>
          </button>

          {/* Class Filter */}
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
          >
            <option value="ALL">Toutes les classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Theme Switcher */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mr-1">Couleur:</span>
            <button
              onClick={() => setCardTheme('MALI_GOLD')}
              className={`w-7 h-7 rounded-full bg-gradient-to-r from-emerald-600 via-amber-400 to-rose-600 border-2 cursor-pointer transition-all ${
                cardTheme === 'MALI_GOLD' ? 'border-amber-400 scale-110 shadow-md ring-2 ring-amber-400/50' : 'border-transparent opacity-80'
              }`}
              title="Thème National Mali & Or"
            />
            <button
              onClick={() => setCardTheme('ROYAL_AZUR')}
              className={`w-7 h-7 rounded-full bg-gradient-to-r from-blue-900 to-indigo-900 border-2 cursor-pointer transition-all ${
                cardTheme === 'ROYAL_AZUR' ? 'border-amber-400 scale-110 shadow-md ring-2 ring-blue-400/50' : 'border-transparent opacity-80'
              }`}
              title="Thème Azur Royal & Or"
            />
            <button
              onClick={() => setCardTheme('EMERALD_PRESTIGE')}
              className={`w-7 h-7 rounded-full bg-gradient-to-r from-emerald-900 to-teal-800 border-2 cursor-pointer transition-all ${
                cardTheme === 'EMERALD_PRESTIGE' ? 'border-emerald-400 scale-110 shadow-md ring-2 ring-emerald-400/50' : 'border-transparent opacity-80'
              }`}
              title="Thème Émeraude Prestige"
            />
            <button
              onClick={() => setCardTheme('BURGUNDY_GOLD')}
              className={`w-7 h-7 rounded-full bg-gradient-to-r from-rose-950 to-amber-900 border-2 cursor-pointer transition-all ${
                cardTheme === 'BURGUNDY_GOLD' ? 'border-amber-400 scale-110 shadow-md ring-2 ring-rose-400/50' : 'border-transparent opacity-80'
              }`}
              title="Thème Pourpre & Or"
            />
            <button
              onClick={() => setCardTheme('OBSIDIAN_GOLD')}
              className={`w-7 h-7 rounded-full bg-gradient-to-r from-slate-950 to-amber-500 border-2 cursor-pointer transition-all ${
                cardTheme === 'OBSIDIAN_GOLD' ? 'border-amber-400 scale-110 shadow-md ring-2 ring-amber-400/50' : 'border-transparent opacity-80'
              }`}
              title="Thème Obsidienne & Or Luxe"
            />
          </div>
        </div>

        {/* Search Field */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-4 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher élève ou matricule..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
          />
        </div>
      </div>

      {/* Main Grid of ID Cards (Wider Layout - 2 columns max) */}
      <div id="printable-card-grid" className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {filteredStudents.map(std => {
          const studentClass = classes.find(c => c.id === std.classId);
          const qrUrl = studentQrs[std.id];
          const isSelected = selectedStudentIds.includes(std.id);

          return (
            <div
              key={std.id}
              className={`card-printable-item relative transition-all rounded-[2rem] p-1 w-full max-w-[520px] mx-auto ${
                isSelected ? 'opacity-100' : 'opacity-40 grayscale no-print'
              }`}
            >
              {/* Checkbox Selector (Screen only) */}
              <button
                onClick={() => toggleSelectStudent(std.id)}
                className="no-print absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full text-white cursor-pointer transition-all"
              >
                {isSelected ? <CheckSquare className="w-5 h-5 text-emerald-400" /> : <Square className="w-5 h-5 text-slate-300" />}
              </button>

              <div className="space-y-4">
                {/* RECTO CARD DESIGN - WIDER FORMAT */}
                {(cardFaceMode === 'RECTO' || cardFaceMode === 'BOTH') && (
                  <div className={`bg-gradient-to-br ${themeStyles.gradient} text-white rounded-[2rem] p-6 border ${themeStyles.border} shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[285px]`}>
                    {/* Top National Colors Ribbon (Green, Yellow, Red) */}
                    <div className="absolute top-0 left-0 right-0 h-2 flex">
                      <div className="flex-1 bg-emerald-500" />
                      <div className="flex-1 bg-amber-400" />
                      <div className="flex-1 bg-rose-600" />
                    </div>

                    {/* Card Header */}
                    <div className="flex items-center gap-3 border-b border-white/10 pb-3 pt-2">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-black shrink-0 border border-white/20">
                        <Building2 className="w-6 h-6 text-amber-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-sm tracking-wider uppercase truncate text-white">
                          {settings.schoolName}
                        </h3>
                        <div className="flex items-center justify-between text-[9px] font-black tracking-widest text-white/70 uppercase">
                          <span>RÉPUBLIQUE DU MALI</span>
                          <span>ANNÉE {settings.currentAcademicYear}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="grid grid-cols-12 gap-4 items-center py-2">
                      {/* Photo */}
                      <div className="col-span-4 flex flex-col items-center">
                        {std.photoUrl ? (
                          <img
                            src={std.photoUrl}
                            alt={std.firstName}
                            className="w-24 h-28 rounded-2xl object-cover border-2 border-amber-300 shadow-md shrink-0"
                          />
                        ) : (
                          <div className="w-24 h-28 rounded-2xl bg-white/10 border-2 border-dashed border-white/30 text-white font-black flex flex-col items-center justify-center text-xs shrink-0">
                            <span className="text-2xl font-bold">{std.firstName.charAt(0)}{std.lastName.charAt(0)}</span>
                            <span className="text-[9px] text-white/50 uppercase mt-1">SANS PHOTO</span>
                          </div>
                        )}
                      </div>

                      {/* Info Details */}
                      <div className="col-span-5 space-y-2">
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${themeStyles.accentText}`}>ÉLÈVE</p>
                          <p className="font-black text-base text-white truncate leading-tight uppercase">
                            {std.lastName}
                          </p>
                          <p className="font-bold text-sm text-white/90 truncate leading-tight">
                            {std.firstName}
                          </p>
                        </div>

                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${themeStyles.accentText}`}>CLASSE & SEXE</p>
                          <p className="font-bold text-xs text-white">{studentClass?.name || 'Inconnue'} ({std.gender})</p>
                        </div>

                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${themeStyles.accentText}`}>MATRICULE MLE</p>
                          <p className="font-mono font-black text-sm text-amber-300 tracking-wider">{std.matricule}</p>
                        </div>
                      </div>

                      {/* QR Code */}
                      <div className="col-span-3 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-white rounded-2xl p-2 flex items-center justify-center shadow-lg">
                          {qrUrl ? (
                            <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                          ) : (
                            <QrCode className="w-10 h-10 text-slate-400" />
                          )}
                        </div>
                        <span className="text-[8px] font-mono font-bold text-white/60 mt-1 uppercase">SomaQR</span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[9px] font-black tracking-widest text-white/70 uppercase">
                      <span className="text-amber-300 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> CARTE SCOLAIRE OFFICIELLE
                      </span>
                      <span>VALIDITÉ: 31/07/{settings.currentAcademicYear.split('-')[1] || '2025'}</span>
                    </div>
                  </div>
                )}

                {/* VERSO CARD DESIGN - WIDER FORMAT */}
                {(cardFaceMode === 'VERSO' || cardFaceMode === 'BOTH') && (
                  <div className={`bg-gradient-to-br ${themeStyles.gradient} text-white rounded-[2rem] p-6 border ${themeStyles.border} shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[285px]`}>
                    <div className="border-b border-white/10 pb-2">
                      <h4 className="font-black text-xs uppercase tracking-widest text-amber-300">
                        INSTRUCTIONS & CONTACTS D'URGENCE
                      </h4>
                      <p className="text-[9px] text-white/70 leading-relaxed mt-1">
                        Cette carte est strictement personnelle et incessible. Toute personne trouvant cette carte est priée de la retourner à l'administration de l'établissement.
                      </p>
                    </div>

                    <div className="space-y-2.5 my-auto text-xs font-bold">
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                        <p className={`text-[8px] font-black uppercase tracking-widest ${themeStyles.accentText}`}>PARENTS / TUTEUR LÉGAL</p>
                        <p className="text-white text-xs">{std.parent.fatherName || 'Père / Tuteur non renseigné'}</p>
                        <p className="text-amber-300 font-mono flex items-center gap-1 mt-1 text-xs">
                          <Phone className="w-3 h-3" /> {std.parent.fatherPhone || settings.phone}
                        </p>
                      </div>

                      <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                        <p className={`text-[8px] font-black uppercase tracking-widest ${themeStyles.accentText}`}>ÉTABLISSEMENT SOMA SIKOLO</p>
                        <p className="text-white text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-300 shrink-0" /> {settings.address}, {settings.city}
                        </p>
                        <p className="text-white/80 font-mono text-[11px] mt-0.5">Tél: {settings.phone} | Décision N°: {settings.registrationNumber}</p>
                      </div>
                    </div>

                    {/* Stamp & Signature Placeholder */}
                    <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[9px]">
                      <div className="text-left">
                        <p className="font-bold text-white/60">Sceau de l'École</p>
                        <div className="w-11 h-11 border border-dashed border-white/30 rounded-full flex items-center justify-center text-[7px] text-white/40 mt-1">
                          CACHET
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white/60">Signature du Directeur</p>
                        <p className="font-black text-amber-300 italic mt-3 text-xs">Le Directeur</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};



