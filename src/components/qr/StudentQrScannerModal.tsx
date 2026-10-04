/**
 * SomaSikolo / KalanGest - Scanner de QR Code Élève (Webcam & Téléphone)
 * Permet de scanner le QR Code d'un badge ou d'une carte scolaire avec la caméra,
 * un fichier image ou via le simulateur de test express.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  RefreshCw, 
  Sparkles, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  QrCode, 
  Smartphone, 
  Image as ImageIcon,
  Flashlight,
  Video,
  VideoOff,
  Code
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Student } from '../../types';
import { useSchool } from '../../contexts/SchoolContext';
import { ScanHistoryService } from '../../services/scanHistoryService';

interface StudentQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentFound: (student: Student) => void;
}

export const StudentQrScannerModal: React.FC<StudentQrScannerModalProps> = ({
  isOpen,
  onClose,
  onStudentFound
}) => {
  const { students, classes } = useSchool();
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'UPLOAD' | 'JSON_PASTE' | 'TEST'>('CAMERA');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [manualMatricule, setManualMatricule] = useState('');
  const [pastedJsonData, setPastedJsonData] = useState('');
  const [testSearch, setTestSearch] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-viewport';

  // Play pleasant synthetic scan chime
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch {
      // AudioContext unavailable or blocked by user gesture
    }
  };

  // Find student by decoded text (JSON payload, URL parameter, matricule, ID, or name)
  const processDecodedData = (decodedText: string): boolean => {
    let targetMatricule = '';
    let targetId = '';
    let parsed: any = null;

    let candidate = decodedText.trim();
    // Handle URL format: https://.../?student_qr={...}
    if (candidate.includes('student_qr=') || candidate.includes('verify_qr=')) {
      try {
        const splitPart = (candidate.includes('student_qr=') ? candidate.split('student_qr=')[1] : candidate.split('verify_qr=')[1]).split('&')[0];
        candidate = decodeURIComponent(splitPart);
      } catch {}
    }

    // 1. Try parsing JSON
    try {
      parsed = JSON.parse(candidate);
      if (parsed.matricule) targetMatricule = parsed.matricule.trim();
      else if (parsed.m) targetMatricule = parsed.m.trim();
      if (parsed.id) targetId = parsed.id.trim();
    } catch {
      // 2. Plain text
      targetMatricule = candidate;
    }

    // Lookup in students
    const matched = students.find(s => {
      const matchMatricule = targetMatricule && s.matricule.toLowerCase() === targetMatricule.toLowerCase();
      const matchId = targetId && s.id === targetId;
      const matchSub = targetMatricule && s.matricule.toLowerCase().includes(targetMatricule.toLowerCase());
      return matchMatricule || matchId || matchSub;
    });

    if (matched) {
      playScanBeep();
      stopScanner();
      const cls = classes.find(c => c.id === matched.classId);
      ScanHistoryService.recordScan(matched, cls?.name, 'CAMERA');
      onStudentFound(matched);
      return true;
    } else if (parsed && (parsed.matricule || parsed.m || parsed.name || parsed.firstName || parsed.fn)) {
      // Construct a valid student object from the parsed JSON so external scans display flawlessly!
      playScanBeep();
      stopScanner();
      const syntheticStudent: Student = {
        id: parsed.id || `std-${Date.now()}`,
        matricule: parsed.matricule || parsed.m || 'MALI-2025-EXT',
        firstName: parsed.firstName || parsed.fn || (parsed.name ? parsed.name.split(' ').slice(1).join(' ') : 'Élève'),
        lastName: parsed.lastName || parsed.ln || (parsed.name ? parsed.name.split(' ')[0] : 'Scanné'),
        birthDate: parsed.birthDate || '2010-01-01',
        birthPlace: parsed.birthPlace || 'Bamako',
        nationality: 'Mali',
        address: parsed.address || 'Bamako, Mali',
        admissionDate: '2024-09-15',
        gender: parsed.gender || 'M',
        classId: parsed.classId || classes[0]?.id || '',
        academicYear: parsed.academicYear || parsed.year || '2024-2025',
        status: parsed.status || 'ACTIF',
        photoUrl: parsed.photoUrl,
        bloodType: parsed.bloodType || parsed.bt || undefined,
        allergies: parsed.allergies || parsed.al || '',
        emergencyContact: parsed.emergencyContact || parsed.em || parsed.fatherPhone || parsed.motherPhone || '',
        parent: {
          fatherName: parsed.fatherName || parsed.parent?.fatherName || '',
          fatherPhone: parsed.fatherPhone || parsed.fp || parsed.parent?.fatherPhone || '',
          fatherProfession: parsed.fatherProfession || '',
          motherName: parsed.motherName || parsed.parent?.motherName || '',
          motherPhone: parsed.motherPhone || parsed.mp || parsed.parent?.motherPhone || '',
          motherProfession: parsed.motherProfession || '',
          guardianAddress: parsed.address || ''
        }
      };
      ScanHistoryService.recordScan(syntheticStudent, parsed.className, 'JSON');
      onStudentFound(syntheticStudent);
      return true;
    } else {
      return false;
    }
  };

  // Stop camera stream
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Start camera scanner
  const startCamera = async (cameraIdToUse?: string) => {
    setCameraError(null);
    await stopScanner();

    // Check if element exists
    const element = document.getElementById(scannerContainerId);
    if (!element) return;

    try {
      const qrScanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      html5QrCodeRef.current = qrScanner;

      // Get available cameras
      let camId = cameraIdToUse;
      if (!camId) {
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setCameras(devices);
            // Default to back/environment camera if available
            const backCam = devices.find(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('arriere') || 
              d.label.toLowerCase().includes('environment')
            );
            camId = backCam ? backCam.id : devices[0].id;
            setSelectedCameraId(camId);
          }
        } catch {
          // Will use facingMode constraint below
        }
      }

      const cameraConfig = camId ? { deviceId: { exact: camId } } : { facingMode: 'environment' };

      await qrScanner.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          const success = processDecodedData(decodedText);
          if (!success) {
            setCameraError(`QR Code détecté mais aucun élève ne correspond à: "${decodedText.slice(0, 30)}..."`);
          }
        },
        () => {
          // scan in progress
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera start failed:', err);
      setCameraError(
        err?.message?.includes('Permission') 
          ? "Permission caméra refusée. Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur."
          : "Impossible d'accéder à la caméra. Vérifiez qu'aucune autre application ne l'utilise, ou utilisez l'onglet 'Importer Photo'."
      );
      setIsCameraActive(false);
    }
  };

  // Switch tab
  useEffect(() => {
    if (isOpen && activeTab === 'CAMERA') {
      const timer = setTimeout(() => {
        startCamera(selectedCameraId);
      }, 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, activeTab]);

  // Clean up on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
    }
  }, [isOpen]);

  // Handle image file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsProcessingUpload(true);

    try {
      const html5QrCode = new Html5Qrcode('qr-file-scan-temp', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });

      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();

      const success = processDecodedData(decodedText);
      if (!success) {
        setUploadError(`QR Code lu ("${decodedText.slice(0, 40)}"), mais aucun élève correspondant n'a été trouvé.`);
      }
    } catch (err: any) {
      setUploadError("Aucun QR Code valide n'a pu être détecté dans cette image. Assurez-vous que le QR Code est net et bien éclairé.");
    } finally {
      setIsProcessingUpload(false);
    }
  };

  // Filter students for test simulator
  const filteredTestStudents = students.filter(s => {
    if (!testSearch.trim()) return true;
    const q = testSearch.toLowerCase().trim();
    return s.lastName.toLowerCase().includes(q) ||
           s.firstName.toLowerCase().includes(q) ||
           s.matricule.toLowerCase().includes(q);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <QrCode className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="font-black text-base uppercase tracking-tight text-white flex items-center gap-2">
                <span>Scanner QR Code Élève</span>
              </h3>
              <p className="text-xs text-slate-400">
                Lecture instantanée du badge scolaire • Affichage du dossier complet
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls: Camera / Upload / Coller JSON / Test Express */}
        <div className="bg-slate-50 border-b border-slate-200 p-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('CAMERA')}
            className={`py-2.5 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'CAMERA'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Caméra</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('UPLOAD')}
            className={`py-2.5 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'UPLOAD'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Image</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('JSON_PASTE')}
            className={`py-2.5 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'JSON_PASTE'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Code className="w-4 h-4 text-emerald-400" />
            <span>Coller JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TEST')}
            className={`py-2.5 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'TEST'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Test ({students.length})</span>
          </button>
        </div>

        {/* Main Scanner Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* TAB 1: LIVE WEBCAM / MOBILE CAMERA */}
          {activeTab === 'CAMERA' && (
            <div className="space-y-4">
              {/* Camera Selector & Refresh */}
              {cameras.length > 1 && (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-slate-500">Choisir la Caméra :</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedCameraId(id);
                      startCamera(id);
                    }}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
                  >
                    {cameras.map((c, i) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Caméra ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Viewport Box */}
              <div className="relative rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 aspect-square max-w-sm mx-auto shadow-inner flex items-center justify-center">
                {/* Real-time container required by html5-qrcode */}
                <div id={scannerContainerId} className="w-full h-full" />

                {/* Holographic Laser Scanner Overlay when Active */}
                {isCameraActive && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    {/* Corner Reticle Marks */}
                    <div className="w-64 h-64 border-2 border-amber-400/70 rounded-2xl relative">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-400 -mt-1 -ml-1 rounded-tl-md" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-400 -mt-1 -mr-1 rounded-tr-md" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-400 -mb-1 -ml-1 rounded-bl-md" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-400 -mb-1 -mr-1 rounded-br-md" />

                      {/* Moving laser scan line */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_10px_#f43f5e] animate-bounce mt-32" />
                    </div>
                  </div>
                )}

                {/* Error overlay if camera fails */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/90 text-white p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
                    <AlertCircle className="w-10 h-10 text-rose-500" />
                    <p className="text-xs font-bold leading-relaxed text-slate-200">
                      {cameraError}
                    </p>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => startCamera(selectedCameraId)}
                        className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Réessayer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('UPLOAD')}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Importer Image</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">
                  Cadrez le QR Code de la carte scolaire dans le carré jaune.
                </p>
                <p className="text-[11px] text-slate-400">
                  La détection est automatique et instantanée dès que le code est net.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD IMAGE FILE */}
          {activeTab === 'UPLOAD' && (
            <div className="space-y-4">
              <div id="qr-file-scan-temp" className="hidden" />

              <label className="border-2 border-dashed border-slate-300 hover:border-blue-900 bg-slate-50 hover:bg-blue-50/40 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isProcessingUpload}
                />
                <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-blue-900 shadow-sm">
                  {isProcessingUpload ? (
                    <RefreshCw className="w-7 h-7 text-blue-900 animate-spin" />
                  ) : (
                    <ImageIcon className="w-7 h-7 text-blue-900" />
                  )}
                </div>
                <div>
                  <p className="font-black text-sm text-slate-900">
                    {isProcessingUpload ? 'Analyse du QR Code en cours...' : 'Sélectionnez une photo ou capture du badge'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    PNG, JPG, WEBP • Glissez-déposez ou cliquez pour parcourir
                  </p>
                </div>
              </label>

              {uploadError && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl text-xs font-bold text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB: COLLER JSON (SCANS EXTERNES DEPUIS TÉLÉPHONE) */}
          {activeTab === 'JSON_PASTE' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-950 space-y-1.5">
                <div className="flex items-center gap-2 font-black text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Scan Externe via Smartphone / App QR tierce</span>
                </div>
                <p className="leading-relaxed text-emerald-800 font-medium">
                  Lorsque vous scannez la carte d'un élève avec l'appareil photo d'un téléphone ou un lecteur QR externe, les données retournées sont au format JSON. Collez le résultat ci-dessous pour ouvrir instantanément la fiche officielle haute définition.
                </p>
              </div>

              {/* Sample Quick Loader */}
              {students.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-500">Test rapide avec un élève :</span>
                  <button
                    type="button"
                    onClick={() => {
                      const firstStd = students[0];
                      const cls = classes.find(c => c.id === firstStd.classId);
                      const sample = {
                        id: firstStd.id,
                        matricule: firstStd.matricule,
                        name: `${firstStd.lastName.toUpperCase()} ${firstStd.firstName}`,
                        firstName: firstStd.firstName,
                        lastName: firstStd.lastName,
                        className: cls?.name || '10ème Lettres',
                        academicYear: '2024-2025',
                        bloodType: firstStd.bloodType,
                        status: 'INSCRIT',
                        allergies: firstStd.allergies || 'Aucune allergie connue',
                        emergencyContact: firstStd.emergencyContact || '66 00 11 22',
                        fatherName: firstStd.fatherName || 'Amadou DIARRA',
                        fatherPhone: firstStd.fatherPhone || '76 54 32 10',
                        motherName: firstStd.motherName || 'Fatoumata KOUYATE',
                        motherPhone: firstStd.motherPhone || '65 43 21 09',
                        average: 14.85,
                        rank: 3,
                        totalAbsences: 2,
                        annualFee: 150000,
                        totalPaid: 150000,
                        remainingAmount: 0,
                        schoolName: 'Lycée Moderne KalanGest Bamako'
                      };
                      setPastedJsonData(JSON.stringify(sample, null, 2));
                    }}
                    className="text-[11px] font-bold text-blue-900 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/70 border border-blue-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    + Charger exemple JSON ({students[0].lastName})
                  </button>
                </div>
              )}

              {/* Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <label htmlFor="pasted-qr-json">Données JSON scannées :</label>
                  {pastedJsonData && (
                    <button
                      type="button"
                      onClick={() => setPastedJsonData('')}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      Effacer
                    </button>
                  )}
                </div>
                <textarea
                  id="pasted-qr-json"
                  rows={6}
                  value={pastedJsonData}
                  onChange={(e) => setPastedJsonData(e.target.value)}
                  placeholder={'Collez ici le JSON scanné par votre téléphone...\nExemple :\n{\n  "matricule": "MLE-2025-001",\n  "name": "DIARRA Amadou",\n  "average": 14.5,\n  "bloodType": "O+"\n}'}
                  className="w-full p-3.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 custom-scrollbar placeholder:text-slate-500"
                />
              </div>

              {/* Process Button */}
              <button
                type="button"
                onClick={() => {
                  if (!pastedJsonData.trim()) {
                    setCameraError("Veuillez coller le JSON ou le texte scanné.");
                    return;
                  }
                  const success = processDecodedData(pastedJsonData.trim());
                  if (!success) {
                    setCameraError("Impossible d'extraire les données de cet élève depuis le JSON collé.");
                  }
                }}
                disabled={!pastedJsonData.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Afficher la Fiche Stylée de l'Élève</span>
              </button>
            </div>
          )}

          {/* TAB 4: TEST EXPRESS SIMULATOR (1-CLICK TESTING) */}
          {activeTab === 'TEST' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs font-bold text-amber-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Simulateur de Scan : Cliquez sur un élève pour tester immédiatement l'affichage complet de sa fiche QR sans avoir à imprimer de carte physique !
                </span>
              </div>

              {/* Search in Test Mode */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  placeholder="Rechercher par nom, matricule..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              {/* List of Students to Click */}
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto custom-scrollbar border border-slate-200 rounded-2xl bg-white">
                {filteredTestStudents.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">Aucun élève trouvé.</p>
                ) : (
                  filteredTestStudents.map((std) => {
                    const cls = classes.find(c => c.id === std.classId);
                    return (
                      <button
                        key={std.id}
                        type="button"
                        onClick={() => {
                          playScanBeep();
                          ScanHistoryService.recordScan(std, cls?.name, 'MANUEL');
                          onStudentFound(std);
                        }}
                        className="w-full p-3 hover:bg-blue-50/60 flex items-center justify-between text-left transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-black text-xs shrink-0 group-hover:bg-blue-900 group-hover:text-white transition-colors">
                            {std.firstName[0]}{std.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 group-hover:text-blue-900 truncate">
                              {std.lastName.toUpperCase()} {std.firstName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              Mat: {std.matricule} • {cls?.name || 'Classe'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {std.bloodType ? (
                            <span className="text-[10px] font-mono font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                              {std.bloodType}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              —
                            </span>
                          )}
                          <span className="text-[10px] font-black text-blue-900 uppercase group-hover:translate-x-0.5 transition-transform">
                            Scanner →
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Quick Manual Matricule Entry fallback */}
          <div className="pt-3 border-t border-slate-100">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
              Ou saisie manuelle du matricule :
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualMatricule.trim()) {
                  const success = processDecodedData(manualMatricule);
                  if (!success) {
                    setCameraError(`Aucun élève trouvé avec le matricule: "${manualMatricule}"`);
                  }
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={manualMatricule}
                onChange={(e) => setManualMatricule(e.target.value)}
                placeholder="Ex: MLE-2025-001"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all"
              >
                Rechercher
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>KalanGest Sécurité QR Officielle</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
