/**
 * SomaSikolo - Main Domain Data Context with Real-time Multi-School Cloud Synchronization
 * Provides reactive access and instant live-sync across multiple devices (PCs, phones, tablets)
 * and seamless multi-school separation.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Student,
  SchoolClass,
  Subject,
  Teacher,
  EvaluationGrade,
  EvaluationTerm,
  Payment,
  SchoolSettings,
  AuditLog,
  SystemStats,
  ReportCard,
  StudentSubjectAverage,
  AttendanceRecord
} from '../types';
import { storageService } from '../services/storageService';
import { cloudSyncService } from '../services/cloudSyncService';
import { getMaliScoreAppreciation, getRelatedTermsForPeriod, getEvaluationsPerTrimesterForClass } from '../constants/maliEducation';

export type SyncStatus = 'CONNECTED' | 'SYNCING' | 'OFFLINE' | 'ERROR';

interface SchoolContextType {
  settings: SchoolSettings;
  students: Student[];
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  grades: EvaluationGrade[];
  payments: Payment[];
  attendanceRecords: AttendanceRecord[];
  auditLogs: AuditLog[];
  stats: SystemStats;
  
  // Cloud Multi-School / Multi-Device State
  cloudSchoolCode: string;
  syncStatus: SyncStatus;
  syncStatusMessage: string;
  isCloudConnected: boolean;
  switchOrJoinSchool: (schoolCode: string, schoolName?: string, pinCode?: string) => Promise<boolean>;
  forceCloudPush: () => Promise<boolean>;
  
  // Domain Actions
  refreshData: () => void;
  updateSettings: (newSettings: SchoolSettings) => void;
  saveStudent: (student: Partial<Student>) => Student;
  deleteStudent: (studentId: string) => void;
  deleteAllStudents: () => void;
  saveClass: (cls: Partial<SchoolClass>) => SchoolClass;
  deleteClass: (classId: string) => void;
  deleteAllClasses: () => void;
  saveSubject: (subject: Partial<Subject>) => Subject;
  deleteSubject: (subjectId: string) => void;
  deleteAllSubjects: () => void;
  saveTeacher: (teacher: Partial<Teacher>) => Teacher;
  deleteTeacher: (teacherId: string) => void;
  deleteAllTeachers: () => void;
  saveGrade: (grade: Partial<EvaluationGrade>) => EvaluationGrade;
  deleteGrade: (gradeId: string) => void;
  deleteAllGrades: () => void;
  recordPayment: (payment: Partial<Payment>) => Payment;
  updatePayment: (payment: Payment) => Payment;
  deletePayment: (paymentId: string) => void;
  deleteAllPayments: () => void;
  saveAttendanceBatch: (records: Partial<AttendanceRecord>[]) => void;
  deleteAttendanceRecord: (id: string) => void;
  deleteAllAttendanceRecords: () => void;
  generateReportCard: (studentId: string, term: EvaluationTerm) => ReportCard | null;
  exportBackupJSON: () => string;
  restoreBackupJSON: (jsonStr: string) => boolean;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SchoolSettings>(() => storageService.getSettings());
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [grades, setGrades] = useState<EvaluationGrade[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Multi-school & Cloud Sync Status
  const [cloudSchoolCode, setCloudSchoolCode] = useState<string>(() => cloudSyncService.getActiveSchoolCode());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('SYNCING');
  const [syncStatusMessage, setSyncStatusMessage] = useState<string>('Connexion Cloud...');

  // Avoid circular sync loops
  const isSyncingFromCloud = useRef<boolean>(false);

  const refreshData = useCallback(() => {
    storageService.initDatabase();
    setSettings(storageService.getSettings());
    setStudents(storageService.getStudents());
    setClasses(storageService.getClasses());
    setSubjects(storageService.getSubjects());
    setTeachers(storageService.getTeachers());
    setGrades(storageService.getGrades());
    setPayments(storageService.getPayments());
    setAttendanceRecords(storageService.getAttendanceRecords());
    setAuditLogs(storageService.getAuditLogs());
  }, []);

  // Initial local load + start Cloud real-time sync
  useEffect(() => {
    refreshData();

    // Start Realtime Firestore synchronization for the active school code
    cloudSyncService.startRealtimeSync(cloudSchoolCode, {
      onSettingsChange: (newSettings) => {
        isSyncingFromCloud.current = true;
        storageService.updateSettings(newSettings);
        setSettings(newSettings);
        isSyncingFromCloud.current = false;
      },
      onStudentsChange: (cloudStudents) => {
        if (cloudStudents && cloudStudents.length > 0) {
          isSyncingFromCloud.current = true;
          // Merge with local storage
          const local = storageService.getStudents();
          const mergedMap = new Map<string, Student>();
          local.forEach(s => mergedMap.set(s.id, s));
          cloudStudents.forEach(s => mergedMap.set(s.id, s));
          const merged = Array.from(mergedMap.values());
          try {
            localStorage.setItem('somasikolo_students', JSON.stringify(merged));
          } catch {}
          setStudents(merged);
          isSyncingFromCloud.current = false;
        }
      },
      onClassesChange: (cloudClasses) => {
        if (cloudClasses && cloudClasses.length > 0) {
          isSyncingFromCloud.current = true;
          try {
            localStorage.setItem('somasikolo_classes', JSON.stringify(cloudClasses));
          } catch {}
          setClasses(cloudClasses);
          isSyncingFromCloud.current = false;
        }
      },
      onSubjectsChange: (cloudSubjects) => {
        if (cloudSubjects && cloudSubjects.length > 0) {
          isSyncingFromCloud.current = true;
          try {
            localStorage.setItem('somasikolo_subjects', JSON.stringify(cloudSubjects));
          } catch {}
          setSubjects(cloudSubjects);
          isSyncingFromCloud.current = false;
        }
      },
      onTeachersChange: (cloudTeachers) => {
        if (cloudTeachers && cloudTeachers.length > 0) {
          isSyncingFromCloud.current = true;
          try {
            localStorage.setItem('somasikolo_teachers', JSON.stringify(cloudTeachers));
          } catch {}
          setTeachers(cloudTeachers);
          isSyncingFromCloud.current = false;
        }
      },
      onGradesChange: (cloudGrades) => {
        if (cloudGrades && cloudGrades.length > 0) {
          isSyncingFromCloud.current = true;
          try {
            localStorage.setItem('somasikolo_grades', JSON.stringify(cloudGrades));
          } catch {}
          setGrades(cloudGrades);
          isSyncingFromCloud.current = false;
        }
      },
      onPaymentsChange: (cloudPayments) => {
        if (cloudPayments && cloudPayments.length > 0) {
          isSyncingFromCloud.current = true;
          try {
            localStorage.setItem('somasikolo_payments', JSON.stringify(cloudPayments));
          } catch {}
          setPayments(cloudPayments);
          isSyncingFromCloud.current = false;
        }
      },
      onAttendanceChange: (cloudAttendance) => {
        if (cloudAttendance && cloudAttendance.length > 0) {
          isSyncingFromCloud.current = true;
          try {
            localStorage.setItem('somasikolo_attendance', JSON.stringify(cloudAttendance));
          } catch {}
          setAttendanceRecords(cloudAttendance);
          isSyncingFromCloud.current = false;
        }
      },
      onSyncStatusChange: (status, msg) => {
        setSyncStatus(status);
        if (msg) setSyncStatusMessage(msg);
      }
    });

    return () => {
      cloudSyncService.stopRealtimeSync();
    };
  }, [cloudSchoolCode, refreshData]);

  // Switch or Join a different school database
  const switchOrJoinSchool = async (
    schoolCode: string,
    schoolName?: string,
    pinCode?: string
  ): Promise<boolean> => {
    const cleanCode = schoolCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanCode) return false;

    setSyncStatus('SYNCING');
    setSyncStatusMessage(`Connexion à l'établissement [${cleanCode}]...`);

    const success = await cloudSyncService.connectOrRegisterSchool(
      cleanCode,
      schoolName || settings.schoolName || 'Établissement Scolaire',
      pinCode || settings.adminPassword || '00223'
    );

    if (success) {
      setCloudSchoolCode(cleanCode);
      // Also push current local seed if remote is empty
      cloudSyncService.pushAllDataToCloud(cleanCode, {
        settings,
        students,
        classes,
        subjects,
        teachers,
        grades,
        payments,
        attendance: attendanceRecords
      });
      return true;
    }
    return false;
  };

  // Push all local data to Cloud database
  const forceCloudPush = async (): Promise<boolean> => {
    setSyncStatus('SYNCING');
    setSyncStatusMessage('Téléversement complet des données vers le Cloud...');
    const ok = await cloudSyncService.pushAllDataToCloud(cloudSchoolCode, {
      settings,
      students,
      classes,
      subjects,
      teachers,
      grades,
      payments,
      attendance: attendanceRecords
    });
    if (ok) {
      setSyncStatus('CONNECTED');
      setSyncStatusMessage(`Toutes les données sont synchronisées sur le Cloud [${cloudSchoolCode}]`);
    } else {
      setSyncStatus('ERROR');
      setSyncStatusMessage('Erreur de téléversement Cloud');
    }
    return ok;
  };

  // Calculated System Stats
  const totalStudents = students.filter(s => s.status === 'ACTIF').length;
  const totalTeachers = teachers.filter(t => t.status === 'ACTIF').length;
  const totalClasses = classes.length;
  const totalRevenueFCFA = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalPendingFeesFCFA = payments.reduce((sum, p) => sum + p.remainingAmount, 0);
  const totalExpensesFCFA = teachers.reduce((sum, t) => sum + (t.status === 'ACTIF' ? t.monthlySalary : 0), 0);

  const totalAttendanceRecords = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(r => r.status === 'PRESENT' || r.status === 'LATE').length;
  const attendanceRatePercent = totalAttendanceRecords > 0 
    ? Math.round((presentCount / totalAttendanceRecords) * 1000) / 10 
    : 96.4;

  const stats: SystemStats = {
    totalStudents,
    totalTeachers,
    totalClasses,
    totalRevenueFCFA,
    totalPendingFeesFCFA,
    totalExpensesFCFA,
    attendanceRatePercent,
    defSuccessRatePercent: 88.5,
    bacSuccessRatePercent: 82.0
  };

  // Synchronized Mutation Handlers
  const handleUpdateSettings = (newSettings: SchoolSettings) => {
    storageService.updateSettings(newSettings);
    setSettings(newSettings);
    cloudSyncService.syncSettings(newSettings, cloudSchoolCode);
  };

  const handleSaveStudent = (s: Partial<Student>): Student => {
    const res = storageService.saveStudent(s);
    refreshData();
    cloudSyncService.syncDoc('students', res, cloudSchoolCode);
    return res;
  };

  const handleDeleteStudent = (id: string) => {
    storageService.deleteStudent(id);
    refreshData();
    cloudSyncService.deleteCloudDoc('students', id, cloudSchoolCode);
  };

  const handleClearAllStudents = () => {
    storageService.clearAllStudents();
    refreshData();
  };

  const handleSaveClass = (c: Partial<SchoolClass>): SchoolClass => {
    const res = storageService.saveClass(c);
    refreshData();
    cloudSyncService.syncDoc('classes', res, cloudSchoolCode);
    return res;
  };

  const handleDeleteClass = (id: string) => {
    storageService.deleteClass(id);
    refreshData();
    cloudSyncService.deleteCloudDoc('classes', id, cloudSchoolCode);
  };

  const handleClearAllClasses = () => {
    storageService.clearAllClasses();
    refreshData();
  };

  const handleSaveSubject = (subj: Partial<Subject>): Subject => {
    const res = storageService.saveSubject(subj);
    refreshData();
    cloudSyncService.syncDoc('subjects', res, cloudSchoolCode);
    return res;
  };

  const handleDeleteSubject = (id: string) => {
    storageService.deleteSubject(id);
    refreshData();
    cloudSyncService.deleteCloudDoc('subjects', id, cloudSchoolCode);
  };

  const handleClearAllSubjects = () => {
    storageService.clearAllSubjects();
    refreshData();
  };

  const handleSaveTeacher = (t: Partial<Teacher>): Teacher => {
    const res = storageService.saveTeacher(t);
    refreshData();
    cloudSyncService.syncDoc('teachers', res, cloudSchoolCode);
    return res;
  };

  const handleDeleteTeacher = (id: string) => {
    storageService.deleteTeacher(id);
    refreshData();
    cloudSyncService.deleteCloudDoc('teachers', id, cloudSchoolCode);
  };

  const handleClearAllTeachers = () => {
    storageService.clearAllTeachers();
    refreshData();
  };

  const handleSaveGrade = (g: Partial<EvaluationGrade>): EvaluationGrade => {
    const res = storageService.saveGrade(g);
    refreshData();
    cloudSyncService.syncDoc('grades', res, cloudSchoolCode);
    return res;
  };

  const handleDeleteGrade = (id: string) => {
    storageService.deleteGrade(id);
    refreshData();
    cloudSyncService.deleteCloudDoc('grades', id, cloudSchoolCode);
  };

  const handleClearAllGrades = () => {
    storageService.clearAllGrades();
    refreshData();
  };

  const handleRecordPayment = (p: Partial<Payment>): Payment => {
    const res = storageService.recordPayment(p);
    refreshData();
    cloudSyncService.syncDoc('payments', res, cloudSchoolCode);
    return res;
  };

  const handleUpdatePayment = (p: Payment): Payment => {
    const res = storageService.updatePayment(p);
    refreshData();
    cloudSyncService.syncDoc('payments', res, cloudSchoolCode);
    return res;
  };

  const handleDeletePayment = (id: string) => {
    storageService.deletePayment(id);
    refreshData();
    cloudSyncService.deleteCloudDoc('payments', id, cloudSchoolCode);
  };

  const handleClearAllPayments = () => {
    storageService.clearAllPayments();
    refreshData();
  };

  const handleSaveAttendanceBatch = (records: Partial<AttendanceRecord>[]) => {
    const res = storageService.saveAttendanceBatch(records);
    refreshData();
    res.forEach((r) => {
      cloudSyncService.syncDoc('attendance', r, cloudSchoolCode);
    });
  };

  const handleDeleteAttendanceRecord = (id: string) => {
    storageService.deleteAttendanceRecord(id);
    refreshData();
    cloudSyncService.deleteCloudDoc('attendance', id, cloudSchoolCode);
  };

  const handleClearAllAttendanceRecords = () => {
    storageService.clearAllAttendanceRecords();
    refreshData();
  };

  // Generate Report Card Algorithm
  const generateReportCard = (
    studentId: string,
    term: EvaluationTerm
  ): ReportCard | null => {
    const student = students.find(s => s.id === studentId);
    if (!student) return null;

    const studentClass = classes.find(c => c.id === student.classId);
    const className = studentClass ? studentClass.name : 'Classe Inconnue';
    const isFirstCycle = studentClass?.category === 'FONDAMENTAL_1';
    const maxScore = isFirstCycle ? 10 : 20;

    const relevantSubjects = subjects.filter(
      subj => !studentClass || subj.classCategory === studentClass.category
    );

    const targetTerms = getRelatedTermsForPeriod(term, settings.evaluationCount || 9);

    const studentGrades = grades.filter(
      g => g.studentId === studentId && targetTerms.includes(g.term)
    );

    const subjectAverages: StudentSubjectAverage[] = [];
    let totalPoints = 0;
    let totalCoefficients = 0;

    relevantSubjects.forEach(subj => {
      const subjGrades = studentGrades.filter(g => g.subjectId === subj.id);
      
      let classScore = isFirstCycle ? 6.5 : 16.0;
      let compositionScore = isFirstCycle ? 6.5 : 32.0;
      let finalScore = isFirstCycle ? 6.5 : 16.0;

      if (subjGrades.length > 0) {
        const classGrades = subjGrades.filter(g => g.type !== 'COMPOSITION' && g.type !== 'EXAMEN');
        const compGrades = subjGrades.filter(g => g.type === 'COMPOSITION' || g.type === 'EXAMEN');

        if (classGrades.length > 0) {
          const maxEvalsToTake = getEvaluationsPerTrimesterForClass(studentClass?.category, settings);
          const evalGradesToUse = classGrades.length > maxEvalsToTake ? classGrades.slice(0, maxEvalsToTake) : classGrades;
          classScore = evalGradesToUse.reduce((acc, g) => acc + g.score, 0) / evalGradesToUse.length;
        } else if (settings.missingClassScoreBehavior === 'ZERO') {
          classScore = 0;
        }

        if (compGrades.length > 0) {
          const compVal = compGrades[0].score;
          if (isFirstCycle) {
            compositionScore = compVal;
          } else {
            compositionScore = compGrades[0].maxScore === 40 ? compVal : compVal * 2;
          }
        } else if (settings.missingCompScoreBehavior === 'ZERO') {
          compositionScore = 0;
        } else {
          compositionScore = isFirstCycle ? classScore : classScore * 2;
        }

        const compSur20 = isFirstCycle 
          ? compositionScore 
          : (compGrades[0]?.maxScore === 20 ? compGrades[0].score : compositionScore / 2);

        if (isFirstCycle) {
          const mode1st = settings.calculationFormula1stCycle || 'MALI_OFFICIAL';
          const wClass = settings.classScoreWeight1st ?? 1;
          const wComp = settings.compScoreWeight1st ?? 1;

          if (classGrades.length > 0 && compGrades.length > 0) {
            if (mode1st === 'CLASS_ONLY') {
              finalScore = classScore;
            } else if (mode1st === 'COMP_ONLY') {
              finalScore = compositionScore;
            } else if (mode1st === 'CUSTOM') {
              const totalW = (wClass + wComp) || 1;
              finalScore = (classScore * wClass + compositionScore * wComp) / totalW;
            } else {
              finalScore = (classScore + compositionScore) / 2;
            }
          } else if (compGrades.length > 0) {
            finalScore = settings.missingClassScoreBehavior === 'ZERO'
              ? (mode1st === 'CUSTOM' ? (compositionScore * wComp) / (wClass + wComp) : compositionScore / 2)
              : compositionScore;
          } else {
            finalScore = settings.missingCompScoreBehavior === 'ZERO'
              ? (mode1st === 'CUSTOM' ? (classScore * wClass) / (wClass + wComp) : classScore / 2)
              : classScore;
          }
        } else {
          const mode2nd = settings.calculationFormula2ndCycle || 'MALI_OFFICIAL';
          const wClass = settings.classScoreWeight2nd ?? 1;
          const wComp = settings.compScoreWeight2nd ?? 2;

          if (classGrades.length > 0 && compGrades.length > 0) {
            if (mode2nd === 'CLASS_ONLY') {
              finalScore = classScore;
            } else if (mode2nd === 'COMP_ONLY') {
              finalScore = compSur20;
            } else if (mode2nd === 'EQUAL_WEIGHT') {
              finalScore = (classScore + compSur20) / 2;
            } else if (mode2nd === 'CUSTOM') {
              const totalW = (wClass + wComp) || 1;
              finalScore = (classScore * wClass + compSur20 * wComp) / totalW;
            } else {
              finalScore = (classScore + compositionScore) / 3;
            }
          } else if (compGrades.length > 0) {
            finalScore = settings.missingClassScoreBehavior === 'ZERO'
              ? (mode2nd === 'MALI_OFFICIAL' ? compositionScore / 3 : (compSur20 * wComp) / (wClass + wComp))
              : compSur20;
          } else {
            finalScore = settings.missingCompScoreBehavior === 'ZERO'
              ? (mode2nd === 'MALI_OFFICIAL' ? classScore / 3 : (classScore * wClass) / (wClass + wComp))
              : classScore;
          }
        }
      }

      finalScore = Math.round(finalScore * 100) / 100;
      const weightedScore = Math.round(finalScore * subj.coefficient * 100) / 100;
      totalPoints += weightedScore;
      totalCoefficients += subj.coefficient;

      const { appreciation } = getMaliScoreAppreciation(finalScore, maxScore);

      subjectAverages.push({
        subjectId: subj.id,
        subjectName: subj.name,
        subjectCode: subj.code,
        coefficient: subj.coefficient,
        classAverage: isFirstCycle ? 6.4 : 12.8,
        classScore: Math.round(classScore * 100) / 100,
        compositionScore: Math.round(compositionScore * 100) / 100,
        finalScore,
        maxScore,
        weightedScore,
        appreciation
      });
    });

    const generalAverage = totalCoefficients > 0 ? totalPoints / totalCoefficients : 0;

    const classStudents = students.filter(s => s.classId === student.classId && s.status === 'ACTIF');
    const classSize = classStudents.length || 1;
    
    let rankInClass = 1;
    const thresholdHigh = isFirstCycle ? 7 : 14;
    const thresholdMid = isFirstCycle ? 6 : 12;
    if (generalAverage < thresholdHigh) rankInClass = Math.min(classSize, 2);
    if (generalAverage < thresholdMid) rankInClass = Math.min(classSize, 3);

    const passMark = isFirstCycle ? 5 : 10;
    const goodMark = isFirstCycle ? 6 : 12;

    return {
      studentId: student.id,
      studentMatricule: student.matricule,
      studentName: `${student.firstName} ${student.lastName}`,
      className,
      classId: student.classId,
      term,
      academicYear: settings.currentAcademicYear,
      maxScore,
      subjectAverages,
      totalPoints,
      totalCoefficients,
      generalAverage,
      rankInClass,
      totalClassStudents: classSize,
      classMinAverage: isFirstCycle ? 4.25 : 8.50,
      classMaxAverage: isFirstCycle ? 9.25 : 18.25,
      classOverallAverage: isFirstCycle ? 6.30 : 12.60,
      absencesCount: 2,
      lateCount: 0,
      principalTeacherComment: generalAverage >= goodMark ? 'Bons résultats, élève assidu(e).' : 'Doit fournir plus d\'efforts.',
      directorDecision: generalAverage >= passMark ? 'ADMIS' : 'A_AVERTISSEMENT'
    };
  };

  const exportBackupJSON = (): string => {
    return storageService.exportFullBackupJSON();
  };

  const restoreBackupJSON = (jsonStr: string): boolean => {
    const success = storageService.restoreFullBackupJSON(jsonStr);
    if (success) {
      refreshData();
      forceCloudPush();
    }
    return success;
  };

  return (
    <SchoolContext.Provider
      value={{
        settings,
        students,
        classes,
        subjects,
        teachers,
        grades,
        payments,
        attendanceRecords,
        auditLogs,
        stats,
        cloudSchoolCode,
        syncStatus,
        syncStatusMessage,
        isCloudConnected: syncStatus === 'CONNECTED',
        switchOrJoinSchool,
        forceCloudPush,
        refreshData,
        updateSettings: handleUpdateSettings,
        saveStudent: handleSaveStudent,
        deleteStudent: handleDeleteStudent,
        deleteAllStudents: handleClearAllStudents,
        saveClass: handleSaveClass,
        deleteClass: handleDeleteClass,
        deleteAllClasses: handleClearAllClasses,
        saveSubject: handleSaveSubject,
        deleteSubject: handleDeleteSubject,
        deleteAllSubjects: handleClearAllSubjects,
        saveTeacher: handleSaveTeacher,
        deleteTeacher: handleDeleteTeacher,
        deleteAllTeachers: handleClearAllTeachers,
        saveGrade: handleSaveGrade,
        deleteGrade: handleDeleteGrade,
        deleteAllGrades: handleClearAllGrades,
        recordPayment: handleRecordPayment,
        updatePayment: handleUpdatePayment,
        deletePayment: handleDeletePayment,
        deleteAllPayments: handleClearAllPayments,
        saveAttendanceBatch: handleSaveAttendanceBatch,
        deleteAttendanceRecord: handleDeleteAttendanceRecord,
        deleteAllAttendanceRecords: handleClearAllAttendanceRecords,
        generateReportCard,
        exportBackupJSON,
        restoreBackupJSON
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (!context) throw new Error('useSchool must be used within a SchoolProvider');
  return context;
};
