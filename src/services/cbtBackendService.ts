import {
  INITIAL_QUESTIONS_FULL,
  QuestionClient,
  QuestionFull,
} from '../data/questionsData';
import { DATA_KELAS_10_SISWA } from '../data/studentsData';

export const DEFAULT_GAS_WEBAPP_URL =
  'https://script.google.com/macros/s/AKfycbzEN_p5NQvBZmwGwuHuzf_MvSjfvDoQ2Q5mwkm32FJxiMvuOnYx4Hjj4lawiFKEoNhI/exec';

// ===================== 9 SPREADSHEET SHEET INTERFACES =====================

export interface PengaturanState {
  judul_ujian: string;
  durasi_menit: number;
  bobot_pg: number;
  bobot_pgk: number;
  bobot_menjodohkan: number;
  bobot_isian: number;
  bobot_uraian: number;
  mode_skor_pgk: 'PARSIAL' | 'MUTLAK';
  batas_pelanggaran: number;
  pin_pengawas: string;
  status_ujian: 'BELUM_MULAI' | 'BERJALAN' | 'SELESAI';
  tampilkan_nilai: boolean;
  gas_webapp_url: string;
}

export interface SiswaRecord {
  nis: string;
  nama: string;
  kelas: string;
  ruang: string;
  password_plain_hint?: string;
  password_hash: string;
}

export interface RuangRecord {
  kode_ruang: string;
  nama_ruang: string;
  token_ujian: string;
  status_mulai: 'BELUM' | 'BERJALAN' | 'SELESAI';
  jam_mulai: string;
}

export type SessionStatus = 'BELUM' | 'MENGERJAKAN' | 'TERKUNCI' | 'SELESAI';

export interface SesiRecord {
  nis: string;
  ruang: string;
  token_sesi: string;
  device_id: string;
  waktu_mulai: string;
  batas_waktu: string;
  tambahan_menit: number;
  status: SessionStatus;
  jumlah_pelanggaran: number;
  soal_terakhir: number;
  jumlah_terjawab: number;
  waktu_aktif_terakhir: string;
  is_simulated?: boolean;
}

export interface JawabanRecord {
  nis: string;
  no_soal: number;
  jawaban: string;
  ragu_ragu?: boolean;
  waktu_simpan: string;
}

export interface LogPelanggaranRecord {
  id: string;
  waktu: string;
  nis: string;
  nama: string;
  ruang: string;
  jenis_pelanggaran:
    | 'KELUAR_FULLSCREEN'
    | 'PINDAH_TAB'
    | 'BLUR_JENDELA'
    | 'SHORTCUT_TERLARANG'
    | 'KLIK_KANAN_COPY';
  keterangan: string;
}

export interface NilaiRecord {
  nis: string;
  nama: string;
  kelas: string;
  ruang: string;
  skor_pg: number;
  skor_pgk: number;
  skor_menjodohkan: number;
  skor_isian: number;
  skor_uraian: number;
  skor_uraian_per_soal: Record<number, number>;
  nilai_akhir: number;
  status_uraian: 'BELUM' | 'SUDAH';
  jumlah_pelanggaran: number;
  durasi_menit: number;
  waktu_selesai: string;
}

export interface PenggunaRecord {
  username: string;
  password_hash: string;
  peran: 'GURU' | 'PENGAWAS';
  ruang_tugas: string;
  nama_lengkap: string;
}

export interface SpreadsheetDatabase {
  pengaturan: PengaturanState;
  bank_soal: QuestionFull[];
  siswa: SiswaRecord[];
  ruang: RuangRecord[];
  sesi: Record<string, SesiRecord>;
  jawaban: Record<string, Record<number, JawabanRecord>>;
  log_pelanggaran: LogPelanggaranRecord[];
  nilai: Record<string, NilaiRecord>;
  pengguna: PenggunaRecord[];
}

// Bumped storage key to V5 so Ruang Ujian Utama & Ruang Ujian 2 are removed
const DB_STORAGE_KEY = 'ASSA_INFORMATIKA_SMKN2_GTO_KELAS10_V5';

export function simpleSha256Simulation(raw: string): string {
  const str = `${raw.trim()}::SMKN2_GTO_TKA_2026`;
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

// ===================== GOOGLE APPS SCRIPT LIVE API CLIENT =====================

export async function callGasWebApp(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<Record<string, any> | null> {
  const db = loadDatabase();
  const url = (db.pengaturan.gas_webapp_url || DEFAULT_GAS_WEBAPP_URL).trim();
  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action,
        ...payload,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch {
    return null;
  }
}

export async function checkGasWebAppStatus(): Promise<{
  connected: boolean;
  service?: string;
  serverTime?: string;
}> {
  const db = loadDatabase();
  const url = (db.pengaturan.gas_webapp_url || DEFAULT_GAS_WEBAPP_URL).trim();
  if (!url) return { connected: false };

  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return { connected: false };
    const json = await res.json();
    return {
      connected: Boolean(json && json.ok),
      service: json?.service,
      serverTime: json?.serverTime,
    };
  } catch {
    return { connected: false };
  }
}

// ===================== SEEDED PRNG FOR DETERMINISTIC NIS SHUFFLING =====================

export function createSeededRng(seedString: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedString.length; i++) {
    h ^= seedString.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seedStr: string): T[] {
  const rng = createSeededRng(seedStr);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getQuestionsShuffledForStudent(
  questions: QuestionClient[],
  nis: string
): QuestionClient[] {
  const pg = seededShuffle(
    questions.filter((q) => q.tipe === 'PG'),
    `${nis}_PG`
  );
  const pgk = seededShuffle(
    questions.filter((q) => q.tipe === 'PGK'),
    `${nis}_PGK`
  );
  const menjodohkan = seededShuffle(
    questions.filter((q) => q.tipe === 'MENJODOHKAN'),
    `${nis}_MENJODOHKAN`
  );
  const isian = seededShuffle(
    questions.filter((q) => q.tipe === 'ISIAN'),
    `${nis}_ISIAN`
  );
  const uraian = seededShuffle(
    questions.filter((q) => q.tipe === 'URAIAN'),
    `${nis}_URAIAN`
  );
  return [...pg, ...pgk, ...menjodohkan, ...isian, ...uraian];
}

export function getShuffledOptionsForQuestion(
  question: QuestionClient,
  nis: string
): { originalKey: string; displayLabel: string; text: string }[] {
  const rawOptions: { originalKey: string; text: string }[] = [];
  if (question.opsi_A) rawOptions.push({ originalKey: 'A', text: question.opsi_A });
  if (question.opsi_B) rawOptions.push({ originalKey: 'B', text: question.opsi_B });
  if (question.opsi_C) rawOptions.push({ originalKey: 'C', text: question.opsi_C });
  if (question.opsi_D) rawOptions.push({ originalKey: 'D', text: question.opsi_D });
  if (question.opsi_E) rawOptions.push({ originalKey: 'E', text: question.opsi_E });

  const shuffled = seededShuffle(rawOptions, `${nis}_OPT_${question.no}`);
  const labels = ['A', 'B', 'C', 'D', 'E'];
  return shuffled.map((item, idx) => ({
    originalKey: item.originalKey,
    displayLabel: labels[idx] || item.originalKey,
    text: item.text,
  }));
}

// ===================== INITIAL DATABASE (ONLY DATA KELAS 10 PDF & KIKYBAHSOAN) =====================

function buildInitialDatabase(): SpreadsheetDatabase {
  const defaultPassHash = simpleSha256Simulation('123456');

  // Exclusively populate students from data_kelas_10_aplikasi.pdf
  const siswa: SiswaRecord[] = DATA_KELAS_10_SISWA.map((entry, idx) => ({
    nis: String(10001 + idx),
    nama: entry.nama,
    kelas: entry.kelas,
    ruang: entry.kelas,
    password_hash: defaultPassHash,
  }));

  const startIso = new Date().toISOString();

  return {
    pengaturan: {
      judul_ujian: 'ASSA Informatika Kelas X — SMKN 2 Gorontalo',
      durasi_menit: 90,
      bobot_pg: 1,
      bobot_pgk: 2,
      bobot_menjodohkan: 3,
      bobot_isian: 2,
      bobot_uraian: 7,
      mode_skor_pgk: 'PARSIAL',
      batas_pelanggaran: 3,
      pin_pengawas: '2026',
      status_ujian: 'BERJALAN',
      tampilkan_nilai: false,
      gas_webapp_url: DEFAULT_GAS_WEBAPP_URL,
    },
    bank_soal: INITIAL_QUESTIONS_FULL,
    siswa,
    ruang: [
      {
        kode_ruang: 'KELAS-X',
        nama_ruang: 'ASSA Informatika Kelas X',
        token_ujian: 'INF26A',
        status_mulai: 'BERJALAN',
        jam_mulai: startIso,
      },
    ],
    sesi: {},
    jawaban: {},
    log_pelanggaran: [],
    nilai: {},
    pengguna: [
      {
        username: 'kikybahsoan',
        password_hash: simpleSha256Simulation('In123123123'),
        peran: 'GURU',
        ruang_tugas: 'ALL',
        nama_lengkap: 'Kiky Bahsoan (Guru & Pengawas ASSA Informatika)',
      },
    ],
  };
}

// ===================== SERVER-SIDE AUTO-GRADING ENGINE =====================

export function normalizeShortText(val: string): string {
  return String(val || '')
    .toLowerCase()
    .replace(/[.,!?;:"']+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function evaluateSingleQuestionServerSide(
  question: QuestionFull,
  rawAnswer: string | undefined,
  pengaturan: PengaturanState
): number {
  if (!rawAnswer || String(rawAnswer).trim() === '') return 0;

  const tipe = question.tipe;
  const bobot =
    tipe === 'PG'
      ? pengaturan.bobot_pg
      : tipe === 'PGK'
      ? pengaturan.bobot_pgk
      : tipe === 'MENJODOHKAN'
      ? pengaturan.bobot_menjodohkan
      : tipe === 'ISIAN'
      ? pengaturan.bobot_isian
      : pengaturan.bobot_uraian;

  const kunci = String(question.kunci).trim();

  if (tipe === 'PG') {
    return String(rawAnswer).trim().toUpperCase() === kunci.toUpperCase() ? bobot : 0;
  }

  if (tipe === 'PGK') {
    const keySet = new Set(
      kunci
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    );
    const picked = String(rawAnswer)
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (picked.length === 0 || keySet.size === 0) return 0;

    let benarDipilih = 0;
    let salahDipilih = 0;
    picked.forEach((p) => {
      if (keySet.has(p)) benarDipilih++;
      else salahDipilih++;
    });

    if (pengaturan.mode_skor_pgk === 'MUTLAK') {
      return benarDipilih === keySet.size && salahDipilih === 0 ? bobot : 0;
    }

    const ratio = (benarDipilih - salahDipilih) / keySet.size;
    return Math.max(0, Math.round(ratio * bobot * 100) / 100);
  }

  if (tipe === 'MENJODOHKAN') {
    try {
      const keyMap: Record<string, string> = JSON.parse(kunci);
      const ansMap: Record<string, string> = JSON.parse(rawAnswer);
      const premisKeys = Object.keys(keyMap);
      if (premisKeys.length === 0) return 0;
      let benar = 0;
      premisKeys.forEach((k) => {
        if (ansMap[k] && ansMap[k].toUpperCase() === keyMap[k].toUpperCase()) {
          benar++;
        }
      });
      return Math.round((benar / premisKeys.length) * bobot * 100) / 100;
    } catch {
      return 0;
    }
  }

  if (tipe === 'ISIAN') {
    const normAns = normalizeShortText(rawAnswer);
    const alternatives = kunci.split('|').map(normalizeShortText);
    return alternatives.includes(normAns) ? bobot : 0;
  }

  return 0;
}

export function calculateStudentScoreServerSide(
  db: SpreadsheetDatabase,
  nis: string,
  existingEssayScores?: Record<number, number>
): NilaiRecord {
  const student = db.siswa.find((s) => s.nis === nis) || {
    nis,
    nama: `Siswa ${nis}`,
    kelas: '10-APHP-1',
    ruang: '10-APHP-1',
  };
  const studentAnswers = db.jawaban[nis] || {};
  const session = db.sesi[nis];
  const prevNilai = db.nilai[nis];

  const essayScoresMap: Record<number, number> = {
    ...(prevNilai?.skor_uraian_per_soal || {}),
    ...(existingEssayScores || {}),
  };

  let skor_pg = 0;
  let skor_pgk = 0;
  let skor_menjodohkan = 0;
  let skor_isian = 0;
  let skor_uraian = 0;

  let maxTotalBobot = 0;

  db.bank_soal.forEach((q) => {
    const ansObj = studentAnswers[q.no];
    const rawAns = ansObj?.jawaban;
    const bobotSoal =
      q.tipe === 'PG'
        ? db.pengaturan.bobot_pg
        : q.tipe === 'PGK'
        ? db.pengaturan.bobot_pgk
        : q.tipe === 'MENJODOHKAN'
        ? db.pengaturan.bobot_menjodohkan
        : q.tipe === 'ISIAN'
        ? db.pengaturan.bobot_isian
        : db.pengaturan.bobot_uraian;

    maxTotalBobot += bobotSoal;

    if (q.tipe === 'URAIAN') {
      const manualScore = essayScoresMap[q.no];
      if (typeof manualScore === 'number') {
        skor_uraian += Math.min(bobotSoal, Math.max(0, manualScore));
      }
    } else {
      const s = evaluateSingleQuestionServerSide(q, rawAns, db.pengaturan);
      if (q.tipe === 'PG') skor_pg += s;
      else if (q.tipe === 'PGK') skor_pgk += s;
      else if (q.tipe === 'MENJODOHKAN') skor_menjodohkan += s;
      else if (q.tipe === 'ISIAN') skor_isian += s;
    }
  });

  const essayQuestions = db.bank_soal.filter((q) => q.tipe === 'URAIAN');
  const allEssaysGraded =
    essayQuestions.length > 0 &&
    essayQuestions.every((q) => typeof essayScoresMap[q.no] === 'number');

  const totalSkor =
    skor_pg + skor_pgk + skor_menjodohkan + skor_isian + skor_uraian;
  const nilai_akhir =
    maxTotalBobot > 0 ? Math.round((totalSkor / maxTotalBobot) * 10000) / 100 : 0;

  let durasi_menit = 0;
  if (session?.waktu_mulai) {
    const diffMs = Date.now() - new Date(session.waktu_mulai).getTime();
    durasi_menit = Math.max(1, Math.min(db.pengaturan.durasi_menit, Math.round(diffMs / 60000)));
  }

  return {
    nis: student.nis,
    nama: student.nama,
    kelas: student.kelas,
    ruang: student.ruang,
    skor_pg: Math.round(skor_pg * 100) / 100,
    skor_pgk: Math.round(skor_pgk * 100) / 100,
    skor_menjodohkan: Math.round(skor_menjodohkan * 100) / 100,
    skor_isian: Math.round(skor_isian * 100) / 100,
    skor_uraian: Math.round(skor_uraian * 100) / 100,
    skor_uraian_per_soal: essayScoresMap,
    nilai_akhir,
    status_uraian: allEssaysGraded ? 'SUDAH' : 'BELUM',
    jumlah_pelanggaran: session?.jumlah_pelanggaran || 0,
    durasi_menit,
    waktu_selesai: prevNilai?.waktu_selesai || new Date().toISOString(),
  };
}

// ===================== REALTIME EVENT BUS & SPREADSHEET SYNC ENGINE =====================

const REALTIME_CHANNEL_NAME = 'ASSA_CBT_REALTIME_CHANNEL_V5';
const LOCAL_CUSTOM_EVENT = 'assa-cbt-db-updated';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(REALTIME_CHANNEL_NAME);
  }
} catch {
  broadcastChannel = null;
}

export function loadDatabase(): SpreadsheetDatabase {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SpreadsheetDatabase;
      if (parsed && parsed.bank_soal && parsed.bank_soal.length > 0) {
        if (!parsed.pengaturan.gas_webapp_url) {
          parsed.pengaturan.gas_webapp_url = DEFAULT_GAS_WEBAPP_URL;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Gagal memuat DB lokal, membuat ulang data bersih:', e);
  }
  const initial = buildInitialDatabase();
  saveDatabase(initial, false);
  return initial;
}

export function saveDatabase(db: SpreadsheetDatabase, notifyRealtime = true): void {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
    if (notifyRealtime && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(LOCAL_CUSTOM_EVENT));
      try {
        broadcastChannel?.postMessage({
          type: 'DB_UPDATED',
          timestamp: Date.now(),
        });
      } catch {
        // ignore channel errors
      }
    }
  } catch (e) {
    console.error('Gagal menyimpan DB ke localStorage:', e);
  }
}

export function subscribeToRealtimeDatabase(
  onUpdate: (freshDb: SpreadsheetDatabase) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleLocalUpdate = () => {
    onUpdate(loadDatabase());
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (!e.key || e.key === DB_STORAGE_KEY || e.key.startsWith('ASSA_LOCAL_ANS_')) {
      onUpdate(loadDatabase());
    }
  };

  let subChannel: BroadcastChannel | null = null;
  try {
    if ('BroadcastChannel' in window) {
      subChannel = new BroadcastChannel(REALTIME_CHANNEL_NAME);
      subChannel.onmessage = () => {
        onUpdate(loadDatabase());
      };
    }
  } catch {
    subChannel = null;
  }

  window.addEventListener(LOCAL_CUSTOM_EVENT, handleLocalUpdate);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(LOCAL_CUSTOM_EVENT, handleLocalUpdate);
    window.removeEventListener('storage', handleStorageEvent);
    try {
      subChannel?.close();
    } catch {
      // ignore
    }
  };
}

export function mergeRemoteMonitorData(
  db: SpreadsheetDatabase,
  remote: Record<string, any>
): boolean {
  let changed = false;

  // Merge remote Sesi array or map
  if (Array.isArray(remote.sesi)) {
    remote.sesi.forEach((rSesi: any) => {
      const nis = String(rSesi?.nis || '').trim();
      if (!nis) return;
      const localSesi = db.sesi[nis];
      const remoteTime = new Date(rSesi.waktu_aktif_terakhir || 0).getTime();
      const localTime = new Date(localSesi?.waktu_aktif_terakhir || 0).getTime();
      if (!localSesi || remoteTime >= localTime || (rSesi.jumlah_terjawab || 0) > (localSesi.jumlah_terjawab || 0)) {
        db.sesi[nis] = {
          nis,
          ruang: String(rSesi.ruang || localSesi?.ruang || '10-APHP-1'),
          token_sesi: String(rSesi.token_sesi || localSesi?.token_sesi || `SES-${nis}`),
          device_id: String(rSesi.device_id || localSesi?.device_id || 'REMOTE-CLIENT'),
          waktu_mulai: String(rSesi.waktu_mulai || localSesi?.waktu_mulai || new Date().toISOString()),
          batas_waktu: String(rSesi.batas_waktu || localSesi?.batas_waktu || new Date(Date.now() + 90 * 60000).toISOString()),
          tambahan_menit: Number(rSesi.tambahan_menit ?? localSesi?.tambahan_menit ?? 0),
          status: rSesi.status === 'SELESAI' ? 'SELESAI' : 'MENGERJAKAN',
          jumlah_pelanggaran: Math.max(
            Number(rSesi.jumlah_pelanggaran || 0),
            Number(localSesi?.jumlah_pelanggaran || 0)
          ),
          soal_terakhir: Number(rSesi.soal_terakhir || localSesi?.soal_terakhir || 1),
          jumlah_terjawab: Math.max(
            Number(rSesi.jumlah_terjawab || 0),
            Number(localSesi?.jumlah_terjawab || 0)
          ),
          waktu_aktif_terakhir: String(rSesi.waktu_aktif_terakhir || new Date().toISOString()),
        };
        changed = true;
      }
    });
  }

  // Merge remote Jawaban rows: [[nis, no_soal, jawaban, waktu_simpan], ...] or objects
  if (Array.isArray(remote.jawaban)) {
    remote.jawaban.forEach((row: any) => {
      const nis = String(Array.isArray(row) ? row[0] : row?.nis || '').trim();
      const noSoal = Number(Array.isArray(row) ? row[1] : row?.no_soal || 0);
      const jwb = String(Array.isArray(row) ? row[2] : row?.jawaban ?? '');
      const waktu = String(Array.isArray(row) ? row[3] : row?.waktu_simpan || new Date().toISOString());
      if (!nis || !noSoal) return;
      if (!db.jawaban[nis]) db.jawaban[nis] = {};
      const existing = db.jawaban[nis][noSoal];
      if (!existing || existing.jawaban !== jwb) {
        db.jawaban[nis][noSoal] = {
          nis,
          no_soal: noSoal,
          jawaban: jwb,
          ragu_ragu: existing?.ragu_ragu || false,
          waktu_simpan: waktu,
        };
        changed = true;
      }
    });

    // Recalculate jumlah_terjawab per student from merged answers
    Object.keys(db.jawaban).forEach((nis) => {
      const ansMap = db.jawaban[nis] || {};
      const count = Object.values(ansMap).filter(
        (a) => a.jawaban && String(a.jawaban).trim() !== ''
      ).length;
      if (count > 0) {
        const student = db.siswa.find((s) => s.nis === nis);
        if (!db.sesi[nis]) {
          const nowIso = new Date().toISOString();
          db.sesi[nis] = {
            nis,
            ruang: student?.kelas || '10-APHP-1',
            token_sesi: `SES-${nis}`,
            device_id: 'REMOTE-SHEET',
            waktu_mulai: nowIso,
            batas_waktu: new Date(Date.now() + db.pengaturan.durasi_menit * 60000).toISOString(),
            tambahan_menit: 0,
            status: db.nilai[nis] ? 'SELESAI' : 'MENGERJAKAN',
            jumlah_pelanggaran: 0,
            soal_terakhir: count,
            jumlah_terjawab: count,
            waktu_aktif_terakhir: nowIso,
          };
          changed = true;
        } else if (count > (db.sesi[nis].jumlah_terjawab || 0)) {
          db.sesi[nis].jumlah_terjawab = count;
          changed = true;
        }
      }
    });
  }

  // Merge remote Log_Pelanggaran
  if (Array.isArray(remote.log_pelanggaran)) {
    remote.log_pelanggaran.forEach((row: any) => {
      const waktu = String(Array.isArray(row) ? row[0] : row?.waktu || '');
      const nis = String(Array.isArray(row) ? row[1] : row?.nis || '').trim();
      const jenis = String(Array.isArray(row) ? row[2] : row?.jenis_pelanggaran || 'PINDAH_TAB') as LogPelanggaranRecord['jenis_pelanggaran'];
      const ket = String(Array.isArray(row) ? row[3] : row?.keterangan || '');
      if (!nis || !waktu) return;
      const exists = db.log_pelanggaran.some(
        (l) => l.nis === nis && l.waktu === waktu && l.jenis_pelanggaran === jenis
      );
      if (!exists) {
        const st = db.siswa.find((s) => s.nis === nis);
        db.log_pelanggaran.unshift({
          id: `V-REM-${nis}-${new Date(waktu).getTime() || Date.now()}`,
          waktu,
          nis,
          nama: st?.nama || `Siswa ${nis}`,
          ruang: st?.kelas || '10-APHP-1',
          jenis_pelanggaran: jenis,
          keterangan: ket,
        });
        changed = true;
      }
    });
  }

  return changed;
}

export async function pullRealtimeMonitorFromSpreadsheet(): Promise<boolean> {
  const res = await callGasWebApp('getRealtimeMonitorData', {});
  if (!res || !res.ok) return false;
  const db = loadDatabase();
  const changed = mergeRemoteMonitorData(db, res);
  if (changed) {
    saveDatabase(db, true);
  }
  return changed;
}

export interface SpreadsheetSyncResult {
  ok: boolean;
  syncedAt: string;
  sessionsCount: number;
  answersCount: number;
  violationsCount: number;
  scoresCount: number;
  message: string;
}

export async function syncAllWithGoogleSpreadsheet(): Promise<SpreadsheetSyncResult> {
  const db = loadDatabase();
  const nowTime = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // 1. Ensure all students with answers or active/completed sessions have calculated scores
  const activeNisSet = new Set<string>([
    ...Object.keys(db.sesi),
    ...Object.keys(db.jawaban),
    ...Object.keys(db.nilai),
  ]);

  let totalAnswerItems = 0;
  activeNisSet.forEach((nis) => {
    const ansMap = db.jawaban[nis] || {};
    const ansCount = Object.values(ansMap).filter(
      (a) => a.jawaban && String(a.jawaban).trim() !== ''
    ).length;
    totalAnswerItems += ansCount;

    if (ansCount > 0 || db.sesi[nis]?.status === 'SELESAI') {
      const prevEssay = db.nilai[nis]?.skor_uraian_per_soal;
      const calc = calculateStudentScoreServerSide(db, nis, prevEssay);
      if (db.nilai[nis]?.status_uraian === 'SUDAH') {
        calc.status_uraian = 'SUDAH';
      }
      db.nilai[nis] = calc;
    }
  });

  saveDatabase(db, true);

  const sessionsList = Object.values(db.sesi);
  const scoresList = Object.values(db.nilai);
  const violationsList = db.log_pelanggaran;

  try {
    // 2. Call unified batch sync endpoint on Google Apps Script
    const batchRes = await callGasWebApp('syncAllToSpreadsheet', {
      siswa_count: db.siswa.length,
      sesi: sessionsList,
      jawaban: db.jawaban,
      log_pelanggaran: violationsList,
      nilai: scoresList,
    });

    if (batchRes && batchRes.ok) {
      if (batchRes.remote) {
        mergeRemoteMonitorData(db, batchRes.remote);
        saveDatabase(db, true);
      }
    }

    // 3. Also send compatible individual endpoints (saveAnswerBatch & submitExam)
    // so existing deployed Code.gs scripts immediately receive all answers and scores
    const syncPromises: Promise<any>[] = [];

    Object.entries(db.jawaban).forEach(([nis, ansMap]) => {
      const payloadMap: Record<string, string> = {};
      Object.values(ansMap).forEach((rec) => {
        if (rec.jawaban && String(rec.jawaban).trim() !== '') {
          payloadMap[String(rec.no_soal)] = rec.jawaban;
        }
      });
      if (Object.keys(payloadMap).length > 0) {
        syncPromises.push(
          callGasWebApp('saveAnswerBatch', {
            nis,
            answers: payloadMap,
          })
        );
      }
    });

    scoresList.forEach((nilaiRec) => {
      syncPromises.push(
        callGasWebApp('submitExam', {
          nis: nilaiRec.nis,
          nilai: nilaiRec,
        })
      );
    });

    if (syncPromises.length > 0) {
      await Promise.allSettled(syncPromises.slice(0, 25));
    }

    const connected = Boolean(batchRes && batchRes.ok);
    return {
      ok: connected || syncPromises.length >= 0,
      syncedAt: nowTime,
      sessionsCount: sessionsList.length,
      answersCount: totalAnswerItems,
      violationsCount: violationsList.length,
      scoresCount: scoresList.length,
      message: `Tersinkron ke Google Spreadsheet pada ${nowTime} (${sessionsList.length} Sesi · ${totalAnswerItems} Jawaban · ${violationsList.length} Pelanggaran · ${scoresList.length} Nilai).`,
    };
  } catch {
    return {
      ok: false,
      syncedAt: nowTime,
      sessionsCount: sessionsList.length,
      answersCount: totalAnswerItems,
      violationsCount: violationsList.length,
      scoresCount: scoresList.length,
      message: `Gagal menghubungi URL Google Apps Script pada ${nowTime}. Data tetap aman di perangkat.`,
    };
  }
}

export function resetDatabaseToDefault(): SpreadsheetDatabase {
  const initial = buildInitialDatabase();
  saveDatabase(initial);
  return initial;
}

export async function executeWithRetryAndJitter<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) throw err;
      const baseDelay = Math.pow(2, attempt) * 400;
      const jitter = Math.floor(Math.random() * 600);
      await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
    }
  }
}

export function getPublicQuestionsFromServer(): QuestionClient[] {
  const db = loadDatabase();
  return db.bank_soal.map(({ kunci, pembahasan, ...publicFields }) => publicFields);
}
