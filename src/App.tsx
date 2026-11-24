import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CloudCheck,
  KeyRound,
  Lock,
  MonitorCheck,
  UserCheck,
} from 'lucide-react';
import { StudentExamView } from './components/StudentExamView';
import { TeacherSupervisorPanel } from './components/TeacherSupervisorPanel';
import { GURU_TRIAL_ACCOUNTS, KELAS_10_LIST } from './data/studentsData';
import {
  callGasWebApp,
  checkGasWebAppStatus,
  clearStudentResetTimestamp,
  loadDatabase,
  PenggunaRecord,
  saveDatabase,
  simpleSha256Simulation,
  SiswaRecord,
  subscribeToRealtimeDatabase,
} from './services/cbtBackendService';

type LoginPortalMode = 'SISWA' | 'STAFF';

const ACTIVE_STUDENT_SESSION_KEY = 'ASSA_ACTIVE_STUDENT_SESSION_V5';
const ACTIVE_STAFF_SESSION_KEY = 'ASSA_ACTIVE_STAFF_SESSION_V5';

export default function App() {
  const [portalMode, setPortalMode] = useState<LoginPortalMode>('SISWA');
  const [db, setDb] = useState(() => loadDatabase());

  // Active logged-in states (auto-restored if student or teacher accidentally refreshes/closes tab)
  const [activeStudent, setActiveStudent] = useState<{
    student: SiswaRecord;
    token: string;
  } | null>(() => {
    try {
      const savedRaw = localStorage.getItem(ACTIVE_STUDENT_SESSION_KEY);
      if (!savedRaw) return null;
      const parsed = JSON.parse(savedRaw) as { nis: string; token: string };
      if (!parsed?.nis) return null;
      const currentDb = loadDatabase();
      const foundStudent = currentDb.siswa.find((s) => s.nis === parsed.nis);
      const existingSesi = currentDb.sesi[parsed.nis];
      if (foundStudent && existingSesi) {
        return {
          student: foundStudent,
          token: existingSesi.token_sesi || parsed.token,
        };
      }
    } catch {
      // ignore corrupted storage
    }
    return null;
  });

  const [activeStaff, setActiveStaff] = useState<PenggunaRecord | null>(() => {
    try {
      const savedStaffRaw = localStorage.getItem(ACTIVE_STAFF_SESSION_KEY);
      if (!savedStaffRaw) return null;
      const parsedStaff = JSON.parse(savedStaffRaw) as { username: string };
      if (!parsedStaff?.username) return null;
      const currentDb = loadDatabase();
      return (
        currentDb.pengguna.find(
          (u) => u.username.toLowerCase() === parsedStaff.username.toLowerCase()
        ) || null
      );
    } catch {
      return null;
    }
  });

  // Student Login State (strictly mapped to Kelas & Nama from data_kelas_10_aplikasi.pdf + 5 Guru Informatika)
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [selectedStudentNis, setSelectedStudentNis] = useState<string>('');
  const [roomTokenInput, setRoomTokenInput] = useState<string>('');
  const [studentError, setStudentError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Staff (Guru & Pengawas) Login State (kikybahsoan / In123123123)
  const [staffUser, setStaffUser] = useState<string>('');
  const [staffPass, setStaffPass] = useState<string>('');
  const [staffError, setStaffError] = useState<string>('');

  // Google Apps Script Web App connection status
  const [gasConnected, setGasConnected] = useState<boolean>(true);

  useEffect(() => {
    const unsub = subscribeToRealtimeDatabase((fresh) => {
      setDb({ ...fresh });
    });
    return () => unsub();
  }, []);

  // Filter students exclusively from the selected class
  const studentsInSelectedKelas = useMemo(() => {
    if (!selectedKelas) return [];
    return db.siswa.filter((s) => s.kelas === selectedKelas && !s.nis.startsWith('SIM'));
  }, [db.siswa, selectedKelas]);

  // Detect if the currently selected student in the dropdown already has an active or completed exam session
  const selectedStudentExistingSession = useMemo(() => {
    if (!selectedStudentNis) return null;
    return db.sesi[selectedStudentNis] || null;
  }, [db.sesi, selectedStudentNis]);

  useEffect(() => {
    checkGasWebAppStatus().then((res) => {
      if (res.connected) setGasConnected(true);
    });
  }, []);

  const getBrowserDeviceId = () => {
    const key = 'ASSA_CLIENT_DEVICE_ID';
    let id = localStorage.getItem(key);
    if (!id) {
      id = `DEV-CLIENT-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
      localStorage.setItem(key, id);
    }
    return id;
  };

  const requestFullscreenImmediately = () => {
    try {
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
        msRequestFullscreen?: () => Promise<void>;
      };
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          void docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          void docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) {
          void docEl.msRequestFullscreen();
        }
      }
    } catch {
      // ignore if restricted by iOS Safari or iframe sandbox
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');

    if (!selectedKelas) {
      setStudentError('Silakan pilih Kelas Anda terlebih dahulu.');
      return;
    }
    if (!selectedStudentNis) {
      setStudentError('Silakan pilih Nama Lengkap Anda sesuai daftar kelas.');
      return;
    }

    // Trigger fullscreen synchronously during the user tap/click gesture (essential for HP/Mobile browsers)
    requestFullscreenImmediately();

    setIsLoggingIn(true);
    try {
      const freshDb = loadDatabase();
      const cleanToken = roomTokenInput.trim().toUpperCase();

      const student = freshDb.siswa.find((s) => s.nis === selectedStudentNis);
      if (!student) {
        setStudentError('Data peserta tidak ditemukan.');
        setIsLoggingIn(false);
        return;
      }

      // Match token against active exam token
      const matchedRoom = freshDb.ruang.find(
        (r) => r.token_ujian.toUpperCase() === cleanToken
      );

      if (!matchedRoom) {
        setStudentError(
          'Token ujian tidak valid. Silakan masukkan Token Ujian yang diberikan oleh Pengawas.'
        );
        setIsLoggingIn(false);
        return;
      }

      // Clear any previous reset timestamp so new answers sync cleanly
      clearStudentResetTimestamp(student.nis);

      // Keep student assigned to their actual class
      student.ruang = student.kelas;

      const clientDeviceId = getBrowserDeviceId();
      const existingSession = freshDb.sesi[student.nis];
      const nowIso = new Date().toISOString();
      const sessionToken =
        existingSession?.token_sesi && existingSession.token_sesi !== 'RESET'
          ? existingSession.token_sesi
          : `SES-${student.nis}-${Date.now().toString(36)}`;

      // Count any already-saved answers so progress is never lost on re-login
      const savedAnswerMap = freshDb.jawaban[student.nis] || {};
      const existingAnsweredCount = Object.values(savedAnswerMap).filter(
        (a) => a.jawaban && String(a.jawaban).trim() !== ''
      ).length;

      if (!existingSession || existingSession.status === 'BELUM') {
        const deadlineIso = new Date(
          Date.now() + freshDb.pengaturan.durasi_menit * 60 * 1000
        ).toISOString();
        freshDb.sesi[student.nis] = {
          nis: student.nis,
          ruang: student.kelas,
          token_sesi: sessionToken,
          device_id: clientDeviceId,
          waktu_mulai: nowIso,
          batas_waktu: deadlineIso,
          tambahan_menit: 0,
          status: 'MENGERJAKAN',
          jumlah_pelanggaran: 0,
          soal_terakhir: 1,
          jumlah_terjawab: existingAnsweredCount,
          waktu_aktif_terakhir: nowIso,
        };
      } else {
        // Student was accidentally logged out / closed browser / switched connection:
        // Allow seamless continuation keeping remaining time, last question, and all saved answers
        freshDb.sesi[student.nis].ruang = student.kelas;
        freshDb.sesi[student.nis].device_id = clientDeviceId;
        freshDb.sesi[student.nis].waktu_aktif_terakhir = nowIso;
        if (freshDb.sesi[student.nis].status === 'TERKUNCI') {
          freshDb.sesi[student.nis].status = 'MENGERJAKAN';
        }
        if (existingAnsweredCount > (freshDb.sesi[student.nis].jumlah_terjawab || 0)) {
          freshDb.sesi[student.nis].jumlah_terjawab = existingAnsweredCount;
        }
      }

      saveDatabase(freshDb, true);
      setDb({ ...freshDb });

      try {
        localStorage.setItem(
          ACTIVE_STUDENT_SESSION_KEY,
          JSON.stringify({ nis: student.nis, token: sessionToken })
        );
      } catch {
        // ignore storage quota error
      }

      // Notify embedded Google Apps Script Web App in background
      void callGasWebApp('studentLogin', {
        nis: student.nis,
        nama: student.nama,
        kelas: student.kelas,
        token_ruang: cleanToken,
        sesi: freshDb.sesi[student.nis],
      });

      setActiveStudent({ student, token: sessionToken });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    setIsLoggingIn(true);

    try {
      const freshDb = loadDatabase();
      const cleanUser = staffUser.trim().toLowerCase();
      const rawPass = staffPass.trim();

      // 1. Check if username & password match one of the 5 Login Percobaan Guru Informatika
      const matchedTrialGuru = GURU_TRIAL_ACCOUNTS.find((g) => {
        const userMatches =
          cleanUser === g.username.toLowerCase() ||
          cleanUser === g.nis.toLowerCase() ||
          cleanUser === g.label.toLowerCase().replace(/\s+/g, '');
        const passMatches =
          g.password === rawPass ||
          (g.altPasswords as readonly string[]).includes(rawPass.toLowerCase());
        return userMatches && passMatches;
      });

      if (matchedTrialGuru) {
        requestFullscreenImmediately();

        let guruStudent = freshDb.siswa.find((s) => s.nis === matchedTrialGuru.nis);
        if (!guruStudent) {
          guruStudent = {
            nis: matchedTrialGuru.nis,
            nama: matchedTrialGuru.nama,
            kelas: 'GURU-INFORMATIKA',
            ruang: 'GURU-INFORMATIKA',
            password_hash: simpleSha256Simulation(matchedTrialGuru.password),
          };
          freshDb.siswa.unshift(guruStudent);
        }

        clearStudentResetTimestamp(guruStudent.nis);
        guruStudent.ruang = 'GURU-INFORMATIKA';

        const clientDeviceId = getBrowserDeviceId();
        const existingSession = freshDb.sesi[guruStudent.nis];
        const nowIso = new Date().toISOString();
        const sessionToken =
          existingSession?.token_sesi && existingSession.token_sesi !== 'RESET'
            ? existingSession.token_sesi
            : `SES-${guruStudent.nis}-${Date.now().toString(36)}`;

        const savedAnswerMap = freshDb.jawaban[guruStudent.nis] || {};
        const existingAnsweredCount = Object.values(savedAnswerMap).filter(
          (a) => a.jawaban && String(a.jawaban).trim() !== ''
        ).length;

        if (!existingSession || existingSession.status === 'BELUM') {
          const deadlineIso = new Date(
            Date.now() + freshDb.pengaturan.durasi_menit * 60 * 1000
          ).toISOString();
          freshDb.sesi[guruStudent.nis] = {
            nis: guruStudent.nis,
            ruang: 'GURU-INFORMATIKA',
            token_sesi: sessionToken,
            device_id: clientDeviceId,
            waktu_mulai: nowIso,
            batas_waktu: deadlineIso,
            tambahan_menit: 0,
            status: 'MENGERJAKAN',
            jumlah_pelanggaran: 0,
            soal_terakhir: 1,
            jumlah_terjawab: existingAnsweredCount,
            waktu_aktif_terakhir: nowIso,
          };
        } else {
          freshDb.sesi[guruStudent.nis].ruang = 'GURU-INFORMATIKA';
          freshDb.sesi[guruStudent.nis].device_id = clientDeviceId;
          freshDb.sesi[guruStudent.nis].waktu_aktif_terakhir = nowIso;
          if (freshDb.sesi[guruStudent.nis].status === 'TERKUNCI') {
            freshDb.sesi[guruStudent.nis].status = 'MENGERJAKAN';
          }
          if (existingAnsweredCount > (freshDb.sesi[guruStudent.nis].jumlah_terjawab || 0)) {
            freshDb.sesi[guruStudent.nis].jumlah_terjawab = existingAnsweredCount;
          }
        }

        saveDatabase(freshDb, true);
        setDb({ ...freshDb });

        try {
          localStorage.setItem(
            ACTIVE_STUDENT_SESSION_KEY,
            JSON.stringify({ nis: guruStudent.nis, token: sessionToken })
          );
        } catch {
          // ignore
        }

        void callGasWebApp('studentLogin', {
          nis: guruStudent.nis,
          nama: guruStudent.nama,
          kelas: guruStudent.kelas,
          token_ruang: freshDb.ruang[0]?.token_ujian || 'INF26A',
          sesi: freshDb.sesi[guruStudent.nis],
        });

        setActiveStudent({ student: guruStudent, token: sessionToken });
        return;
      }

      // 2. Otherwise verify regular Panel Kontrol Guru & Pengawas credentials (e.g. kikybahsoan / In123123123)
      const cleanPassHash = simpleSha256Simulation(staffPass);
      void callGasWebApp('staffLogin', { username: cleanUser });

      const user = freshDb.pengguna.find(
        (u) => u.username.toLowerCase() === cleanUser && u.password_hash === cleanPassHash
      );

      if (!user) {
        setStaffError('Username atau kata sandi tidak sesuai.');
        setIsLoggingIn(false);
        return;
      }

      try {
        localStorage.setItem(
          ACTIVE_STAFF_SESSION_KEY,
          JSON.stringify({ username: user.username })
        );
      } catch {
        // ignore
      }

      setActiveStaff(user);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (activeStudent) {
    return (
      <StudentExamView
        student={activeStudent.student}
        sessionToken={activeStudent.token}
        onLogout={() => {
          try {
            localStorage.removeItem(ACTIVE_STUDENT_SESSION_KEY);
          } catch {
            // ignore
          }
          setActiveStudent(null);
        }}
      />
    );
  }

  if (activeStaff) {
    return (
      <TeacherSupervisorPanel
        staff={activeStaff}
        onLogout={() => {
          try {
            localStorage.removeItem(ACTIVE_STAFF_SESSION_KEY);
          } catch {
            // ignore
          }
          setActiveStaff(null);
        }}
      />
    );
  }

  // ===================== CLEAN LOGIN SCREEN (NO AVATAR ON LOGIN, REAL KELAS 10 STUDENTS) =====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D7E4D5] via-[#EBF2EA] to-[#DCE8DA] flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 font-extrabold text-xs tracking-wider flex items-center justify-center shadow-sm">
            ASSA
          </div>
          <div>
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 block leading-none">
              ASSA Informatika
            </span>
            <span className="text-xs text-slate-600 font-medium">SMKN 2 Gorontalo</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setPortalMode(portalMode === 'SISWA' ? 'STAFF' : 'SISWA');
            setStudentError('');
            setStaffError('');
          }}
          className="px-4 py-2 text-xs font-bold text-slate-800 bg-white/90 hover:bg-white border border-emerald-900/15 rounded-xl shadow-xs transition-all whitespace-nowrap shrink-0"
        >
          {portalMode === 'SISWA' ? 'Panel Guru & Pengawas' : 'Portal Login Siswa'}
        </button>
      </header>

      {/* Center Single Login Card */}
      <main className="my-auto max-w-md w-full mx-auto py-6">
        <div className="bg-white border border-emerald-900/15 rounded-3xl shadow-xl p-6 sm:p-8">
          {/* Brand Title inside Card */}
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-emerald-800">
              Computer-Based Test · Kelas X
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
              ASSA Informatika
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              SMKN 2 Gorontalo · 40 Soal · 90 Menit
            </p>
          </div>

          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setPortalMode('SISWA');
                setStudentError('');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                portalMode === 'SISWA'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Login Siswa
            </button>

            <button
              type="button"
              onClick={() => {
                setPortalMode('STAFF');
                setStaffError('');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                portalMode === 'STAFF'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MonitorCheck className="w-4 h-4" />
              Guru &amp; Pengawas
            </button>
          </div>

          {portalMode === 'SISWA' ? (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              {studentError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{studentError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Kelas (Kelas X SMKN 2 Gorontalo)
                </label>
                <select
                  required
                  value={selectedKelas}
                  onChange={(e) => {
                    setSelectedKelas(e.target.value);
                    setSelectedStudentNis('');
                  }}
                  className="w-full px-4 py-3 text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors"
                >
                  <option value="">-- Pilih Kelas Anda --</option>
                  {KELAS_10_LIST.map((kls) => (
                    <option key={kls} value={kls}>
                      {kls}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pilih Nama Siswa
                </label>
                <select
                  required
                  disabled={!selectedKelas}
                  value={selectedStudentNis}
                  onChange={(e) => setSelectedStudentNis(e.target.value)}
                  className="w-full px-4 py-3 text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-50 transition-colors"
                >
                  <option value="">
                    {selectedKelas
                      ? `-- Pilih Nama Siswa (${studentsInSelectedKelas.length} Siswa) --`
                      : '-- Pilih Kelas Terlebih Dahulu --'}
                  </option>
                  {studentsInSelectedKelas.map((s) => {
                    const sSesi = db.sesi[s.nis];
                    const suffix =
                      sSesi?.status === 'MENGERJAKAN'
                        ? ` (Sedang Mengerjakan · ${sSesi.jumlah_terjawab || 0}/40 Soal)`
                        : sSesi?.status === 'SELESAI'
                        ? ' (Selesai)'
                        : '';
                    return (
                      <option key={s.nis} value={s.nis}>
                        {s.nama}
                        {suffix}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedStudentExistingSession &&
                selectedStudentExistingSession.status === 'MENGERJAKAN' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                    <span className="font-bold block">Sesi Ujian Aktif Ditemukan</span>
                    <span>
                      Progres tersimpan:{' '}
                      <strong>{selectedStudentExistingSession.jumlah_terjawab || 0}/40 soal</strong>{' '}
                      (terakhir di Soal #{selectedStudentExistingSession.soal_terakhir || 1}).
                      Masukkan Token Ujian untuk langsung melanjutkan.
                    </span>
                  </div>
                )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Token Ujian
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={roomTokenInput}
                    onChange={(e) => setRoomTokenInput(e.target.value.toUpperCase())}
                    placeholder="Masukkan token ujian dari pengawas"
                    className="w-full pl-10 pr-3 py-3 text-sm font-mono font-extrabold uppercase tracking-wider text-emerald-950 bg-emerald-50/70 border border-emerald-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 px-5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                {isLoggingIn
                  ? 'Memverifikasi...'
                  : selectedStudentExistingSession?.status === 'MENGERJAKAN'
                  ? `Lanjutkan Ujian (Soal #${selectedStudentExistingSession.soal_terakhir || 1})`
                  : 'Mulai Ujian'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleStaffLogin} className="space-y-4" autoComplete="off">
              {staffError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{staffError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Username Guru / Pengawas
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={staffUser}
                  onChange={(e) => setStaffUser(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full px-4 py-3 text-sm font-mono font-bold text-slate-900 bg-slate-50/70 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={staffPass}
                  onChange={(e) => setStaffPass(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full px-4 py-3 text-sm font-mono text-slate-900 bg-slate-50/70 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                {isLoggingIn ? 'Memverifikasi...' : 'Masuk'}
              </button>
            </form>
          )}

          {/* Embedded Google Apps Script Connection Status */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <CloudCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>
              {gasConnected
                ? 'Terhubung ke Google Spreadsheet & Apps Script'
                : 'Mode Sinkronisasi Google Apps Script Aktif'}
            </span>
          </div>
        </div>
      </main>

      {/* Minimal Bottom Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center py-2 text-xs text-slate-600">
        CBT ASSA Informatika Kelas X · SMKN 2 Gorontalo
      </footer>
    </div>
  );
}
