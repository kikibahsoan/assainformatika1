import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CloudCheck,
  CloudUpload,
  Flag,
  KeyRound,
  LayoutGrid,
  Lock,
  LogOut,
  Maximize,
  RefreshCw,
  Send,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import { QuestionClient } from '../data/questionsData';
import {
  calculateStudentScoreServerSide,
  callGasWebApp,
  executeWithRetryAndJitter,
  getPublicQuestionsFromServer,
  getQuestionsShuffledForStudent,
  getShuffledOptionsForQuestion,
  loadDatabase,
  LogPelanggaranRecord,
  NilaiRecord,
  saveDatabase,
  SesiRecord,
  SiswaRecord,
} from '../services/cbtBackendService';
import { ProctorAvatar3D, ProctorMood } from './ProctorAvatar3D';
import { QuestionSvgDiagrams } from './QuestionSvgDiagrams';

interface StudentExamViewProps {
  student: SiswaRecord;
  sessionToken: string;
  onLogout: () => void;
}

export const StudentExamView: React.FC<StudentExamViewProps> = ({
  student,
  sessionToken,
  onLogout,
}) => {
  const [dbState, setDbState] = useState(() => loadDatabase());
  const currentRoom = useMemo(
    () => dbState.ruang.find((r) => r.kode_ruang === student.ruang),
    [dbState.ruang, student.ruang]
  );

  // Room waiting status ('BELUM' | 'BERJALAN' | 'SELESAI')
  const [roomStarted, setRoomStarted] = useState<boolean>(
    () => currentRoom?.status_mulai === 'BERJALAN'
  );
  const [nextJitterMs, setNextJitterMs] = useState<number>(4500);

  // Questions loaded ONCE when exam starts, stripped of answer keys, and shuffled deterministically by NIS
  const [questions, setQuestions] = useState<QuestionClient[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);

  // Local answers buffer: { [no_soal]: { jawaban: string, ragu_ragu: boolean, waktu_simpan: string } }
  const localBufferKey = `ASSA_LOCAL_ANS_${student.nis}`;
  const [answers, setAnswers] = useState<Record<number, { jawaban: string; ragu_ragu: boolean }>>(
    () => {
      try {
        const raw = localStorage.getItem(localBufferKey);
        if (raw) return JSON.parse(raw);
      } catch {
        // fallback to server answers
      }
      const db = loadDatabase();
      const srvAns = db.jawaban[student.nis] || {};
      const mapped: Record<number, { jawaban: string; ragu_ragu: boolean }> = {};
      Object.values(srvAns).forEach((item) => {
        mapped[item.no_soal] = {
          jawaban: item.jawaban,
          ragu_ragu: Boolean(item.ragu_ragu),
        };
      });
      return mapped;
    }
  );

  // Batch queue tracking (send every 5 answered questions OR every 2 minutes)
  const [unsyncedSet, setUnsyncedSet] = useState<Set<number>>(new Set());
  const [syncStatus, setSyncStatus] = useState<'SYNCED' | 'PENDING_BATCH' | 'SYNCING' | 'RETRYING'>(
    'SYNCED'
  );
  const [lastSyncTime, setLastSyncTime] = useState<string>(() =>
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Session & Anti-Cheat State
  const [session, setSession] = useState<SesiRecord>(() => {
    const db = loadDatabase();
    return (
      db.sesi[student.nis] || {
        nis: student.nis,
        ruang: student.ruang,
        token_sesi: sessionToken,
        device_id: 'BROWSER-CLIENT',
        waktu_mulai: new Date().toISOString(),
        batas_waktu: new Date(
          Date.now() + db.pengaturan.durasi_menit * 60 * 1000
        ).toISOString(),
        tambahan_menit: 0,
        status: 'MENGERJAKAN',
        jumlah_pelanggaran: 0,
        soal_terakhir: 1,
        jumlah_terjawab: 0,
        waktu_aktif_terakhir: new Date().toISOString(),
      }
    );
  });

  // Proctor 3D message & mood
  const [proctorMessage, setProctorMessage] = useState<string>(
    `Halo ${student.nama.split(' ')[0]}! Selamat mengerjakan ASSA Informatika. Kerjakan dengan jujur dan teliti.`
  );
  const [proctorMood, setProctorMood] = useState<ProctorMood>('NORMAL');

  // Modals & UI states
  const [warningModal, setWarningModal] = useState<{
    count: number;
    max: number;
    reason: string;
  } | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);
  const [showMobileNavDrawer, setShowMobileNavDrawer] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [submittedResult, setSubmittedResult] = useState<NilaiRecord | null>(() => {
    const db = loadDatabase();
    if (db.sesi[student.nis]?.status === 'SELESAI' && db.nilai[student.nis]) {
      return db.nilai[student.nis];
    }
    return null;
  });

  // Server-based remaining time in seconds
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const deadlineMs =
      new Date(session.batas_waktu).getTime() + session.tambahan_menit * 60 * 1000;
    return Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
  });

  const announcedMinutesRef = useRef<Set<number>>(new Set());
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // 1. Waiting Room Polling with Random Jitter (3-8 seconds)
  useEffect(() => {
    if (roomStarted) return;
    let timerId: number;

    const pollRoomStatus = () => {
      const db = loadDatabase();
      setDbState(db);
      const room = db.ruang.find((r) => r.kode_ruang === student.ruang);
      if (room && room.status_mulai === 'BERJALAN') {
        setRoomStarted(true);
        return;
      }
      // Random jitter 3000 - 8000 ms
      const jitter = Math.floor(3000 + Math.random() * 5000);
      setNextJitterMs(jitter);
      timerId = window.setTimeout(pollRoomStatus, jitter);
    };

    timerId = window.setTimeout(pollRoomStatus, nextJitterMs);
    return () => clearTimeout(timerId);
  }, [roomStarted, student.ruang, nextJitterMs]);

  // 2. Load Questions ONCE when exam starts (stripped of answer keys) & shuffle deterministically by NIS
  useEffect(() => {
    if (!roomStarted) return;
    let active = true;

    const loadQuestionsOnce = async () => {
      // Request from embedded Google Apps Script first; fallback to embedded 40 PDF questions if Bank_Soal sheet is empty
      const gasRes = await callGasWebApp('getQuestionsForStudent', { nis: student.nis });
      const baseQuestions =
        gasRes && Array.isArray(gasRes.questions) && gasRes.questions.length > 0
          ? (gasRes.questions as QuestionClient[])
          : getPublicQuestionsFromServer();

      if (!active) return;
      const shuffledForStudent = getQuestionsShuffledForStudent(baseQuestions, student.nis);
      setQuestions(shuffledForStudent);

      const db = loadDatabase();
      const existingSesi = db.sesi[student.nis];
      if (existingSesi && existingSesi.soal_terakhir > 0) {
        const targetIdx = shuffledForStudent.findIndex(
          (q) => q.no === existingSesi.soal_terakhir
        );
        if (targetIdx !== -1) setCurrentIdx(targetIdx);
      }
    };

    loadQuestionsOnce();
    return () => {
      active = false;
    };
  }, [roomStarted, student.nis]);

  // 3. Batch Answer Sync Function with Exponential Backoff & Random Jitter
  const flushAnswerBatchToServer = useCallback(
    async (forceAll = false) => {
      const currentAns = answersRef.current;
      const keysToFlush = forceAll
        ? Object.keys(currentAns).map(Number)
        : Array.from(unsyncedSet);

      if (keysToFlush.length === 0 && !forceAll) return;

      setSyncStatus('SYNCING');
      try {
        await executeWithRetryAndJitter(async () => {
          const db = loadDatabase();
          if (!db.jawaban[student.nis]) {
            db.jawaban[student.nis] = {};
          }
          const nowIso = new Date().toISOString();
          const batchPayload: Record<string, string> = {};
          keysToFlush.forEach((noSoal) => {
            const item = currentAns[noSoal];
            if (item) {
              db.jawaban[student.nis][noSoal] = {
                nis: student.nis,
                no_soal: noSoal,
                jawaban: item.jawaban,
                ragu_ragu: item.ragu_ragu,
                waktu_simpan: nowIso,
              };
              batchPayload[String(noSoal)] = item.jawaban;
            }
          });

          // Send batch to embedded Google Apps Script Web App
          await callGasWebApp('saveAnswerBatch', {
            nis: student.nis,
            answers: batchPayload,
          });

          // Update session progress summary in cached Sesi table
          const answeredCount = Object.values(currentAns).filter(
            (a) => a.jawaban && String(a.jawaban).trim() !== ''
          ).length;

          if (db.sesi[student.nis]) {
            db.sesi[student.nis].jumlah_terjawab = answeredCount;
            db.sesi[student.nis].waktu_aktif_terakhir = nowIso;
          }
          saveDatabase(db);
        }, 3);

        setUnsyncedSet(new Set());
        setSyncStatus('SYNCED');
        setLastSyncTime(
          new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      } catch {
        setSyncStatus('RETRYING');
      }
    },
    [student.nis, unsyncedSet]
  );

  // Trigger Batch Flush every 5 unsynced questions
  useEffect(() => {
    if (unsyncedSet.size >= 5) {
      flushAnswerBatchToServer(false);
    }
  }, [unsyncedSet, flushAnswerBatchToServer]);

  // Trigger Batch Flush every 2 minutes (120,000 ms) + Lightweight Heartbeat every 60 seconds
  useEffect(() => {
    if (!roomStarted || session.status === 'SELESAI') return;

    // 2-minute batch flush timer
    const batchInterval = window.setInterval(() => {
      flushAnswerBatchToServer(false);
    }, 120000);

    // 60-second lightweight status heartbeat & check for supervisor remote unlock / extra time
    const heartbeatInterval = window.setInterval(() => {
      const db = loadDatabase();
      const srvSesi = db.sesi[student.nis];
      if (srvSesi) {
        srvSesi.waktu_aktif_terakhir = new Date().toISOString();
        saveDatabase(db);
        setSession({ ...srvSesi });
        setDbState(db);
      }
    }, 5000); // Fast local sync check for supervisor remote unlock while sending network heartbeat every 60s

    return () => {
      clearInterval(batchInterval);
      clearInterval(heartbeatInterval);
    };
  }, [roomStarted, session.status, student.nis, flushAnswerBatchToServer]);

  // 4. Record Violation Function (Anti-Cheat Layer)
  const recordViolation = useCallback(
    (
      jenis: LogPelanggaranRecord['jenis_pelanggaran'],
      keterangan: string
    ) => {
      const db = loadDatabase();
      const srvSesi = db.sesi[student.nis];
      if (!srvSesi || srvSesi.status === 'SELESAI' || srvSesi.status === 'TERKUNCI') {
        return;
      }

      const maxViolations = db.pengaturan.batas_pelanggaran || 3;
      const newCount = (srvSesi.jumlah_pelanggaran || 0) + 1;
      const isNowLocked = newCount >= maxViolations;

      srvSesi.jumlah_pelanggaran = newCount;
      srvSesi.waktu_aktif_terakhir = new Date().toISOString();
      if (isNowLocked) {
        srvSesi.status = 'TERKUNCI';
      }

      const logItem: LogPelanggaranRecord = {
        id: `V-${Date.now()}`,
        waktu: new Date().toISOString(),
        nis: student.nis,
        nama: student.nama,
        ruang: student.ruang,
        jenis_pelanggaran: jenis,
        keterangan: `${keterangan} (Pelanggaran ${newCount}/${maxViolations})`,
      };
      db.log_pelanggaran.unshift(logItem);
      saveDatabase(db);

      // Send violation log to embedded Google Apps Script Web App
      callGasWebApp('logViolation', {
        nis: student.nis,
        jenis: jenis,
        keterangan: logItem.keterangan,
      });

      setSession({ ...srvSesi });
      setDbState(db);

      if (isNowLocked) {
        setProctorMood('LOCKED');
        setProctorMessage(
          `Layar ujian Anda TERKUNCI karena telah mencapai batas ${maxViolations} pelanggaran (${keterangan}). Jawaban Anda tetap aman. Silakan panggil Pengawas Ruang.`
        );
        setWarningModal(null);
      } else if (newCount === maxViolations - 1) {
        setProctorMood('CRITICAL');
        setProctorMessage(
          `PERINGATAN TERAKHIR (${newCount}/${maxViolations})! Tetap fokus di layar ujian ya. Satu pelanggaran lagi akan mengunci layar ujian Anda.`
        );
        setWarningModal({
          count: newCount,
          max: maxViolations,
          reason: keterangan,
        });
      } else {
        setProctorMood('WARNING');
        setProctorMessage(
          `Tetap fokus di layar ujian ya! Terdeteksi: ${keterangan} (Peringatan ${newCount}/${maxViolations}).`
        );
        setWarningModal({
          count: newCount,
          max: maxViolations,
          reason: keterangan,
        });
      }
    },
    [student.nis, student.nama, student.ruang]
  );

  // 5. Anti-Cheat Browser Listeners (visibilitychange, blur, fullscreenchange, shortcuts)
  useEffect(() => {
    if (!roomStarted || session.status !== 'MENGERJAKAN') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('PINDAH_TAB', 'Siswa berpindah tab browser atau meminimalkan aplikasi');
      }
    };

    const handleFullscreenChange = () => {
      const fsActive = Boolean(document.fullscreenElement);
      setIsFullscreen(fsActive);
      if (!fsActive) {
        recordViolation('KELUAR_FULLSCREEN', 'Siswa keluar dari mode layar penuh (fullscreen)');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12, Ctrl+U, Ctrl+Shift+I, Ctrl+P
      if (
        e.key === 'F12' ||
        (e.ctrlKey && ['u', 'U', 'p', 'P'].includes(e.key)) ||
        (e.ctrlKey && e.shiftKey && ['i', 'I', 'j', 'J'].includes(e.key))
      ) {
        e.preventDefault();
        recordViolation(
          'SHORTCUT_TERLARANG',
          `Menekan pintasan keyboard terlarang (${e.ctrlKey ? 'Ctrl+' : ''}${e.key.toUpperCase()})`
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [roomStarted, session.status, recordViolation]);

  // 6. Final Submit Handler
  const handleFinalSubmit = useCallback(async () => {
    await flushAnswerBatchToServer(true);
    const db = loadDatabase();
    if (db.sesi[student.nis]) {
      db.sesi[student.nis].status = 'SELESAI';
      db.sesi[student.nis].waktu_aktif_terakhir = new Date().toISOString();
    }

    // Perform server-side auto-grading immediately upon submission
    const nilaiRec = calculateStudentScoreServerSide(db, student.nis);
    db.nilai[student.nis] = nilaiRec;
    saveDatabase(db);

    // Send final submission & score summary to embedded Google Apps Script Web App
    await callGasWebApp('submitExam', {
      nis: student.nis,
      nilai: nilaiRec,
    });

    setSession((prev) => ({ ...prev, status: 'SELESAI' }));
    setSubmittedResult(nilaiRec);
    setShowConfirmSubmit(false);
    setProctorMood('SUCCESS');
    setProctorMessage(
      'Alhamdulillah, ujian ASSA Informatika selesai! Seluruh jawaban Anda telah diterima dan disimpan di server.'
    );
  }, [flushAnswerBatchToServer, student.nis]);

  // 7. Server-Side Countdown Timer & Proctor Time Reminders (30, 10, 5, 1 min)
  useEffect(() => {
    if (!roomStarted || session.status === 'SELESAI') return;

    const timer = window.setInterval(() => {
      const deadlineMs =
        new Date(session.batas_waktu).getTime() + session.tambahan_menit * 60 * 1000;
      const secs = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
      setRemainingSeconds(secs);

      const minsLeft = Math.ceil(secs / 60);
      if (
        [30, 10, 5, 1].includes(minsLeft) &&
        !announcedMinutesRef.current.has(minsLeft) &&
        secs > 0
      ) {
        announcedMinutesRef.current.add(minsLeft);
        setProctorMood(minsLeft <= 5 ? 'WARNING' : 'NORMAL');
        setProctorMessage(
          `Pengingat waktu: Sisa waktu pengerjaan ujian Anda tinggal ${minsLeft} menit lagi. Periksa kembali jawaban yang masih ragu-ragu.`
        );
      }

      if (secs <= 0) {
        clearInterval(timer);
        handleFinalSubmit();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [roomStarted, session.batas_waktu, session.tambahan_menit, session.status, handleFinalSubmit]);

  // Save answer to localStorage immediately on every interaction
  const updateAnswer = (noSoal: number, newJawaban: string, toggleRagu?: boolean) => {
    setAnswers((prev) => {
      const existing = prev[noSoal] || { jawaban: '', ragu_ragu: false };
      const updated = {
        ...prev,
        [noSoal]: {
          jawaban: newJawaban,
          ragu_ragu: toggleRagu !== undefined ? toggleRagu : existing.ragu_ragu,
        },
      };
      try {
        localStorage.setItem(localBufferKey, JSON.stringify(updated));
      } catch {
        // ignore quota errors
      }
      return updated;
    });

    setUnsyncedSet((prev) => {
      const next = new Set(prev);
      next.add(noSoal);
      return next;
    });
    setSyncStatus('PENDING_BATCH');
  };

  // Navigate to a question & record farthest/last question visited
  const goToQuestionIndex = (idx: number) => {
    if (idx < 0 || idx >= questions.length) return;
    setCurrentIdx(idx);
    setShowMobileNavDrawer(false);
    const qNo = questions[idx]?.no;
    if (qNo) {
      const db = loadDatabase();
      if (db.sesi[student.nis]) {
        db.sesi[student.nis].soal_terakhir = qNo;
        db.sesi[student.nis].waktu_aktif_terakhir = new Date().toISOString();
        saveDatabase(db);
      }
    }
  };

  // Unlock with Supervisor PIN on student device
  const handleUnlockWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    const db = loadDatabase();
    if (pinInput.trim() === db.pengaturan.pin_pengawas.trim()) {
      if (db.sesi[student.nis]) {
        db.sesi[student.nis].status = 'MENGERJAKAN';
        // Give 1 grace allowance so it doesn't immediately lock without a new violation
        db.sesi[student.nis].jumlah_pelanggaran = Math.max(
          0,
          db.pengaturan.batas_pelanggaran - 1
        );
        db.sesi[student.nis].waktu_aktif_terakhir = new Date().toISOString();
        saveDatabase(db);
        setSession({ ...db.sesi[student.nis] });
      }
      setPinInput('');
      setPinError('');
      setProctorMood('NORMAL');
      setProctorMessage(
        'Kunci layar telah dibuka oleh Pengawas. Silakan lanjutkan mengerjakan dengan tertib.'
      );
    } else {
      setPinError('PIN Pengawas tidak sesuai. Silakan hubungi Pengawas Ruang.');
    }
  };

  const requestBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      // Some mobile browsers or restricted iframes do not allow fullscreen
    }
  };

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(
        secs
      ).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ===================== VIEW 1: COMPLETED / SUBMITTED SCREEN =====================
  if (session.status === 'SELESAI' || submittedResult) {
    const showScore = dbState.pengaturan.tampilkan_nilai;
    const totalAnswered = Object.values(answers).filter(
      (a) => a.jawaban && String(a.jawaban).trim() !== ''
    ).length;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-semibold text-emerald-700">
                Ujian Telah Diserahkan
              </span>
              <h1 className="text-xl font-bold text-slate-900">
                Terima Kasih, {student.nama}
              </h1>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Seluruh jawaban ujian <strong>{dbState.pengaturan.judul_ujian}</strong> Anda telah
            disimpan secara permanen di server. Anda tidak dapat mengubah jawaban lagi.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-xs">
            <div>
              <span className="text-slate-500 block">NIS / Kelas</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {student.nis} · {student.kelas}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Soal Terjawab</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {totalAnswered} / 40 Soal
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Catatan Pelanggaran</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {session.jumlah_pelanggaran} Kejadian
              </span>
            </div>
          </div>

          {showScore && submittedResult ? (
            <div className="mb-6 p-4 bg-blue-50/70 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-950">
                  Ringkasan Nilai Sementara (Otomatis Server)
                </span>
                <span className="text-xs text-blue-700">
                  Status Uraian:{' '}
                  {submittedResult.status_uraian === 'SUDAH'
                    ? 'Sudah Dinilai Guru'
                    : 'Menunggu Penilaian Guru'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center mt-3">
                <div className="p-2 bg-white rounded-lg border border-blue-100">
                  <span className="text-[11px] text-slate-500 block">PG (Maks 10)</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {submittedResult.skor_pg}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-blue-100">
                  <span className="text-[11px] text-slate-500 block">PGK (Maks 20)</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {submittedResult.skor_pgk}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-blue-100">
                  <span className="text-[11px] text-slate-500 block">Jodoh (Maks 15)</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {submittedResult.skor_menjodohkan}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-blue-100">
                  <span className="text-[11px] text-slate-500 block">Isian (Maks 20)</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {submittedResult.skor_isian}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-blue-100">
                  <span className="text-[11px] text-slate-500 block">Nilai Akhir</span>
                  <span className="font-mono font-bold text-blue-700 tabular-nums text-base">
                    {submittedResult.nilai_akhir}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600">
              Sesuai pengaturan ujian, nilai akhir akan diumumkan oleh Guru Informatika setelah
              seluruh jawaban soal uraian (Nomor 36–40) selesai dikoreksi.
            </div>
          )}

          <div className="mb-6">
            <ProctorAvatar3D
              message="Terima kasih telah mengikuti ujian ASSA Informatika dengan tertib. Silakan keluar dari akun dan tinggalkan ruang ujian sesuai arahan pengawas."
              mood="SUCCESS"
              violationCount={session.jumlah_pelanggaran}
              maxViolations={dbState.pengaturan.batas_pelanggaran}
            />
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Keluar dari Sesi Ujian
          </button>
        </div>
      </div>
    );
  }

  // ===================== VIEW 2: WAITING ROOM (WITH 3-8s RANDOM JITTER) =====================
  if (!roomStarted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
            <div>
              <span className="text-xs font-semibold text-blue-700">
                Ruang Tunggu Peserta Ujian
              </span>
              <h1 className="text-xl font-bold text-slate-900">
                {dbState.pengaturan.judul_ujian}
              </h1>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
            >
              Keluar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-xs">
            <div>
              <span className="text-slate-500 block">Nama Peserta</span>
              <span className="font-bold text-slate-900">{student.nama}</span>
            </div>
            <div>
              <span className="text-slate-500 block">NIS / Kelas</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {student.nis} · {student.kelas}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Ruang Ujian</span>
              <span className="font-semibold text-slate-900">
                {currentRoom?.nama_ruang || student.ruang}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Durasi / Jumlah Soal</span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {dbState.pengaturan.durasi_menit} Menit · 40 Soal
              </span>
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
            <div className="flex items-center gap-2.5 text-amber-900 font-semibold text-sm mb-1">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-700 shrink-0" />
              Menunggu Pengawas Memulai Ujian di Ruang {student.ruang}...
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Aplikasi memeriksa status mulai ruang secara otomatis dengan jeda acak{' '}
              <span className="font-mono font-semibold tabular-nums">
                {(nextJitterMs / 1000).toFixed(1)} detik
              </span>{' '}
              (desain anti-lonjakan untuk 300 siswa serentak). Halaman akan otomatis membuka soal
              begitu pengawas mengaktifkan ruang.
            </p>
          </div>

          <div className="space-y-2 text-xs text-slate-600 mb-6">
            <p className="font-bold text-slate-900">Tata Tertib Sistem Anti-Curang:</p>
            <p>1. Ujian wajib dikerjakan dalam mode Layar Penuh (Fullscreen).</p>
            <p>
              2. Dilarang berpindah tab browser, membuka aplikasi lain, atau menyalin teks soal.
            </p>
            <p>
              3. Layar ujian akan terkunci otomatis apabila tercatat{' '}
              <strong>{dbState.pengaturan.batas_pelanggaran} kali pelanggaran</strong> dan hanya
              bisa dibuka dengan PIN Pengawas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const db = loadDatabase();
              const r = db.ruang.find((rm) => rm.kode_ruang === student.ruang);
              if (r) {
                r.status_mulai = 'BERJALAN';
                r.jam_mulai = new Date().toISOString();
                saveDatabase(db);
              }
              requestBrowserFullscreen();
              setRoomStarted(true);
            }}
            className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-xl transition-colors"
          >
            Mulai Sekarang (Simulasi Pengawas Mengaktifkan Ruang)
          </button>
        </div>
      </div>
    );
  }

  // ===================== VIEW 3: LOCKED SCREEN (PELANGGARAN >= BATAS) =====================
  if (session.status === 'TERKUNCI') {
    return (
      <div className="min-h-screen bg-red-950/95 text-slate-900 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-lg bg-white border-2 border-red-500 rounded-2xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-red-700">
                Sistem Anti-Curang SMKN 2 Gorontalo
              </span>
              <h1 className="text-xl font-bold text-slate-900">
                Layar Ujian Anda Terkunci
              </h1>
            </div>
          </div>

          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 leading-relaxed mb-5">
            Terdeteksi <strong>{session.jumlah_pelanggaran} kali pelanggaran</strong> (keluar
            fullscreen / pindah tab / jendela tidak aktif). Jangan khawatir,{' '}
            <strong>seluruh jawaban yang sudah Anda isi tetap tersimpan dengan aman</strong>.
          </div>

          <div className="mb-5">
            <ProctorAvatar3D
              message="Layar ujian terkunci otomatis. Silakan angkat tangan dan minta Pengawas Ruang untuk membuka kunci dari Panel Pengawas atau memasukkan PIN Pengawas di bawah ini."
              mood="LOCKED"
              violationCount={session.jumlah_pelanggaran}
              maxViolations={dbState.pengaturan.batas_pelanggaran}
            />
          </div>

          <form onSubmit={handleUnlockWithPin} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Buka Kunci dengan PIN Pengawas Ruang (Demo PIN: {dbState.pengaturan.pin_pengawas})
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Masukkan PIN Pengawas..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  Buka Kunci
                </button>
              </div>
              {pinError && <p className="text-xs text-red-600 mt-1.5 font-medium">{pinError}</p>}
            </div>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Peserta: <strong>{student.nama}</strong> ({student.nis})
            </span>
            <span>Ruang: {student.ruang}</span>
          </div>
        </div>
      </div>
    );
  }

  // ===================== VIEW 4: MAIN EXAM WORKSPACE =====================
  const currentQuestion = questions[currentIdx];
  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-sm text-slate-600">Memuat paket soal ujian...</div>
      </div>
    );
  }

  const currentAnsObj = answers[currentQuestion.no] || { jawaban: '', ragu_ragu: false };
  const shuffledOptions =
    currentQuestion.tipe === 'PG' || currentQuestion.tipe === 'PGK'
      ? getShuffledOptionsForQuestion(currentQuestion, student.nis)
      : [];

  // Parse PGK multi-select array
  const selectedPgkKeys =
    currentQuestion.tipe === 'PGK' && currentAnsObj.jawaban
      ? currentAnsObj.jawaban
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  // Parse Menjodohkan map
  let matchingMap: Record<string, string> = {};
  if (currentQuestion.tipe === 'MENJODOHKAN' && currentAnsObj.jawaban) {
    try {
      matchingMap = JSON.parse(currentAnsObj.jawaban);
    } catch {
      matchingMap = {};
    }
  }

  const answeredCount = questions.filter((q) => {
    const a = answers[q.no]?.jawaban;
    if (!a || String(a).trim() === '') return false;
    if (q.tipe === 'MENJODOHKAN') {
      try {
        const parsed = JSON.parse(a);
        return Object.keys(parsed).length > 0;
      } catch {
        return false;
      }
    }
    return true;
  }).length;

  const doubtfulCount = questions.filter((q) => answers[q.no]?.ragu_ragu).length;
  const unansweredCount = questions.length - answeredCount;

  const getTypeLabel = (tipe: QuestionClient['tipe']) => {
    switch (tipe) {
      case 'PG':
        return 'Pilihan Ganda (Pilih 1 Jawaban)';
      case 'PGK':
        return 'Pilihan Ganda Kompleks (Pilih Lebih dari 1 Jawaban Benar)';
      case 'MENJODOHKAN':
        return 'Menjodohkan (Pasangkan Lajur Kiri & Kanan)';
      case 'ISIAN':
        return 'Isian Singkat';
      case 'URAIAN':
        return 'Uraian / Esai';
    }
  };

  return (
    <div
      className="min-h-screen bg-[#EFF4EF] flex flex-col no-select-exam"
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      {/* Top Sticky Exam Header (Under 15% mobile viewport cap) */}
      <header className="sticky top-0 z-30 bg-white/95 border-b border-emerald-900/15 px-4 lg:px-8 py-2.5 shadow-2xs">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Exam Title & Student Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-9 rounded-xl bg-slate-900 text-emerald-400 font-extrabold text-xs tracking-wider flex items-center justify-center shrink-0">
              ASSA
            </div>
            <div className="truncate">
              <div className="text-sm font-bold text-slate-900 truncate">
                {dbState.pengaturan.judul_ujian}
              </div>
              <div className="text-xs text-slate-500 truncate">
                <span>{student.nama}</span>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono tabular-nums">{student.nis}</span>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span>{student.kelas}</span>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span>Ruang {student.ruang}</span>
              </div>
            </div>
          </div>

          {/* Zone 2: Sync Status & Anti-Cheat Sim Trigger (for teacher testing) */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => flushAnswerBatchToServer(true)}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              title="Klik untuk sinkronisasi batch sekarang"
            >
              {syncStatus === 'SYNCED' ? (
                <>
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tersimpan ({lastSyncTime})</span>
                </>
              ) : syncStatus === 'SYNCING' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span>Menyinkronkan batch...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    Tersimpan di perangkat (Antrean batch {unsyncedSet.size}/5)
                  </span>
                </>
              )}
            </button>

            {!isFullscreen && (
              <button
                type="button"
                onClick={requestBrowserFullscreen}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Maximize className="w-3.5 h-3.5" />
                Layar Penuh
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                recordViolation(
                  'PINDAH_TAB',
                  'Simulasi uji pindah tab / keluar aplikasi oleh penguji'
                )
              }
              className="flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title="Gunakan tombol ini untuk menguji reaksi Avatar Proktor 3D dan penguncian layar tanpa keluar dari tab"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Uji Pelanggaran ({session.jumlah_pelanggaran}/{dbState.pengaturan.batas_pelanggaran})
            </button>
          </div>

          {/* Zone 3: Server Countdown Timer & Mobile Nav Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm tabular-nums ${
                remainingSeconds <= 300
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : remainingSeconds <= 900
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-slate-900 border-slate-900 text-white'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>{formatTimer(remainingSeconds)}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowMobileNavDrawer(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              aria-label="Daftar Nomor Soal"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Progressive Anti-Cheat Warning Banner (Violation 1 & 2) */}
      {warningModal && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2.5">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>
                  Peringatan Pelanggaran {warningModal.count} dari {warningModal.max}:
                </strong>{' '}
                {warningModal.reason}. Pada pelanggaran ke-{warningModal.max}, layar ujian akan
                terkunci otomatis!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setWarningModal(null)}
              className="px-2.5 py-1 bg-amber-900 text-white text-xs font-semibold rounded-md hover:bg-amber-800 whitespace-nowrap shrink-0"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Main Two-Column Exam Layout (70% Question Stage Left, 30% Navigation & 3D Proctor Right) */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: QUESTION STAGE (8 cols on lg) */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-sm">
          {/* Question Header Meta */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-lg bg-blue-700 text-white font-mono font-bold text-sm tabular-nums">
                Soal {currentIdx + 1} / {questions.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Kode Soal #{currentQuestion.no} · {getTypeLabel(currentQuestion.tipe)} · Bobot{' '}
                {currentQuestion.bobot} Poin
              </span>
            </div>
          </div>

          {/* Stimulus / Case Study Text */}
          {currentQuestion.stimulus && (
            <div className="mb-4 p-4 bg-slate-50 border border-slate-200/90 rounded-xl text-slate-800 text-[15px] leading-relaxed whitespace-pre-line">
              {currentQuestion.stimulus}
            </div>
          )}

          {/* Code Block / Pseudocode (Monospace) */}
          {currentQuestion.kodeProgram && (
            <div className="mb-4 rounded-xl overflow-hidden border border-slate-300 bg-slate-900 text-slate-100">
              <div className="px-3.5 py-1.5 bg-slate-800 text-[11px] font-mono text-slate-300 border-b border-slate-700">
                Potongan Pseudocode / Kode Program
              </div>
              <pre className="p-4 text-xs sm:text-sm font-mono leading-relaxed overflow-x-auto">
                <code>{currentQuestion.kodeProgram}</code>
              </pre>
            </div>
          )}

          {/* Structured Data Table (Questions 13, 19, 37) */}
          {currentQuestion.tabel && (
            <div className="mb-5 overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-800">
                    {currentQuestion.tabel.headers.map((h, i) => (
                      <th key={i} className="py-2.5 px-3.5 font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentQuestion.tabel.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/80">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="py-2.5 px-3.5 text-slate-700 font-medium tabular-nums"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SVG Vector Diagram (Questions 4 and 16) */}
          {currentQuestion.svgType && <QuestionSvgDiagrams svgType={currentQuestion.svgType} />}

          {/* Optional External Image URL Support */}
          {currentQuestion.gambar_url && (
            <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-center">
              <img
                src={currentQuestion.gambar_url}
                alt={`Ilustrasi Soal ${currentQuestion.no}`}
                referrerPolicy="no-referrer"
                className="max-h-72 object-contain rounded-lg"
              />
            </div>
          )}

          {/* Main Question Prompt */}
          <div className="text-base sm:text-[17px] font-semibold text-slate-900 leading-relaxed whitespace-pre-line mb-6">
            {currentQuestion.teks}
          </div>

          {/* ===================== INPUT CONTROLS PER QUESTION TYPE ===================== */}

          {/* 1. PILIHAN GANDA (Single Choice Radio Buttons) */}
          {currentQuestion.tipe === 'PG' && (
            <div className="space-y-2.5">
              {shuffledOptions.map((opt) => {
                const isSelected = currentAnsObj.jawaban === opt.originalKey;
                return (
                  <button
                    key={opt.originalKey}
                    type="button"
                    onClick={() => updateAnswer(currentQuestion.no, opt.originalKey)}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-start gap-3.5 min-h-[48px] ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-600 ring-1 ring-blue-600 text-slate-900'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {opt.displayLabel}
                    </span>
                    <span className="text-sm sm:text-[15px] leading-relaxed">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. PILIHAN GANDA KOMPLEKS (Multiple Choice Checkboxes) */}
          {currentQuestion.tipe === 'PGK' && (
            <div className="space-y-2.5">
              <div className="text-xs font-medium text-blue-800 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg mb-2">
                Petunjuk: Klik untuk mencentang <strong>lebih dari satu</strong> pernyataan yang
                benar.
              </div>
              {shuffledOptions.map((opt) => {
                const isChecked = selectedPgkKeys.includes(opt.originalKey);
                return (
                  <button
                    key={opt.originalKey}
                    type="button"
                    onClick={() => {
                      const nextSet = new Set(selectedPgkKeys);
                      if (nextSet.has(opt.originalKey)) {
                        nextSet.delete(opt.originalKey);
                      } else {
                        nextSet.add(opt.originalKey);
                      }
                      const sorted = Array.from(nextSet).sort().join(',');
                      updateAnswer(currentQuestion.no, sorted);
                    }}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-start gap-3.5 min-h-[48px] ${
                      isChecked
                        ? 'bg-blue-50/90 border-blue-600 ring-1 ring-blue-600 text-slate-900'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-md font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border ${
                        isChecked
                          ? 'bg-blue-700 border-blue-700 text-white'
                          : 'bg-white border-slate-300 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <div className="text-sm sm:text-[15px] leading-relaxed">
                      <span className="font-mono font-bold text-slate-600 mr-2">
                        [{opt.displayLabel}]
                      </span>
                      {opt.text}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 3. MENJODOHKAN (Mobile-friendly Dropdown per Row) */}
          {currentQuestion.tipe === 'MENJODOHKAN' &&
            currentQuestion.menjodohkan_kiri &&
            currentQuestion.menjodohkan_kanan && (
              <div className="space-y-4">
                {/* Reference Box for Right Column Options */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-xs font-bold text-slate-700 mb-2">
                    Daftar Pilihan Pasangan (Lajur Kanan):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-800">
                    {currentQuestion.menjodohkan_kanan.map((kanan) => (
                      <div
                        key={kanan.id}
                        className="p-2.5 bg-white border border-slate-200 rounded-lg font-medium"
                      >
                        {kanan.teks}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Matching Rows with Mobile-Friendly Select Dropdowns */}
                <div className="space-y-3">
                  {currentQuestion.menjodohkan_kiri.map((kiri) => {
                    const currentVal = matchingMap[kiri.id] || '';
                    return (
                      <div
                        key={kiri.id}
                        className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="text-sm sm:text-[15px] font-medium text-slate-900 sm:max-w-[58%]">
                          {kiri.premis}
                        </div>
                        <div className="sm:w-[38%]">
                          <select
                            value={currentVal}
                            onChange={(e) => {
                              const nextMap = { ...matchingMap, [kiri.id]: e.target.value };
                              if (!e.target.value) delete nextMap[kiri.id];
                              updateAnswer(
                                currentQuestion.no,
                                Object.keys(nextMap).length > 0 ? JSON.stringify(nextMap) : ''
                              );
                            }}
                            className={`w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[44px] ${
                              currentVal
                                ? 'bg-blue-50 border-blue-500 text-blue-950 font-semibold'
                                : 'bg-slate-50 border-slate-300 text-slate-700'
                            }`}
                          >
                            <option value="">-- Pilih Pasangan --</option>
                            {currentQuestion.menjodohkan_kanan?.map((kanan) => (
                              <option key={kanan.id} value={kanan.id}>
                                {kanan.teks}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* 4. ISIAN SINGKAT (Text Input,允许ketik) */}
          {currentQuestion.tipe === 'ISIAN' && (
            <div className="space-y-2 select-text">
              <label className="block text-xs font-bold text-slate-700">
                Ketik Jawaban Singkat Anda:
              </label>
              <input
                type="text"
                value={currentAnsObj.jawaban}
                onChange={(e) => updateAnswer(currentQuestion.no, e.target.value)}
                placeholder="Ketik jawaban singkat di sini..."
                className="w-full px-4 py-3 text-base font-medium text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-xs text-slate-500">
                Huruf besar/kecil dan spasi di ujung akan dinormalisasi otomatis oleh server saat
                penilaian.
              </p>
            </div>
          )}

          {/* 5. URAIAN (Long Textarea) */}
          {currentQuestion.tipe === 'URAIAN' && (
            <div className="space-y-2 select-text">
              <label className="block text-xs font-bold text-slate-700">
                Ketik Jawaban Uraian / Algoritma Anda secara Lengkap:
              </label>
              <textarea
                rows={8}
                value={currentAnsObj.jawaban}
                onChange={(e) => updateAnswer(currentQuestion.no, e.target.value)}
                placeholder="Tuliskan jawaban uraian atau langkah-langkah pseudocode Anda di sini..."
                className="w-full p-4 text-sm sm:text-base font-mono text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Soal uraian dinilai oleh Guru Informatika berdasarkan rubrik (0–7 poin).</span>
                <span className="font-mono tabular-nums">
                  {currentAnsObj.jawaban.length} karakter
                </span>
              </div>
            </div>
          )}

          {/* Bottom Question Action Controls (Sebelumnya, Ragu-ragu, Selanjutnya / Selesai) */}
          <div className="mt-8 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => goToQuestionIndex(currentIdx - 1)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-800 font-semibold text-sm flex items-center gap-1.5 min-h-[44px] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Sebelumnya
            </button>

            <button
              type="button"
              onClick={() =>
                updateAnswer(
                  currentQuestion.no,
                  currentAnsObj.jawaban,
                  !currentAnsObj.ragu_ragu
                )
              }
              className={`px-4 py-2.5 rounded-xl border font-semibold text-sm flex items-center gap-2 min-h-[44px] transition-colors ${
                currentAnsObj.ragu_ragu
                  ? 'bg-amber-500 border-amber-600 text-white'
                  : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
              }`}
            >
              <Flag className="w-4 h-4" />
              {currentAnsObj.ragu_ragu ? 'Ditandai Ragu-ragu' : 'Tandai Ragu-ragu'}
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => goToQuestionIndex(currentIdx + 1)}
                className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm flex items-center gap-1.5 min-h-[44px] transition-colors"
              >
                Selanjutnya
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm flex items-center gap-2 min-h-[44px] transition-colors"
              >
                <Send className="w-4 h-4" />
                Selesai & Kumpulkan
              </button>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: 3D PROCTOR AVATAR & 40-QUESTION NAVIGATION GRID (4 cols on lg) */}
        <aside className="lg:col-span-4 space-y-5">
          {/* 3D Proctor Avatar Widget */}
          <ProctorAvatar3D
            message={proctorMessage}
            mood={proctorMood}
            violationCount={session.jumlah_pelanggaran}
            maxViolations={dbState.pengaturan.batas_pelanggaran}
          />

          {/* Question Number Navigation Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">Navigasi 40 Soal</h2>
              <span className="text-xs font-mono font-semibold text-slate-600 tabular-nums">
                {answeredCount}/40 Terjawab
              </span>
            </div>

            {/* Color + Symbol Legend (No Hue-Only Signaling) */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 mb-4 pb-3 border-b border-slate-200">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-600 inline-block" /> ✓ Hijau: Terjawab (
                {answeredCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-500 inline-block" /> ? Kuning: Ragu (
                {doubtfulCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-slate-200 inline-block" /> Abu: Kosong (
                {unansweredCount})
              </span>
            </div>

            {/* 40-Button Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const ans = answers[q.no];
                const hasAnswer = Boolean(ans?.jawaban && String(ans.jawaban).trim() !== '');
                const isRagu = Boolean(ans?.ragu_ragu);
                const isCurrent = idx === currentIdx;

                let btnStyle =
                  'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200';
                if (isRagu) {
                  btnStyle = 'bg-amber-500 text-white border-amber-600 font-bold';
                } else if (hasAnswer) {
                  btnStyle = 'bg-emerald-600 text-white border-emerald-700 font-bold';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => goToQuestionIndex(idx)}
                    className={`h-10 rounded-lg border font-mono text-xs tabular-nums flex flex-col items-center justify-center transition-all relative ${btnStyle} ${
                      isCurrent ? 'ring-2 ring-blue-700 ring-offset-2' : ''
                    }`}
                    title={`Urutan ${idx + 1} (${q.tipe})`}
                  >
                    <span>{idx + 1}</span>
                    <span className="text-[9px] opacity-80 leading-none">
                      {isRagu ? '?' : hasAnswer ? '✓' : q.tipe.slice(0, 2)}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowConfirmSubmit(true)}
              className="mt-5 w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Selesai & Kumpulkan Ujian
            </button>
          </div>
        </aside>
      </main>

      {/* Mobile Question Navigation Drawer */}
      {showMobileNavDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex justify-end lg:hidden">
          <div className="w-full max-w-sm bg-white h-full p-5 overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-900">Navigasi Nomor Soal</h3>
                <button
                  type="button"
                  onClick={() => setShowMobileNavDrawer(false)}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const ans = answers[q.no];
                  const hasAnswer = Boolean(ans?.jawaban && String(ans.jawaban).trim() !== '');
                  const isRagu = Boolean(ans?.ragu_ragu);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => goToQuestionIndex(idx)}
                      className={`h-11 rounded-lg border font-mono text-xs font-bold tabular-nums ${
                        isRagu
                          ? 'bg-amber-500 text-white border-amber-600'
                          : hasAnswer
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowMobileNavDrawer(false);
                setShowConfirmSubmit(true);
              }}
              className="mt-6 w-full py-3 bg-emerald-700 text-white font-semibold text-sm rounded-xl"
            >
              Selesai & Kumpulkan Ujian
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal Before Final Submit */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-700" />
                <h3 className="text-lg font-bold text-slate-900">
                  Konfirmasi Pengumpulan Ujian
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5 text-center">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-xs text-emerald-800 block">Sudah Terjawab</span>
                <span className="text-xl font-mono font-bold text-emerald-700 tabular-nums">
                  {answeredCount}
                </span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-xs text-amber-800 block">Ragu-ragu</span>
                <span className="text-xl font-mono font-bold text-amber-700 tabular-nums">
                  {doubtfulCount}
                </span>
              </div>
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-600 block">Belum Dijawab</span>
                <span className="text-xl font-mono font-bold text-slate-800 tabular-nums">
                  {unansweredCount}
                </span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <strong>Perhatian:</strong> Masih ada <strong>{unansweredCount} soal</strong> yang
                belum Anda jawab (Urutan:{' '}
                {questions
                  .map((q, i) => ({ i: i + 1, ans: answers[q.no]?.jawaban }))
                  .filter((x) => !x.ans || String(x.ans).trim() === '')
                  .slice(0, 12)
                  .map((x) => x.i)
                  .join(', ')}
                {unansweredCount > 12 ? ', dst.' : ''}).
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Setelah Anda menekan tombol <strong>Kumpulkan Sekarang</strong>, seluruh jawaban akan
              dikirim final ke server dan Anda tidak dapat kembali mengerjakan soal.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50"
              >
                Kembali Periksa Soal
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Kumpulkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
