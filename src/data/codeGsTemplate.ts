// Complete Google Apps Script (Code.gs) template for ASSA Informatika SMKN 2 Gorontalo
// Pre-configured with the user's deployed Web App URL:
// https://script.google.com/macros/s/AKfycbzEN_p5NQvBZmwGwuHuzf_MvSjfvDoQ2Q5mwkm32FJxiMvuOnYx4Hjj4lawiFKEoNhI/exec

export const CODE_GS_CONTENT = `/**
 * ============================================================================
 * ASSA INFORMATIKA - SMKN 2 GORONTALO (BACKEND GOOGLE APPS SCRIPT / Code.gs)
 * ============================================================================
 * URL Web App Aktif:
 * https://script.google.com/macros/s/AKfycbzEN_p5NQvBZmwGwuHuzf_MvSjfvDoQ2Q5mwkm32FJxiMvuOnYx4Hjj4lawiFKEoNhI/exec
 * ============================================================================
 */

var SALT = "SMKN2_GTO_TKA_2026";
var CACHE_TTL = 300;

function hashPassword(raw) {
  var input = String(raw).trim() + "::" + SALT;
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input);
  var hex = "";
  for (var i = 0; i < digest.length; i++) {
    var b = (digest[i] < 0 ? digest[i] + 256 : digest[i]).toString(16);
    if (b.length === 1) hex += "0";
    hex += b;
  }
  return hex;
}

function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sheetsConfig = [
    {
      name: "Pengaturan",
      headers: ["kunci_pengaturan", "nilai", "keterangan"],
      rows: [
        ["judul_ujian", "ASSA Informatika Kelas X - SMKN 2 Gorontalo", "Judul utama ujian CBT"],
        ["durasi_menit", "90", "Durasi pengerjaan dalam menit"],
        ["bobot_pg", "1", "Bobot per soal Pilihan Ganda (No. 1-10)"],
        ["bobot_pgk", "2", "Bobot per soal PG Kompleks (No. 11-20)"],
        ["bobot_menjodohkan", "3", "Bobot per soal Menjodohkan (No. 21-25)"],
        ["bobot_isian", "2", "Bobot per soal Isian Singkat (No. 26-35)"],
        ["bobot_uraian", "7", "Bobot maksimal per soal Uraian (No. 36-40)"],
        ["mode_skor_pgk", "PARSIAL", "PARSIAL atau MUTLAK (semua benar atau nol)"],
        ["batas_pelanggaran", "3", "Jumlah maksimal pelanggaran sebelum layar terkunci"],
        ["pin_pengawas", "2026", "PIN Pengawas untuk membuka layar siswa yang terkunci"],
        ["status_ujian", "BERJALAN", "BELUM_MULAI / BERJALAN / SELESAI"],
        ["tampilkan_nilai", "TIDAK", "YA atau TIDAK setelah siswa selesai submit"]
      ]
    },
    {
      name: "Bank_Soal",
      headers: [
        "id", "no", "tipe", "stimulus", "teks", "gambar_url",
        "opsi_A", "opsi_B", "opsi_C", "opsi_D", "opsi_E",
        "kunci", "bobot"
      ],
      rows: []
    },
    {
      name: "Siswa",
      headers: ["NIS", "nama", "kelas", "ruang", "password_hash"],
      rows: [
        ["10001", "ABDUL HULALANGO", "10-APHP-1", "10-APHP-1", hashPassword("123456")],
        ["10002", "Abdul Kholig Kalengkongan", "10-APHP-1", "10-APHP-1", hashPassword("123456")],
        ["10003", "AFRILIA HUSAIN", "10-APHP-1", "10-APHP-1", hashPassword("123456")]
      ]
    },
    {
      name: "Ruang",
      headers: ["kode_ruang", "nama_ruang", "token_ujian", "status_mulai", "jam_mulai"],
      rows: [
        ["KELAS-X", "ASSA Informatika Kelas X", "INF26A", "BERJALAN", new Date().toISOString()]
      ]
    },
    {
      name: "Sesi",
      headers: [
        "NIS", "ruang", "token_sesi", "waktu_mulai", "batas_waktu",
        "tambahan_menit", "status", "jumlah_pelanggaran", "soal_terakhir", "waktu_aktif_terakhir"
      ],
      rows: []
    },
    {
      name: "Jawaban",
      headers: ["NIS", "no_soal", "jawaban", "waktu_simpan"],
      rows: []
    },
    {
      name: "Log_Pelanggaran",
      headers: ["waktu", "NIS", "jenis_pelanggaran", "keterangan"],
      rows: []
    },
    {
      name: "Nilai",
      headers: [
        "NIS", "nama", "kelas", "skor_pg", "skor_pgk",
        "skor_menjodohkan", "skor_isian", "skor_uraian",
        "nilai_akhir", "status_uraian"
      ],
      rows: []
    },
    {
      name: "Pengguna",
      headers: ["username", "password_hash", "peran", "ruang_tugas", "nama_lengkap"],
      rows: [
        ["kikybahsoan", hashPassword("In123123123"), "GURU", "ALL", "Kiky Bahsoan (Guru & Pengawas ASSA Informatika)"]
      ]
    }
  ];

  sheetsConfig.forEach(function(cfg) {
    var sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
    } else {
      sheet.clear();
    }
    sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]).setFontWeight("bold");
    if (cfg.rows && cfg.rows.length > 0) {
      sheet.getRange(2, 1, cfg.rows.length, cfg.headers.length).setValues(cfg.rows);
    }
    sheet.setFrozenRows(1);
  });

  return "Setup 9 Sheet ASSA Informatika SMKN 2 Gorontalo selesai!";
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: "ASSA Informatika SMKN 2 Gorontalo CBT API", serverTime: new Date().toISOString() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var result = {};

    if (action === "getQuestionsForStudent") {
      result = handleGetQuestionsForStudent(body);
    } else if (action === "saveAnswerBatch") {
      result = handleSaveAnswerBatch(body);
    } else if (action === "logViolation") {
      result = handleLogViolation(body);
    } else if (action === "submitExam") {
      result = handleSubmitExam(body);
    } else {
      result = { ok: true, action: action, serverTime: new Date().toISOString() };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetQuestionsForStudent(body) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("PUBLIC_QUESTIONS_V1");
  if (cached) {
    return { ok: true, questions: JSON.parse(cached), serverTime: new Date().toISOString() };
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Bank_Soal");
  var data = sheet.getDataRange().getValues();
  var publicQuestions = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    publicQuestions.push({
      id: row[0],
      no: Number(row[1]),
      tipe: row[2],
      stimulus: row[3],
      teks: row[4],
      gambar_url: row[5],
      opsi_A: row[6],
      opsi_B: row[7],
      opsi_C: row[8],
      opsi_D: row[9],
      opsi_E: row[10],
      bobot: Number(row[12])
    });
  }

  cache.put("PUBLIC_QUESTIONS_V1", JSON.stringify(publicQuestions), CACHE_TTL);
  return { ok: true, questions: publicQuestions, serverTime: new Date().toISOString() };
}

function handleSaveAnswerBatch(body) {
  var nis = String(body.nis);
  var answers = body.answers || {};
  var nowIso = new Date().toISOString();

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return { ok: false, retry: true, error: "Server sibuk, coba ulang otomatis." };
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Jawaban");
    var keys = Object.keys(answers);
    var rowsToAppend = [];

    for (var i = 0; i < keys.length; i++) {
      var noSoal = keys[i];
      rowsToAppend.push([nis, Number(noSoal), String(answers[noSoal]), nowIso]);
    }

    if (rowsToAppend.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rowsToAppend.length, 4).setValues(rowsToAppend);
    }

    return { ok: true, savedCount: rowsToAppend.length, serverTime: nowIso };
  } finally {
    lock.releaseLock();
  }
}

function handleLogViolation(body) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ok: false, retry: true };
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log_Pelanggaran");
    var row = [new Date().toISOString(), String(body.nis || ""), String(body.jenis || ""), String(body.keterangan || "")];
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, 4).setValues([row]);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function handleSubmitExam(body) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ok: false, retry: true };
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Nilai");
    if (body.nilai) {
      var n = body.nilai;
      var row = [
        String(n.nis), String(n.nama), String(n.kelas),
        Number(n.skor_pg || 0), Number(n.skor_pgk || 0),
        Number(n.skor_menjodohkan || 0), Number(n.skor_isian || 0),
        Number(n.skor_uraian || 0), Number(n.nilai_akhir || 0),
        String(n.status_uraian || "BELUM")
      ];
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, 10).setValues([row]);
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}
`;
