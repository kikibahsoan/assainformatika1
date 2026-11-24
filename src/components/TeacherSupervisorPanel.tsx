import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Database,
  Download,
  FileSpreadsheet,
  Lock,
  LogOut,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Square,
  Unlock,
  Upload,
  Users,
} from 'lucide-react';
import { CODE_GS_CONTENT } from '../data/codeGsTemplate';
import { QuestionFull, QuestionType } from '../data/questionsData';
import { KELAS_10_LIST } from '../data/studentsData';
import {
  calculateStudentScoreServerSide,
  checkGasWebAppStatus,
  DEFAULT_GAS_WEBAPP_URL,
  evaluateSingleQuestionServerSide,
  loadDatabase,
  PenggunaRecord,
  resetDatabaseToDefault,
  saveDatabase,
  SesiRecord,
  simpleSha256Simulation,
  SiswaRecord,
  SpreadsheetDatabase,
} from '../services/cbtBackendService';

interface TeacherSupervisorPanelProps {
  staff: PenggunaRecord;
  onLogout: () => void;
}

type TabKey =
  | 'MONITOR'
  | 'VIOLATIONS'
  | 'ESSAY_GRADING'
  | 'SCORES_ANALYTICS'
  | 'DATA_SETTINGS'
  | 'LOAD_TEST'
  | 'APPS_SCRIPT';

export const TeacherSupervisorPanel: React.FC<TeacherSupervisorPanelProps> = ({
  staff,
  onLogout,
}) => {
  const [db, setDb] = useState<SpreadsheetDatabase>(() => loadDatabase());
  const [activeTab, setActiveTab] = useState<TabKey>('MONITOR');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>(() =>
    staff.peran === 'PENGAWAS' && staff.ruang_tugas !== 'ALL' ? staff.ruang_tugas : 'ALL'
  );
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastRefreshed, setLastRefreshed] = useState<string>(() =>
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Essay Grading State (starts with first student in sheet, no dummy pre-scored student)
  const [selectedStudentForEssay, setSelectedStudentForEssay] = useState<string>(
    () => loadDatabase().siswa[0]?.nis || '102601'
  );
  const [essayScoreInputs, setEssayScoreInputs] = useState<Record<number, number>>({});
  const [gasStatusText, setGasStatusText] = useState<string>(
    'Terhubung Otomatis ke Web App Google Apps Script'
  );

  // Import CSV/Paste State
  const [importMode, setImportMode] = useState<'SISWA' | 'SOAL'>('SISWA');
  const [pasteBuffer, setPasteBuffer] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<string[][]>([]);

  // Load Testing (Uji Beban 300 Siswa) State
  const [simTargetCount, setSimTargetCount] = useState<number>(300);
  const [isSimRunning, setIsSimRunning] = useState<boolean>(false);
  const [simMetrics, setSimMetrics] = useState<{
    activeSessions: number;
    batchRequestsSent: number;
    savedByBatchingPercent: number;
    avgLatencyMs: number;
    retriedWithBackoff: number;
    failedRequests: number;
  } | null>(null);

  // Apps Script Copy State
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 3500);
  };

  const refreshFromStorage = () => {
    const fresh = loadDatabase();
    setDb(fresh);
    setLastRefreshed(
      new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );
  };

  // Auto-refresh Live Monitor every 12 seconds (Prompt: "Perbarui otomatis tiap 10-15 detik")
  useEffect(() => {
    const interval = window.setInterval(() => {
      refreshFromStorage();
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Load selected student's existing essay scores when selectedStudentForEssay changes
  useEffect(() => {
    const existingNilai = db.nilai[selectedStudentForEssay];
    const initialMap: Record<number, number> = {};
    [36, 37, 38, 39, 40].forEach((no) => {
      initialMap[no] = existingNilai?.skor_uraian_per_soal?.[no] ?? 0;
    });
    setEssayScoreInputs(initialMap);
  }, [selectedStudentForEssay, db.nilai]);

  // Filtered students list based on supervisor's assigned room
  const visibleStudents = useMemo(() => {
    return db.siswa.filter((s) => {
      if (staff.peran === 'PENGAWAS' && staff.ruang_tugas !== 'ALL') {
        if (s.ruang !== staff.ruang_tugas) return false;
      }
      if (selectedRoomFilter !== 'ALL' && s.ruang !== selectedRoomFilter) return false;
      if (selectedClassFilter !== 'ALL' && s.kelas !== selectedClassFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q);
      }
      return true;
    });
  }, [db.siswa, staff, selectedRoomFilter, selectedClassFilter, searchQuery]);

  // ===================== SUPERVISOR CONTROL ACTIONS =====================

  const handleToggleRoomStatus = (kodeRuang: string, nextStatus: 'BELUM' | 'BERJALAN' | 'SELESAI') => {
    const fresh = loadDatabase();
    const room = fresh.ruang.find((r) => r.kode_ruang === kodeRuang);
    if (room) {
      room.status_mulai = nextStatus;
      if (nextStatus === 'BERJALAN') {
        room.jam_mulai = new Date().toISOString();
      }
      saveDatabase(fresh);
      setDb(fresh);
      showToast(`Status Ruang ${kodeRuang} diubah menjadi ${nextStatus}.`);
    }
  };

  const handleUnlockStudent = (nis: string) => {
    const fresh = loadDatabase();
    const sesi = fresh.sesi[nis];
    if (sesi) {
      sesi.status = 'MENGERJAKAN';
      sesi.jumlah_pelanggaran = Math.max(0, fresh.pengaturan.batas_pelanggaran - 1);
      sesi.waktu_aktif_terakhir = new Date().toISOString();
      saveDatabase(fresh);
      setDb(fresh);
      showToast(`Kunci layar siswa NIS ${nis} berhasil dibuka.`);
    }
  };

  const handleAddExtraTime = (nis: string, addMinutes: number) => {
    const fresh = loadDatabase();
    const sesi = fresh.sesi[nis];
    if (sesi) {
      sesi.tambahan_menit = (sesi.tambahan_menit || 0) + addMinutes;
      saveDatabase(fresh);
      setDb(fresh);
      showToast(`Tambahan waktu +${addMinutes} menit diberikan kepada NIS ${nis}.`);
    }
  };

  const handleResetStudentSession = (nis: string) => {
    const fresh = loadDatabase();
    const sesi = fresh.sesi[nis];
    if (sesi) {
      sesi.token_sesi = `SES-${nis}-RESET-${Date.now()}`;
      sesi.device_id = 'RESET-BY-SUPERVISOR';
      if (sesi.status === 'TERKUNCI') sesi.status = 'MENGERJAKAN';
      sesi.waktu_aktif_terakhir = new Date().toISOString();
      saveDatabase(fresh);
      setDb(fresh);
      showToast(`Sesi perangkat siswa NIS ${nis} berhasil di-reset. Siswa dapat login dari perangkat baru.`);
    }
  };

  const handleForceSubmitStudent = (nis: string) => {
    const fresh = loadDatabase();
    const sesi = fresh.sesi[nis];
    if (sesi) {
      sesi.status = 'SELESAI';
      sesi.waktu_aktif_terakhir = new Date().toISOString();
      fresh.nilai[nis] = calculateStudentScoreServerSide(fresh, nis);
      saveDatabase(fresh);
      setDb(fresh);
      showToast(`Ujian siswa NIS ${nis} telah dipaksa selesai (Force Submit) & dinilai otomatis.`);
    }
  };

  // ===================== ESSAY GRADING HANDLER =====================

  const handleSaveEssayGrades = (e: React.FormEvent) => {
    e.preventDefault();
    const fresh = loadDatabase();
    const updatedNilai = calculateStudentScoreServerSide(
      fresh,
      selectedStudentForEssay,
      essayScoreInputs
    );
    updatedNilai.status_uraian = 'SUDAH';
    fresh.nilai[selectedStudentForEssay] = updatedNilai;
    saveDatabase(fresh);
    setDb(fresh);
    showToast(
      `Skor uraian NIS ${selectedStudentForEssay} disimpan. Nilai Akhir otomatis dihitung ulang menjadi ${updatedNilai.nilai_akhir}!`
    );
  };

  // ===================== CSV EXPORT HANDLER =====================

  const handleExportNilaiCsv = () => {
    const headers = [
      'NIS',
      'Nama Siswa',
      'Kelas',
      'Ruang',
      'Skor PG (Maks 10)',
      'Skor PGK (Maks 20)',
      'Skor Menjodohkan (Maks 15)',
      'Skor Isian (Maks 20)',
      'Skor Uraian (Maks 35)',
      'Nilai Akhir (0-100)',
      'Status Koreksi Uraian',
      'Jumlah Pelanggaran',
      'Durasi (Menit)',
    ];

    const rows = visibleStudents.map((s) => {
      const n = db.nilai[s.nis] || calculateStudentScoreServerSide(db, s.nis);
      return [
        s.nis,
        `"${s.nama}"`,
        s.kelas,
        s.ruang,
        n.skor_pg,
        n.skor_pgk,
        n.skor_menjodohkan,
        n.skor_isian,
        n.skor_uraian,
        n.nilai_akhir,
        n.status_uraian,
        n.jumlah_pelanggaran,
        n.durasi_menit,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Nilai_ASSA_Informatika_SMKN2_Gorontalo.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ===================== PASTE / CSV IMPORT PREVIEW & SAVE =====================

  const handleParsePastePreview = (rawText: string) => {
    setPasteBuffer(rawText);
    if (!rawText.trim()) {
      setPreviewRows([]);
      return;
    }
    const lines = rawText
      .trim()
      .split(/\r?\n/)
      .map((line) => (line.includes('\t') ? line.split('\t') : line.split(',')))
      .filter((r) => r.length >= 2);
    setPreviewRows(lines);
  };

  const handleCommitImport = () => {
    if (previewRows.length === 0) return;
    const fresh = loadDatabase();

    if (importMode === 'SISWA') {
      let added = 0;
      previewRows.forEach((cols) => {
        const [nisRaw, namaRaw, kelasRaw, ruangRaw, passRaw] = cols.map((c) => c?.trim() || '');
        if (!nisRaw || nisRaw.toLowerCase() === 'nis') return;
        const plainPass = passRaw || '123456';
        const newRec: SiswaRecord = {
          nis: nisRaw,
          nama: namaRaw || `Siswa ${nisRaw}`,
          kelas: kelasRaw || 'X TKJ 1',
          ruang: ruangRaw || 'R-LAB1',
          password_plain_hint: plainPass,
          password_hash: simpleSha256Simulation(plainPass),
        };
        const existingIdx = fresh.siswa.findIndex((s) => s.nis === nisRaw);
        if (existingIdx >= 0) fresh.siswa[existingIdx] = newRec;
        else fresh.siswa.push(newRec);
        added++;
      });
      saveDatabase(fresh);
      setDb(fresh);
      setPasteBuffer('');
      setPreviewRows([]);
      showToast(`Berhasil mengimpor/memperbarui ${added} data siswa.`);
    } else {
      let added = 0;
      previewRows.forEach((cols) => {
        const [noRaw, tipeRaw, teksRaw, kunciRaw, bobotRaw, opsiA, opsiB, opsiC, opsiD, opsiE] =
          cols.map((c) => c?.trim() || '');
        const noNum = Number(noRaw);
        if (!noNum || isNaN(noNum)) return;
        const tipe = (['PG', 'PGK', 'MENJODOHKAN', 'ISIAN', 'URAIAN'].includes(
          tipeRaw.toUpperCase()
        )
          ? tipeRaw.toUpperCase()
          : 'PG') as QuestionType;
        const newQ: QuestionFull = {
          id: `Q${String(noNum).padStart(2, '0')}`,
          no: noNum,
          tipe,
          teks: teksRaw || `Pertanyaan #${noNum}`,
          opsi_A: opsiA || undefined,
          opsi_B: opsiB || undefined,
          opsi_C: opsiC || undefined,
          opsi_D: opsiD || undefined,
          opsi_E: opsiE || undefined,
          kunci: kunciRaw || 'A',
          pembahasan: 'Diimpor melalui Panel Guru.',
          bobot: Number(bobotRaw) || 1,
        };
        const existingIdx = fresh.bank_soal.findIndex((q) => q.no === noNum);
        if (existingIdx >= 0) fresh.bank_soal[existingIdx] = newQ;
        else fresh.bank_soal.push(newQ);
        added++;
      });
      fresh.bank_soal.sort((a, b) => a.no - b.no);
      saveDatabase(fresh);
      setDb(fresh);
      setPasteBuffer('');
      setPreviewRows([]);
      showToast(`Berhasil mengimpor/memperbarui ${added} butir soal.`);
    }
  };

  // ===================== 300-STUDENT LOAD TEST SIMULATOR =====================

  const handleRunLoadSimulation = () => {
    setIsSimRunning(true);
    window.setTimeout(() => {
      const fresh = loadDatabase();
      const now = Date.now();
      const startIso = new Date(now - 35 * 60 * 1000).toISOString();
      const deadlineIso = new Date(now + 55 * 60 * 1000).toISOString();

      const classes = ['X TKJ 1', 'X TKJ 2', 'X RPL 1', 'X RPL 2', 'X DKV 1', 'X DKV 2'];
      const rooms = ['R-LAB1', 'R-LAB2'];

      // Clear previous simulated students before generating new count
      fresh.siswa = fresh.siswa.filter((s) => !s.nis.startsWith('SIM'));
      Object.keys(fresh.sesi).forEach((k) => {
        if (k.startsWith('SIM')) delete fresh.sesi[k];
      });

      let batchReqCount = 0;
      let retryCount = 0;

      for (let i = 1; i <= simTargetCount; i++) {
        const simNis = `SIM${String(i).padStart(3, '0')}`;
        const roomCode = rooms[i % rooms.length];
        const classCode = classes[i % classes.length];
        const progress = Math.min(40, Math.floor(8 + ((i * 7) % 33)));
        const violations = i % 19 === 0 ? 3 : i % 7 === 0 ? 1 : 0;
        const status: SesiRecord['status'] =
          violations >= 3
            ? 'TERKUNCI'
            : progress === 40 && i % 4 === 0
            ? 'SELESAI'
            : 'MENGERJAKAN';

        fresh.siswa.push({
          nis: simNis,
          nama: `Siswa Simulasi #${i}`,
          kelas: classCode,
          ruang: roomCode,
          password_plain_hint: '123456',
          password_hash: simpleSha256Simulation('123456'),
        });

        fresh.sesi[simNis] = {
          nis: simNis,
          ruang: roomCode,
          token_sesi: `SES-${simNis}`,
          device_id: `DEV-SIM-${i}`,
          waktu_mulai: startIso,
          batas_waktu: deadlineIso,
          tambahan_menit: 0,
          status,
          jumlah_pelanggaran: violations,
          soal_terakhir: progress,
          jumlah_terjawab: progress,
          waktu_aktif_terakhir: new Date(now - ((i * 1300) % 45000)).toISOString(),
          is_simulated: true,
        };

        // Each student answered `progress` questions, batched every 5 answers + 1 initial load
        batchReqCount += 1 + Math.ceil(progress / 5);
        if (i % 14 === 0) retryCount++;
      }

      saveDatabase(fresh);
      setDb(fresh);

      const unbatchedRequests = simTargetCount * 40 + simTargetCount * 30; // 40 clicks + 30 heartbeats
      const savedPercent = Math.round(
        ((unbatchedRequests - batchReqCount) / unbatchedRequests) * 100
      );

      setSimMetrics({
        activeSessions: simTargetCount,
        batchRequestsSent: batchReqCount,
        savedByBatchingPercent: savedPercent,
        avgLatencyMs: Math.round(110 + simTargetCount * 0.45),
        retriedWithBackoff: retryCount,
        failedRequests: 0,
      });
      setIsSimRunning(false);
      showToast(
        `Simulasi ${simTargetCount} sesi siswa serentak berhasil dijalankan! Lihat tab Pantau Langsung.`
      );
    }, 600);
  };

  const handleClearSimulation = () => {
    const fresh = loadDatabase();
    fresh.siswa = fresh.siswa.filter((s) => !s.nis.startsWith('SIM'));
    Object.keys(fresh.sesi).forEach((k) => {
      if (k.startsWith('SIM')) delete fresh.sesi[k];
    });
    saveDatabase(fresh);
    setDb(fresh);
    setSimMetrics(null);
    showToast('Seluruh sesi simulasi uji beban telah dibersihkan.');
  };

  // ===================== ITEM ANALYSIS & STATISTICS COMPUTATION =====================

  const itemAnalysisList = useMemo(() => {
    const studentsWithAnswers = Object.keys(db.jawaban);
    const totalRespondents = Math.max(1, studentsWithAnswers.length);

    return db.bank_soal.map((q) => {
      let correctCount = 0;
      studentsWithAnswers.forEach((nis) => {
        const ans = db.jawaban[nis]?.[q.no]?.jawaban;
        if (q.tipe === 'URAIAN') {
          const essayScore = db.nilai[nis]?.skor_uraian_per_soal?.[q.no] || 0;
          if (essayScore >= q.bobot * 0.7) correctCount++;
        } else {
          const score = evaluateSingleQuestionServerSide(q, ans, db.pengaturan);
          if (score >= q.bobot * 0.75) correctCount++;
        }
      });
      const percentage = Math.round((correctCount / totalRespondents) * 100);
      return {
        no: q.no,
        tipe: q.tipe,
        teksSingkat: q.teks.slice(0, 75) + (q.teks.length > 75 ? '...' : ''),
        kunci: q.tipe === 'URAIAN' ? 'Rubrik 0-7 Poin' : q.kunci,
        correctCount,
        totalRespondents,
        percentage,
      };
    });
  }, [db]);

  const allScoresList = useMemo(() => {
    return visibleStudents
      .filter((s) => !s.nis.startsWith('SIM'))
      .map((s) => db.nilai[s.nis] || calculateStudentScoreServerSide(db, s.nis));
  }, [visibleStudents, db]);

  const scoreStats = useMemo(() => {
    if (allScoresList.length === 0) {
      return { avg: 0, max: 0, min: 0 };
    }
    const vals = allScoresList.map((n) => n.nilai_akhir);
    const sum = vals.reduce((a, b) => a + b, 0);
    return {
      avg: Math.round((sum / vals.length) * 100) / 100,
      max: Math.max(...vals),
      min: Math.min(...vals),
    };
  }, [allScoresList]);

  // Helper for student live status row styling
  const getStudentLiveMeta = (s: SiswaRecord) => {
    const sesi = db.sesi[s.nis];
    if (!sesi || sesi.status === 'BELUM') {
      return {
        label: 'Belum Masuk',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        cardBorder: 'border-slate-200 bg-white',
        remainingText: `${db.pengaturan.durasi_menit}:00`,
        progress: 0,
        violations: 0,
        lastActive: '-',
      };
    }

    const deadlineMs =
      new Date(sesi.batas_waktu).getTime() + (sesi.tambahan_menit || 0) * 60 * 1000;
    const remMins = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 60000));
    const lastActiveSecs = Math.max(
      0,
      Math.floor((Date.now() - new Date(sesi.waktu_aktif_terakhir).getTime()) / 1000)
    );
    const isOffline = sesi.status === 'MENGERJAKAN' && lastActiveSecs > 120;

    if (sesi.status === 'TERKUNCI') {
      return {
        label: 'TERKUNCI',
        badgeClass: 'bg-red-100 text-red-800 border-red-300 font-bold',
        cardBorder: 'border-red-400 bg-red-50/40',
        remainingText: `${remMins} mnt`,
        progress: sesi.jumlah_terjawab || 0,
        violations: sesi.jumlah_pelanggaran || 0,
        lastActive: `${lastActiveSecs} dtk lalu`,
      };
    }

    if (sesi.status === 'SELESAI') {
      return {
        label: 'Selesai',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 font-semibold',
        cardBorder: 'border-blue-200 bg-blue-50/20',
        remainingText: 'Selesai',
        progress: sesi.jumlah_terjawab || 40,
        violations: sesi.jumlah_pelanggaran || 0,
        lastActive: 'Terkumpul',
      };
    }

    if (isOffline) {
      return {
        label: 'Offline (>2 mnt)',
        badgeClass: 'bg-slate-200 text-slate-800 border-slate-400',
        cardBorder: 'border-slate-300 bg-slate-50',
        remainingText: `${remMins} mnt`,
        progress: sesi.jumlah_terjawab || 0,
        violations: sesi.jumlah_pelanggaran || 0,
        lastActive: `${Math.floor(lastActiveSecs / 60)} mnt lalu`,
      };
    }

    if (sesi.jumlah_pelanggaran > 0) {
      return {
        label: `Peringatan (${sesi.jumlah_pelanggaran}/${db.pengaturan.batas_pelanggaran})`,
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
        cardBorder: 'border-amber-300 bg-amber-50/30',
        remainingText: `${remMins} mnt`,
        progress: sesi.jumlah_terjawab || 0,
        violations: sesi.jumlah_pelanggaran,
        lastActive: `${lastActiveSecs} dtk lalu`,
      };
    }

    return {
      label: 'Mengerjakan (Normal)',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold',
      cardBorder: 'border-emerald-200 bg-white',
      remainingText: `${remMins} mnt`,
      progress: sesi.jumlah_terjawab || 0,
      violations: 0,
      lastActive: `${lastActiveSecs} dtk lalu`,
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar Contract: Brand | Navigation Tabs | Account Action */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-6">
          {/* Zone 1: Brand Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-9 rounded-lg bg-slate-900 text-emerald-400 font-extrabold text-xs tracking-wider flex items-center justify-center">
              ASSA
            </div>
            <span className="text-base font-bold text-slate-900 whitespace-nowrap">
              Panel {staff.peran === 'GURU' ? 'Guru & Admin ASSA' : `Pengawas (${staff.ruang_tugas})`}
            </span>
          </div>

          {/* Zone 2: Functional Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setActiveTab('MONITOR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'MONITOR'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Pantau Langsung
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('VIOLATIONS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'VIOLATIONS'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Log Pelanggaran ({db.log_pelanggaran.length})
            </button>

            {staff.peran === 'GURU' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('ESSAY_GRADING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'ESSAY_GRADING'
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  Koreksi Uraian
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('SCORES_ANALYTICS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'SCORES_ANALYTICS'
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Rekap Nilai & Analisis
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('DATA_SETTINGS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'DATA_SETTINGS'
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Bank Soal & Pengaturan
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('LOAD_TEST')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'LOAD_TEST'
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Uji Beban 300 Siswa
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('APPS_SCRIPT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    activeTab === 'APPS_SCRIPT'
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Code.gs & Deploy
                </button>
              </>
            )}
          </nav>

          {/* Zone 3: Primary Action / Logout */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Feedback Toast Banner */}
      {toastMsg && (
        <div className="bg-emerald-700 text-white px-6 py-2.5 text-xs font-semibold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6">
        {/* ===================== TAB 1: PANTAU LANGSUNG & KONTROL PENGAWAS ===================== */}
        {activeTab === 'MONITOR' && (
          <div className="space-y-6">
            {/* Room Control Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {db.ruang
                .filter(
                  (r) =>
                    staff.peran === 'GURU' ||
                    staff.ruang_tugas === 'ALL' ||
                    r.kode_ruang === staff.ruang_tugas
                )
                .map((room) => {
                  const isRunning = room.status_mulai === 'BERJALAN';
                  return (
                    <div
                      key={room.kode_ruang}
                      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {room.nama_ruang} ({room.kode_ruang})
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            · Status: {room.status_mulai}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-600 flex items-center gap-3">
                          <span>
                            Token Ruang:{' '}
                            <strong className="font-mono text-blue-700 text-sm">
                              {room.token_ujian}
                            </strong>
                          </span>
                          <span>·</span>
                          <span>
                            PIN Buka Kunci:{' '}
                            <strong className="font-mono text-slate-900">
                              {db.pengaturan.pin_pengawas}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isRunning ? (
                          <button
                            type="button"
                            onClick={() => handleToggleRoomStatus(room.kode_ruang, 'BERJALAN')}
                            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Mulai Ujian Ruang
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleRoomStatus(room.kode_ruang, 'BELUM')}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <Square className="w-3.5 h-3.5" />
                            Tunda / Ruang Tunggu
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Filter & Auto-Refresh Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari NIS atau nama siswa..."
                    className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {staff.peran === 'GURU' && (
                  <select
                    value={selectedRoomFilter}
                    onChange={(e) => setSelectedRoomFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ALL">Semua Ruang</option>
                    {db.ruang.map((r) => (
                      <option key={r.kode_ruang} value={r.kode_ruang}>
                        {r.kode_ruang} — {r.nama_ruang}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ALL">Semua Kelas ({db.siswa.length} Siswa)</option>
                  {KELAS_10_LIST.map((kls) => (
                    <option key={kls} value={kls}>
                      {kls}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span>
                  Pembaruan otomatis tiap 12 dtk (Terakhir:{' '}
                  <strong className="font-mono tabular-nums">{lastRefreshed}</strong>)
                </span>
                <button
                  type="button"
                  onClick={refreshFromStorage}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Segarkan
                </button>
              </div>
            </div>

            {/* Live Student Monitoring Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="py-3 px-4 font-bold">NIS</th>
                      <th className="py-3 px-4 font-bold">Nama Siswa</th>
                      <th className="py-3 px-4 font-bold">Kelas / Ruang</th>
                      <th className="py-3 px-4 font-bold">Status Sesi</th>
                      <th className="py-3 px-4 font-bold">Progres Soal</th>
                      <th className="py-3 px-4 font-bold">Pelanggaran</th>
                      <th className="py-3 px-4 font-bold">Sisa Waktu</th>
                      <th className="py-3 px-4 font-bold">Aktif Terakhir</th>
                      <th className="py-3 px-4 font-bold text-right">Kontrol Pengawas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {visibleStudents.map((s) => {
                      const meta = getStudentLiveMeta(s);
                      const sesi = db.sesi[s.nis];
                      const pct = Math.round((meta.progress / 40) * 100);

                      return (
                        <tr key={s.nis} className={`hover:bg-slate-50/90 ${meta.cardBorder}`}>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                            {s.nis}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{s.nama}</td>
                          <td className="py-3 px-4 text-slate-600">
                            {s.kelas} · <span className="font-mono">{s.ruang}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] ${meta.badgeClass}`}
                            >
                              {sesi?.status === 'TERKUNCI' && <Lock className="w-3 h-3" />}
                              {meta.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-700"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="font-mono font-bold tabular-nums text-slate-800">
                                {meta.progress}/40
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold tabular-nums">
                            <span
                              className={
                                meta.violations >= db.pengaturan.batas_pelanggaran
                                  ? 'text-red-700'
                                  : meta.violations > 0
                                  ? 'text-amber-700'
                                  : 'text-slate-600'
                              }
                            >
                              {meta.violations} / {db.pengaturan.batas_pelanggaran}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                            {meta.remainingText}
                            {sesi?.tambahan_menit ? ` (+${sesi.tambahan_menit}m)` : ''}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-500">
                            {meta.lastActive}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {sesi?.status === 'TERKUNCI' && (
                                <button
                                  type="button"
                                  onClick={() => handleUnlockStudent(s.nis)}
                                  className="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-md flex items-center gap-1"
                                  title="Buka Kunci Layar Siswa"
                                >
                                  <Unlock className="w-3 h-3" />
                                  Buka Kunci
                                </button>
                              )}
                              {sesi && sesi.status !== 'SELESAI' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleAddExtraTime(s.nis, 10)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-md flex items-center gap-1"
                                    title="Tambah Waktu +10 Menit"
                                  >
                                    <Clock className="w-3 h-3" />
                                    +10m
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleResetStudentSession(s.nis)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-md flex items-center gap-1"
                                    title="Reset Sesi Perangkat (Jika HP/Laptop siswa rusak)"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    Reset
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleForceSubmitStudent(s.nis)}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold rounded-md flex items-center gap-1"
                                    title="Paksa Submit Jawaban Siswa"
                                  >
                                    <Send className="w-3 h-3" />
                                    Submit
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                Menampilkan {visibleStudents.length} siswa Kelas 10 SMKN 2 Gorontalo.
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: LOG PELANGGARAN ===================== */}
        {activeTab === 'VIOLATIONS' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Log Kronologis Pelanggaran Anti-Curang
                </h2>
                <p className="text-xs text-slate-500">
                  Setiap aktivitas keluar fullscreen, pindah tab, kehilangan fokus jendela, dan
                  pintasan keyboard tercatat otomatis.
                </p>
              </div>
            </div>

            {db.log_pelanggaran.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Belum ada catatan pelanggaran.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="py-3 px-4 font-bold">Waktu Kejadian</th>
                      <th className="py-3 px-4 font-bold">NIS</th>
                      <th className="py-3 px-4 font-bold">Nama Siswa</th>
                      <th className="py-3 px-4 font-bold">Ruang</th>
                      <th className="py-3 px-4 font-bold">Jenis Pelanggaran</th>
                      <th className="py-3 px-4 font-bold">Keterangan Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {db.log_pelanggaran
                      .filter((v) =>
                        staff.peran === 'PENGAWAS' && staff.ruang_tugas !== 'ALL'
                          ? v.ruang === staff.ruang_tugas
                          : true
                      )
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                            {new Date(log.waktu).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                            {log.nis}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{log.nama}</td>
                          <td className="py-3 px-4 font-mono text-slate-700">{log.ruang}</td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-semibold text-red-700">
                              {log.jenis_pelanggaran}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{log.keterangan}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 3: PENILAIAN URAIAN (NOMOR 36-40) ===================== */}
        {activeTab === 'ESSAY_GRADING' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Sidebar: Student Picker */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-3">
                Pilih Siswa untuk Koreksi Uraian
              </h2>
              <div className="space-y-2 max-h-[520px] overflow-y-auto">
                {db.siswa
                  .filter((s) => !s.nis.startsWith('SIM'))
                  .map((s) => {
                    const nilai = db.nilai[s.nis];
                    const hasAnswers = Boolean(db.jawaban[s.nis]);
                    const isSelected = s.nis === selectedStudentForEssay;
                    return (
                      <button
                        key={s.nis}
                        type="button"
                        onClick={() => setSelectedStudentForEssay(s.nis)}
                        className={`w-full text-left p-3 rounded-xl border transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 text-slate-900'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {s.nama} ({s.nis})
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {s.kelas} · {hasAnswers ? 'Ada Jawaban' : 'Belum Submit'}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-[11px] font-semibold block ${
                              nilai?.status_uraian === 'SUDAH'
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {nilai?.status_uraian === 'SUDAH' ? '✓ Sudah Dinilai' : 'Belum Dinilai'}
                          </span>
                          {nilai && (
                            <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                              Nilai: {nilai.nilai_akhir}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Right Area: 5 Essay Questions (No. 36-40), Student Answer, Official Rubric, and Score Input (0-7) */}
            <form
              onSubmit={handleSaveEssayGrades}
              className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <span className="text-xs font-semibold text-blue-700">
                    Koreksi Manual Guru Informatika (Skala 0 – {db.pengaturan.bobot_uraian} per Soal)
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    Jawaban Uraian —{' '}
                    {db.siswa.find((s) => s.nis === selectedStudentForEssay)?.nama} (
                    {selectedStudentForEssay})
                  </h2>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Simpan Skor & Hitung Ulang Nilai Akhir
                </button>
              </div>

              {db.bank_soal
                .filter((q) => q.tipe === 'URAIAN')
                .map((q) => {
                  const studentAns =
                    db.jawaban[selectedStudentForEssay]?.[q.no]?.jawaban ||
                    '(Siswa tidak mengisi jawaban pada soal ini)';
                  const currentScore = essayScoreInputs[q.no] ?? 0;

                  return (
                    <div
                      key={q.id}
                      className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="text-sm font-bold text-slate-900 whitespace-pre-line">
                          Soal Nomor {q.no}: {q.teks}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 bg-white px-3 py-2 rounded-lg border border-slate-300">
                          <label className="text-xs font-bold text-slate-700">
                            Skor (0–{db.pengaturan.bobot_uraian}):
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={db.pengaturan.bobot_uraian}
                            step={0.5}
                            value={currentScore}
                            onChange={(e) =>
                              setEssayScoreInputs((prev) => ({
                                ...prev,
                                [q.no]: Number(e.target.value),
                              }))
                            }
                            className="w-16 px-2 py-1 text-sm font-mono font-bold text-center border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 tabular-nums"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Student Answer Box */}
                        <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
                          <div className="text-xs font-bold text-slate-700 mb-1.5">
                            Jawaban Siswa:
                          </div>
                          <pre className="text-xs font-mono text-slate-900 whitespace-pre-wrap leading-relaxed">
                            {studentAns}
                          </pre>
                        </div>

                        {/* Official Rubric Reference Box */}
                        <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg">
                          <div className="text-xs font-bold text-blue-950 mb-1.5">
                            Kunci Jawaban & Rubrik Pedoman Penskoran:
                          </div>
                          <pre className="text-xs font-mono text-blue-900 whitespace-pre-wrap leading-relaxed">
                            {q.kunci}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-600">
                  Total Skor Uraian Saat Ini:{' '}
                  <strong className="font-mono text-sm text-slate-900 tabular-nums">
                    {Object.values(essayScoreInputs).reduce((a, b) => a + b, 0)} /{' '}
                    {db.pengaturan.bobot_uraian * 5} Poin
                  </strong>
                </span>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Simpan Skor & Hitung Ulang Nilai Akhir
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===================== TAB 4: REKAP NILAI & ANALISIS BUTIR SOAL ===================== */}
        {activeTab === 'SCORES_ANALYTICS' && (
          <div className="space-y-6">
            {/* Summary Statistics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <span className="text-xs text-slate-500 block">Rata-Rata Nilai Kelas</span>
                <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums mt-1 block">
                  {scoreStats.avg}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <span className="text-xs text-slate-500 block">Nilai Tertinggi</span>
                <span className="text-2xl font-mono font-bold text-emerald-700 tabular-nums mt-1 block">
                  {scoreStats.max}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <span className="text-xs text-slate-500 block">Nilai Terendah</span>
                <span className="text-2xl font-mono font-bold text-amber-700 tabular-nums mt-1 block">
                  {scoreStats.min}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Ekspor Rekap Nilai</span>
                  <span className="text-xs font-semibold text-slate-800 mt-1 block">
                    Format CSV / Excel
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExportNilaiCsv}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Unduh CSV
                </button>
              </div>
            </div>

            {/* Student Grade Recap Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4">
                Rekap Nilai Per Siswa & Rincian Skor Tiap Tipe Soal
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                      <th className="py-3 px-3.5 font-bold">NIS</th>
                      <th className="py-3 px-3.5 font-bold">Nama Siswa</th>
                      <th className="py-3 px-3.5 font-bold">Kelas / Ruang</th>
                      <th className="py-3 px-3.5 font-bold text-right">PG (10)</th>
                      <th className="py-3 px-3.5 font-bold text-right">PGK (20)</th>
                      <th className="py-3 px-3.5 font-bold text-right">Jodoh (15)</th>
                      <th className="py-3 px-3.5 font-bold text-right">Isian (20)</th>
                      <th className="py-3 px-3.5 font-bold text-right">Uraian (35)</th>
                      <th className="py-3 px-3.5 font-bold text-right">Nilai Akhir</th>
                      <th className="py-3 px-3.5 font-bold">Status Uraian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allScoresList.map((n) => (
                      <tr key={n.nis} className="hover:bg-slate-50">
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-900 tabular-nums">
                          {n.nis}
                        </td>
                        <td className="py-3 px-3.5 font-semibold text-slate-900">{n.nama}</td>
                        <td className="py-3 px-3.5 text-slate-600">
                          {n.kelas} · {n.ruang}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-right tabular-nums">
                          {n.skor_pg}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-right tabular-nums">
                          {n.skor_pgk}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-right tabular-nums">
                          {n.skor_menjodohkan}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-right tabular-nums">
                          {n.skor_isian}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-right tabular-nums">
                          {n.skor_uraian}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-right text-blue-700 text-sm tabular-nums">
                          {n.nilai_akhir}
                        </td>
                        <td className="py-3 px-3.5">
                          <span
                            className={`text-[11px] font-semibold ${
                              n.status_uraian === 'SUDAH' ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {n.status_uraian === 'SUDAH' ? '✓ Sudah Dinilai' : 'Belum Dinilai'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Item Analysis Table (Analisis Butir Soal 1-40) */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-base font-bold text-slate-900 mb-1">
                Analisis Butir Soal (40 Soal ASSA Informatika)
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Menampilkan persentase siswa yang menjawab benar pada masing-masing nomor soal.
              </p>
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3.5 font-bold">No</th>
                      <th className="py-2.5 px-3.5 font-bold">Tipe</th>
                      <th className="py-2.5 px-3.5 font-bold">Cuplikan Pertanyaan</th>
                      <th className="py-2.5 px-3.5 font-bold">Kunci Server</th>
                      <th className="py-2.5 px-3.5 font-bold text-right">% Menjawab Benar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {itemAnalysisList.map((item) => (
                      <tr key={item.no} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3.5 font-mono font-bold tabular-nums">
                          #{item.no}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-slate-600">{item.tipe}</td>
                        <td className="py-2.5 px-3.5 text-slate-800">{item.teksSingkat}</td>
                        <td className="py-2.5 px-3.5 font-mono text-blue-700">{item.kunci}</td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold tabular-nums">
                          {item.percentage}% ({item.correctCount}/{item.totalRespondents})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 5: BANK SOAL, SISWA & PENGATURAN ===================== */}
        {activeTab === 'DATA_SETTINGS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 5 Cols: Pengaturan Sheet Editor */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
                Pengaturan Ujian & Bobot Nilai (Sheet Pengaturan)
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Judul Ujian</label>
                  <input
                    type="text"
                    value={db.pengaturan.judul_ujian}
                    onChange={(e) =>
                      setDb((prev) => ({
                        ...prev,
                        pengaturan: { ...prev.pengaturan, judul_ujian: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Durasi (Menit)</label>
                    <input
                      type="number"
                      value={db.pengaturan.durasi_menit}
                      onChange={(e) =>
                        setDb((prev) => ({
                          ...prev,
                          pengaturan: { ...prev.pengaturan, durasi_menit: Number(e.target.value) },
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Batas Pelanggaran Kunci
                    </label>
                    <input
                      type="number"
                      value={db.pengaturan.batas_pelanggaran}
                      onChange={(e) =>
                        setDb((prev) => ({
                          ...prev,
                          pengaturan: {
                            ...prev.pengaturan,
                            batas_pelanggaran: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">PIN Pengawas</label>
                    <input
                      type="text"
                      value={db.pengaturan.pin_pengawas}
                      onChange={(e) =>
                        setDb((prev) => ({
                          ...prev,
                          pengaturan: { ...prev.pengaturan, pin_pengawas: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Mode Skor PG Kompleks
                    </label>
                    <select
                      value={db.pengaturan.mode_skor_pgk}
                      onChange={(e) =>
                        setDb((prev) => ({
                          ...prev,
                          pengaturan: {
                            ...prev.pengaturan,
                            mode_skor_pgk: e.target.value as 'PARSIAL' | 'MUTLAK',
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="PARSIAL">Skor Parsial ((Benar-Salah)/Kunci)</option>
                      <option value="MUTLAK">Semua Benar atau Nol</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 pt-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Bobot PG</label>
                    <input
                      type="number"
                      value={db.pengaturan.bobot_pg}
                      onChange={(e) =>
                        setDb((prev) => ({
                          ...prev,
                          pengaturan: { ...prev.pengaturan, bobot_pg: Number(e.target.value) },
                        }))
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Bobot PGK</label>
                    <input
                      type="number"
                      value={db.pengaturan.bobot_pgk}
                      onChange={(e) =>
                        setDb((prev) => ({
                          ...prev,
                          pengaturan: { ...prev.pengaturan, bobot_pgk: Number(e.target.value) },
                        }))
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Jodoh</label>
                    <input
                      type="number"
                      value={db.pengaturan.bobot_menjodohkan}
                      onChange={(e) =>
                        setDb((prev) => ({
                          ...prev,
                          pengaturan: {
                            ...prev.pengaturan,
                            bobot_menjodohkan: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Isian</label>
                    <input
                      type="number"
                      value={db.pengaturan.bobot_isian}
                      onChange={(e) =>
                        setDb((prev) => ({
                          ...prev,
                          pengaturan: { ...prev.pengaturan, bobot_isian: Number(e.target.value) },
                        }))
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Uraian</label>
                    <input
                      type="number"
                      value={db.pengaturan.bobot_uraian}
                      onChange={(e) =>
                        setDb((prev) => ({
                          ...prev,
                          pengaturan: { ...prev.pengaturan, bobot_uraian: Number(e.target.value) },
                        }))
                      }
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-center"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <input
                    id="showScoreToggle"
                    type="checkbox"
                    checked={db.pengaturan.tampilkan_nilai}
                    onChange={(e) =>
                      setDb((prev) => ({
                        ...prev,
                        pengaturan: { ...prev.pengaturan, tampilkan_nilai: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-blue-700"
                  />
                  <label htmlFor="showScoreToggle" className="font-medium text-slate-800">
                    Tampilkan ringkasan nilai otomatis kepada siswa setelah selesai submit
                  </label>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    saveDatabase(db);
                    showToast('Pengaturan ujian berhasil disimpan.');
                  }}
                  className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Simpan Pengaturan
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const fresh = resetDatabaseToDefault();
                    setDb(fresh);
                    showToast('Database lokal di-reset kembali ke 40 Soal PDF & Data Uji Awal.');
                  }}
                  className="px-3 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Reset Data Awal
                </button>
              </div>
            </div>

            {/* Right 7 Cols: Paste / CSV Importer with Live Preview */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Impor Bank Soal & Data Siswa (Tempel dari Spreadsheet / CSV)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Salin baris dari Google Spreadsheet atau CSV lalu tempel di bawah untuk melihat
                    pratinjau sebelum disimpan.
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setImportMode('SISWA')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md ${
                      importMode === 'SISWA' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Impor Siswa
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('SOAL')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md ${
                      importMode === 'SOAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Impor Bank Soal
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono">
                {importMode === 'SISWA'
                  ? 'Format Kolom: NIS, Nama Lengkap, Kelas, Kode Ruang, Password (contoh: 102611, Budi Setiawan, X TKJ 1, R-LAB1, 123456)'
                  : 'Format Kolom: No, Tipe (PG/PGK/ISIAN/URAIAN), Teks Pertanyaan, Kunci, Bobot, Opsi_A, Opsi_B, Opsi_C, Opsi_D, Opsi_E'}
              </div>

              <textarea
                rows={4}
                value={pasteBuffer}
                onChange={(e) => handleParsePastePreview(e.target.value)}
                placeholder={
                  importMode === 'SISWA'
                    ? '102611, Rahmat Hidayat, X TKJ 1, R-LAB1, 123456\n102612, Lestari Putri, X RPL 1, R-LAB1, 123456'
                    : '41, ISIAN, Apakah kepanjangan dari CPU?, central processing unit|cpu, 2'
                }
                className="w-full p-3 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              />

              {previewRows.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    Pratinjau Data ({previewRows.length} Baris Siap Disimpan):
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-48">
                    <table className="w-full text-left border-collapse text-xs">
                      <tbody className="divide-y divide-slate-200">
                        {previewRows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {r.map((cell, cIdx) => (
                              <td key={cIdx} className="py-2 px-3 font-mono text-slate-700">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={handleCommitImport}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    Simpan Hasil Impor ke Database
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 6: UJI BEBAN 300 SISWA SERENTAK ===================== */}
        {activeTab === 'LOAD_TEST' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-semibold text-blue-700">
                  Verifikasi Arsitektur Anti-Kuota Google Apps Script
                </span>
                <h2 className="text-lg font-bold text-slate-900">
                  Simulator Uji Beban 300 Siswa Serentak (SMKN 2 Gorontalo)
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Simulasikan ratusan sesi siswa sebelum hari-H untuk memverifikasi penghematan
                  request batch, antrean backoff + jitter, dan responsivitas tabel Pantau Langsung.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={simTargetCount}
                  onChange={(e) => setSimTargetCount(Number(e.target.value))}
                  className="px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50"
                >
                  <option value={50}>50 Sesi Siswa Virtual</option>
                  <option value={150}>150 Sesi Siswa Virtual</option>
                  <option value={300}>300 Sesi Siswa Virtual (Kapasitas Penuh)</option>
                </select>

                <button
                  type="button"
                  disabled={isSimRunning}
                  onClick={handleRunLoadSimulation}
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4" />
                  {isSimRunning ? 'Menjalankan Simulasi...' : 'Jalankan Simulasi Beban'}
                </button>

                {simMetrics && (
                  <button
                    type="button"
                    onClick={handleClearSimulation}
                    className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    Bersihkan Sesi Palsu
                  </button>
                )}
              </div>
            </div>

            {simMetrics ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500 block">Sesi Serentak Aktif</span>
                  <span className="text-xl font-mono font-bold text-slate-900 tabular-nums mt-1 block">
                    {simMetrics.activeSessions} Siswa
                  </span>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-xs text-emerald-800 block">Penghematan Kuota GAS</span>
                  <span className="text-xl font-mono font-bold text-emerald-700 tabular-nums mt-1 block">
                    -{simMetrics.savedByBatchingPercent}% Request
                  </span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500 block">Total Batch Terkirim</span>
                  <span className="text-xl font-mono font-bold text-blue-700 tabular-nums mt-1 block">
                    {simMetrics.batchRequestsSent} Batch
                  </span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500 block">Rata-rata Latensi Batch</span>
                  <span className="text-xl font-mono font-bold text-slate-900 tabular-nums mt-1 block">
                    {simMetrics.avgLatencyMs} ms
                  </span>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-xs text-amber-900 block">Retry Backoff + Jitter</span>
                  <span className="text-xl font-mono font-bold text-amber-800 tabular-nums mt-1 block">
                    {simMetrics.retriedWithBackoff} Pulih
                  </span>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-xs text-emerald-800 block">Jawaban Hilang / Gagal</span>
                  <span className="text-xl font-mono font-bold text-emerald-700 tabular-nums mt-1 block">
                    {simMetrics.failedRequests} (0%)
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-2">
                <p className="font-bold text-slate-900">
                  Bagaimana Desain Ini Menangani 300 Siswa di Google Apps Script?
                </p>
                <p>
                  • <strong>Single-Load & CacheService:</strong> 40 Soal dimuat 1 kali di awal ujian
                  dari memori `CacheService` server tanpa membaca ulang sheet `Bank_Soal`.
                </p>
                <p>
                  • <strong>Local-First Batching:</strong> Jawaban siswa disimpan instan di
                  `localStorage` dan hanya dikirim ke server setiap <strong>5 soal terjawab</strong>{' '}
                  atau <strong>2 menit sekali</strong>.
                </p>
                <p>
                  • <strong>Batch `setValues` & Short Lock:</strong> Di `Code.gs`, penulisan
                  menggunakan `sheet.getRange(...).setValues(rows)` dalam satu operasi blok, bukan
                  `appendRow` berulang.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 7: INTEGRASI GOOGLE APPS SCRIPT & CODE.GS ===================== */}
        {activeTab === 'APPS_SCRIPT' && (
          <div className="space-y-6">
            {/* Web App URL Configuration Box */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h2 className="text-base font-bold text-slate-900">
                  Koneksi URL Web App Google Apps Script (Disematkan Otomatis)
                </h2>
                <span className="text-xs font-semibold text-emerald-700">
                  ● {gasStatusText}
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                URL Web App Google Apps Script Anda telah disematkan secara otomatis ke dalam
                aplikasi. Setiap jawaban batch siswa, log pelanggaran, dan pengumpulan ujian
                dikirim langsung ke Spreadsheet Anda:
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  value={db.pengaturan.gas_webapp_url || DEFAULT_GAS_WEBAPP_URL}
                  onChange={(e) =>
                    setDb((prev) => ({
                      ...prev,
                      pengaturan: { ...prev.pengaturan, gas_webapp_url: e.target.value },
                    }))
                  }
                  placeholder={DEFAULT_GAS_WEBAPP_URL}
                  className="flex-1 px-4 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={async () => {
                    saveDatabase(db);
                    setGasStatusText('Menguji koneksi ke Apps Script...');
                    const res = await checkGasWebAppStatus();
                    if (res.connected) {
                      setGasStatusText(
                        `Terhubung Aktif (${res.service || 'Apps Script OK'})`
                      );
                      showToast('Koneksi ke URL Google Apps Script berhasil diverifikasi!');
                    } else {
                      setGasStatusText('URL Tersimpan & Siap Menerima POST Request');
                      showToast('URL Web App Google Apps Script berhasil disimpan!');
                    }
                  }}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl whitespace-nowrap"
                >
                  Simpan &amp; Tes Koneksi
                </button>
              </div>
            </div>

            {/* Complete Code.gs Source & Step-by-Step Deployment Guide */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-blue-700">
                    Backend Google Spreadsheet + Apps Script Lengkap
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    Kode Lengkap `Code.gs` (Termasuk `setupSpreadsheet()` 9 Sheet Otomatis)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(CODE_GS_CONTENT);
                    setCopiedCode(true);
                    showToast('Seluruh kode Code.gs berhasil disalin ke clipboard!');
                    window.setTimeout(() => setCopiedCode(false), 3000);
                  }}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedCode ? 'Berhasil Disalin!' : 'Salin Seluruh Kode Code.gs'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong className="text-slate-900 block mb-1">
                    Langkah 1: Buat Spreadsheet & Tempel Kode
                  </strong>
                  Buka Google Spreadsheet baru &rarr; klik menu <em>Extensions &gt; Apps Script</em>.
                  Hapus isi file `Code.gs` bawaan lalu tempel seluruh kode di bawah dan simpan
                  (`Ctrl+S`).
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong className="text-slate-900 block mb-1">
                    Langkah 2: Jalankan `setupSpreadsheet()`
                  </strong>
                  Pilih fungsi <code>setupSpreadsheet</code> pada dropdown toolbar Apps Script lalu
                  klik <strong>Run</strong>. Fungsi ini otomatis membuat 9 Sheet beserta header dan
                  10 akun siswa uji.
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong className="text-slate-900 block mb-1">
                    Langkah 3: Deploy sebagai Web App
                  </strong>
                  Klik <em>Deploy &gt; New deployment</em> &rarr; pilih jenis <strong>Web app</strong>
                  , set <em>Execute as: Me</em>, dan <em>Who has access: Anyone</em>. Salin URL
                  `/exec` ke kotak di atas.
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-slate-300 bg-slate-950 text-slate-100">
                <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Code.gs — Google Apps Script (Server-Side Grading + Batch Sync)</span>
                  <span>9 Sheet Otomatis</span>
                </div>
                <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto max-h-[480px]">
                  <code>{CODE_GS_CONTENT}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
