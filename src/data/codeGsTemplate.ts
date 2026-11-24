// Complete Google Apps Script (Code.gs) template for ASSA Informatika SMKN 2 Gorontalo
// Pre-configured with the user's deployed Web App URL:
// https://script.google.com/macros/s/AKfycbxunHBXeoyU7VZu9rFheHWbMvaZP1SMmh0fg1fTD8m6BkvVqUcSR7ZLUMQYfFwQha7WPw/exec

export const CODE_GS_CONTENT = `/**
 * ============================================================================
 * ASSA INFORMATIKA - SMKN 2 GORONTALO (BACKEND GOOGLE APPS SCRIPT / Code.gs)
 * ============================================================================
 * URL Web App Aktif:
 * https://script.google.com/macros/s/AKfycbxunHBXeoyU7VZu9rFheHWbMvaZP1SMmh0fg1fTD8m6BkvVqUcSR7ZLUMQYfFwQha7WPw/exec
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
        ["GURU01", "Guru Informatika 1 (Percobaan Ujian)", "GURU-INFORMATIKA", "GURU-INFORMATIKA", hashPassword("123456")],
        ["GURU02", "Guru Informatika 2 (Percobaan Ujian)", "GURU-INFORMATIKA", "GURU-INFORMATIKA", hashPassword("123456")],
        ["GURU03", "Guru Informatika 3 (Percobaan Ujian)", "GURU-INFORMATIKA", "GURU-INFORMATIKA", hashPassword("123456")],
        ["GURU04", "Guru Informatika 4 (Percobaan Ujian)", "GURU-INFORMATIKA", "GURU-INFORMATIKA", hashPassword("123456")],
        ["GURU05", "Guru Informatika 5 (Percobaan Ujian)", "GURU-INFORMATIKA", "GURU-INFORMATIKA", hashPassword("123456")],
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
        ["kikybahsoan", hashPassword("In123123123"), "GURU", "ALL", "Kiky Bahsoan (Guru & Pengawas ASSA Informatika)"],
        ["guru1", hashPassword("In123123123"), "GURU", "ALL", "Guru Informatika 1 (Akun Percobaan)"],
        ["guru2", hashPassword("In123123123"), "GURU", "ALL", "Guru Informatika 2 (Akun Percobaan)"],
        ["guru3", hashPassword("In123123123"), "GURU", "ALL", "Guru Informatika 3 (Akun Percobaan)"],
        ["guru4", hashPassword("In123123123"), "GURU", "ALL", "Guru Informatika 4 (Akun Percobaan)"],
        ["guru5", hashPassword("In123123123"), "GURU", "ALL", "Guru Informatika 5 (Akun Percobaan)"]
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

function getOrCreateSheet(ss, sheetName, defaultHeaders) {
  if (!ss) return null;
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (defaultHeaders && defaultHeaders.length > 0) {
      sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  } else if (sheet.getLastRow() === 0 && defaultHeaders && defaultHeaders.length > 0) {
    sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
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

    if (action === "setupSpreadsheet") {
      var msg = setupSpreadsheet();
      result = { ok: true, message: msg, serverTime: new Date().toISOString() };
    } else if (action === "getQuestionsForStudent") {
      result = handleGetQuestionsForStudent(body);
    } else if (action === "studentLogin") {
      result = handleStudentLogin(body);
    } else if (action === "saveAnswerBatch") {
      result = handleSaveAnswerBatch(body);
    } else if (action === "logViolation") {
      result = handleLogViolation(body);
    } else if (action === "submitExam") {
      result = handleSubmitExam(body);
    } else if (action === "resetStudentExam") {
      result = handleResetStudentExam(body);
    } else if (action === "resetAllExams") {
      result = handleResetAllExams();
    } else if (action === "syncAllToSpreadsheet") {
      result = handleSyncAllToSpreadsheet(body);
    } else if (action === "getRealtimeMonitorData") {
      result = handleGetRealtimeMonitorData(body);
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

function handleStudentLogin(body) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ok: false, retry: true };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sesiHeaders = ["NIS", "ruang", "token_sesi", "waktu_mulai", "batas_waktu", "tambahan_menit", "status", "jumlah_pelanggaran", "soal_terakhir", "waktu_aktif_terakhir"];
    var sheet = getOrCreateSheet(ss, "Sesi", sesiHeaders);
    if (sheet) {
      var s = body.sesi || {};
      var nis = String(s.nis || body.nis || "").trim();
      var nowIso = new Date().toISOString();
      var row = [
        nis,
        String(s.ruang || body.kelas || ""),
        String(s.token_sesi || body.token_ruang || ("SES-" + nis)),
        String(s.waktu_mulai || nowIso),
        String(s.batas_waktu || new Date(Date.now() + 90 * 60000).toISOString()),
        Number(s.tambahan_menit || 0),
        String(s.status || "MENGERJAKAN"),
        Number(s.jumlah_pelanggaran || 0),
        Number(s.soal_terakhir || 1),
        String(s.waktu_aktif_terakhir || nowIso)
      ];
      var sData = sheet.getDataRange().getValues();
      var foundRow = -1;
      for (var i = 1; i < sData.length; i++) {
        if (String(sData[i][0]).trim() === nis) {
          foundRow = i + 1;
          break;
        }
      }
      if (foundRow > 1) {
        sheet.getRange(foundRow, 1, 1, 10).setValues([row]);
      } else {
        sheet.getRange(sheet.getLastRow() + 1, 1, 1, 10).setValues([row]);
      }
    }
    return { ok: true, serverTime: new Date().toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function handleGetQuestionsForStudent(body) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("PUBLIC_QUESTIONS_V1");
  if (cached) {
    return { ok: true, questions: JSON.parse(cached), serverTime: new Date().toISOString() };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var qHeaders = ["id", "no", "tipe", "stimulus", "teks", "gambar_url", "opsi_A", "opsi_B", "opsi_C", "opsi_D", "opsi_E", "kunci", "bobot"];
  var sheet = getOrCreateSheet(ss, "Bank_Soal", qHeaders);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { ok: true, questions: [], serverTime: new Date().toISOString() };
  }
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
  var nis = String(body.nis || "").trim();
  var answers = body.answers || {};
  var nowIso = new Date().toISOString();

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    return { ok: false, retry: true, error: "Server sibuk, coba ulang otomatis." };
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateSheet(ss, "Jawaban", ["NIS", "no_soal", "jawaban", "waktu_simpan"]);
    var keys = Object.keys(answers);
    var savedCount = 0;

    if (sheet && keys.length > 0) {
      var existingData = sheet.getDataRange().getValues();
      var rowIndexMap = {};
      for (var r = 1; r < existingData.length; r++) {
        var rNis = String(existingData[r][0]).trim();
        var rNo = String(existingData[r][1]).trim();
        if (rNis === nis) {
          rowIndexMap[rNo] = r + 1;
        }
      }

      var rowsToAppend = [];
      for (var i = 0; i < keys.length; i++) {
        var noSoal = String(keys[i]).trim();
        var ansVal = String(answers[noSoal]);
        var existingRowNum = rowIndexMap[noSoal];
        if (existingRowNum) {
          sheet.getRange(existingRowNum, 3, 1, 2).setValues([[ansVal, nowIso]]);
        } else {
          rowsToAppend.push([nis, Number(noSoal), ansVal, nowIso]);
        }
        savedCount++;
      }

      if (rowsToAppend.length > 0) {
        var startRow = sheet.getLastRow() + 1;
        sheet.getRange(startRow, 1, rowsToAppend.length, 4).setValues(rowsToAppend);
      }
    }

    // Update Sesi sheet soal_terakhir & waktu_aktif_terakhir in real-time (auto-creates Sesi sheet if missing)
    var sesiHeaders = ["NIS", "ruang", "token_sesi", "waktu_mulai", "batas_waktu", "tambahan_menit", "status", "jumlah_pelanggaran", "soal_terakhir", "waktu_aktif_terakhir"];
    var sesiSheet = getOrCreateSheet(ss, "Sesi", sesiHeaders);
    if (sesiSheet && nis) {
      var sData = sesiSheet.getDataRange().getValues();
      var foundRow = -1;
      for (var sr = 1; sr < sData.length; sr++) {
        if (String(sData[sr][0]).trim() === nis) {
          foundRow = sr + 1;
          break;
        }
      }
      var lastNo = Number(body.soal_terakhir || (keys.length > 0 ? keys[keys.length - 1] : 1));
      if (foundRow > 1) {
        sesiSheet.getRange(foundRow, 9).setValue(lastNo);
        sesiSheet.getRange(foundRow, 10).setValue(nowIso);
      } else {
        sesiSheet.getRange(sesiSheet.getLastRow() + 1, 1, 1, 10).setValues([[
          nis,
          String(body.kelas || ""),
          "SES-" + nis,
          nowIso,
          new Date(Date.now() + 90 * 60000).toISOString(),
          0,
          "MENGERJAKAN",
          0,
          lastNo,
          nowIso
        ]]);
      }
    }

    return { ok: true, savedCount: savedCount, serverTime: nowIso };
  } finally {
    lock.releaseLock();
  }
}

function handleLogViolation(body) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ok: false, retry: true };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateSheet(ss, "Log_Pelanggaran", ["waktu", "NIS", "jenis_pelanggaran", "keterangan"]);
    var nowIso = new Date().toISOString();
    var nis = String(body.nis || "");
    var row = [nowIso, nis, String(body.jenis || ""), String(body.keterangan || "")];
    if (sheet) {
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, 4).setValues([row]);
    }

    // Update jumlah_pelanggaran in Sesi sheet
    var sesiHeaders = ["NIS", "ruang", "token_sesi", "waktu_mulai", "batas_waktu", "tambahan_menit", "status", "jumlah_pelanggaran", "soal_terakhir", "waktu_aktif_terakhir"];
    var sesiSheet = getOrCreateSheet(ss, "Sesi", sesiHeaders);
    if (sesiSheet && nis) {
      var sData = sesiSheet.getDataRange().getValues();
      for (var r = 1; r < sData.length; r++) {
        if (String(sData[r][0]).trim() === nis) {
          var nextCount = Number(body.jumlah_pelanggaran || (Number(sData[r][7] || 0) + 1));
          sesiSheet.getRange(r + 1, 8).setValue(nextCount);
          sesiSheet.getRange(r + 1, 10).setValue(nowIso);
          break;
        }
      }
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function handleSubmitExam(body) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ok: false, retry: true };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var nilaiHeaders = ["NIS", "nama", "kelas", "skor_pg", "skor_pgk", "skor_menjodohkan", "skor_isian", "skor_uraian", "nilai_akhir", "status_uraian"];
    var sheet = getOrCreateSheet(ss, "Nilai", nilaiHeaders);
    if (sheet && body.nilai) {
      var n = body.nilai;
      var nis = String(n.nis || body.nis || "").trim();
      var row = [
        nis, String(n.nama || ""), String(n.kelas || ""),
        Number(n.skor_pg || 0), Number(n.skor_pgk || 0),
        Number(n.skor_menjodohkan || 0), Number(n.skor_isian || 0),
        Number(n.skor_uraian || 0), Number(n.nilai_akhir || 0),
        String(n.status_uraian || "BELUM")
      ];
      var nData = sheet.getDataRange().getValues();
      var foundRow = -1;
      for (var i = 1; i < nData.length; i++) {
        if (String(nData[i][0]).trim() === nis) {
          foundRow = i + 1;
          break;
        }
      }
      if (foundRow > 1) {
        sheet.getRange(foundRow, 1, 1, 10).setValues([row]);
      } else {
        sheet.getRange(sheet.getLastRow() + 1, 1, 1, 10).setValues([row]);
      }
    }
    var sesiHeaders = ["NIS", "ruang", "token_sesi", "waktu_mulai", "batas_waktu", "tambahan_menit", "status", "jumlah_pelanggaran", "soal_terakhir", "waktu_aktif_terakhir"];
    var sesiSheet = getOrCreateSheet(ss, "Sesi", sesiHeaders);
    if (sesiSheet && body.nis) {
      var sData = sesiSheet.getDataRange().getValues();
      for (var r = 1; r < sData.length; r++) {
        if (String(sData[r][0]).trim() === String(body.nis).trim()) {
          sesiSheet.getRange(r + 1, 7).setValue("SELESAI");
          sesiSheet.getRange(r + 1, 10).setValue(new Date().toISOString());
          break;
        }
      }
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function handleResetStudentExam(body) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ok: false, retry: true };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var targetNis = String(body.nis || "").trim();
    if (!targetNis) return { ok: false, error: "NIS kosong" };

    var targetSheets = [
      { name: "Sesi", nisColIndex: 0 },
      { name: "Jawaban", nisColIndex: 0 },
      { name: "Nilai", nisColIndex: 0 },
      { name: "Log_Pelanggaran", nisColIndex: 1 }
    ];

    targetSheets.forEach(function(cfg) {
      var sheet = ss.getSheetByName(cfg.name);
      if (sheet && sheet.getLastRow() > 1) {
        var data = sheet.getDataRange().getValues();
        for (var r = data.length - 1; r >= 1; r--) {
          if (String(data[r][cfg.nisColIndex] || "").trim() === targetNis) {
            sheet.deleteRow(r + 1);
          }
        }
      }
    });

    return { ok: true, resetNis: targetNis, serverTime: new Date().toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function handleResetAllExams() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) return { ok: false, retry: true };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetsToClear = [
      { name: "Sesi", headers: ["NIS", "ruang", "token_sesi", "waktu_mulai", "batas_waktu", "tambahan_menit", "status", "jumlah_pelanggaran", "soal_terakhir", "waktu_aktif_terakhir"] },
      { name: "Jawaban", headers: ["NIS", "no_soal", "jawaban", "waktu_simpan"] },
      { name: "Nilai", headers: ["NIS", "nama", "kelas", "skor_pg", "skor_pgk", "skor_menjodohkan", "skor_isian", "skor_uraian", "nilai_akhir", "status_uraian"] },
      { name: "Log_Pelanggaran", headers: ["waktu", "NIS", "jenis_pelanggaran", "keterangan"] }
    ];

    sheetsToClear.forEach(function(cfg) {
      var sheet = getOrCreateSheet(ss, cfg.name, cfg.headers);
      if (sheet) {
        sheet.clearContents();
        sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]).setFontWeight("bold");
        sheet.setFrozenRows(1);
      }
    });

    return { ok: true, serverTime: new Date().toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function handleSyncAllToSpreadsheet(body) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) return { ok: false, retry: true, error: "Lock sibuk" };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Sinkron Sheet Sesi
    var sesiHeaders = ["NIS", "ruang", "token_sesi", "waktu_mulai", "batas_waktu", "tambahan_menit", "status", "jumlah_pelanggaran", "soal_terakhir", "waktu_aktif_terakhir"];
    var sesiSheet = getOrCreateSheet(ss, "Sesi", sesiHeaders);
    if (body.sesi && sesiSheet) {
      var sesiKeys = Object.keys(body.sesi);
      sesiSheet.clearContents();
      var sesiRows = [sesiHeaders];
      for (var i = 0; i < sesiKeys.length; i++) {
        var s = body.sesi[sesiKeys[i]];
        sesiRows.push([
          String(s.nis || sesiKeys[i]),
          String(s.ruang || ""),
          String(s.token_sesi || ""),
          String(s.waktu_mulai || ""),
          String(s.batas_waktu || ""),
          Number(s.tambahan_menit || 0),
          String(s.status || "MENGERJAKAN"),
          Number(s.jumlah_pelanggaran || 0),
          Number(s.soal_terakhir || 1),
          String(s.waktu_aktif_terakhir || "")
        ]);
      }
      sesiSheet.getRange(1, 1, sesiRows.length, sesiHeaders.length).setValues(sesiRows);
    }

    // 2. Sinkron Sheet Jawaban
    var jwbHeaders = ["NIS", "no_soal", "jawaban", "waktu_simpan"];
    var jwbSheet = getOrCreateSheet(ss, "Jawaban", jwbHeaders);
    if (body.jawaban && jwbSheet) {
      var nisList = Object.keys(body.jawaban);
      var jwbRows = [jwbHeaders];
      for (var j = 0; j < nisList.length; j++) {
        var nisKey = nisList[j];
        var perSoal = body.jawaban[nisKey] || {};
        var noList = Object.keys(perSoal);
        for (var k = 0; k < noList.length; k++) {
          var item = perSoal[noList[k]];
          if (item && String(item.jawaban || "").trim() !== "") {
            jwbRows.push([
              String(nisKey),
              Number(item.no_soal || noList[k]),
              String(item.jawaban),
              String(item.waktu_simpan || new Date().toISOString())
            ]);
          }
        }
      }
      jwbSheet.clearContents();
      jwbSheet.getRange(1, 1, jwbRows.length, 4).setValues(jwbRows);
    }

    // 3. Sinkron Sheet Nilai
    var nilaiHeaders = ["NIS", "nama", "kelas", "skor_pg", "skor_pgk", "skor_menjodohkan", "skor_isian", "skor_uraian", "nilai_akhir", "status_uraian"];
    var nilaiSheet = getOrCreateSheet(ss, "Nilai", nilaiHeaders);
    if (body.nilai && nilaiSheet) {
      var nilaiKeys = Object.keys(body.nilai);
      nilaiSheet.clearContents();
      var nilaiRows = [nilaiHeaders];
      for (var m = 0; m < nilaiKeys.length; m++) {
        var n = body.nilai[nilaiKeys[m]];
        nilaiRows.push([
          String(n.nis || nilaiKeys[m]),
          String(n.nama || ""),
          String(n.kelas || ""),
          Number(n.skor_pg || 0),
          Number(n.skor_pgk || 0),
          Number(n.skor_menjodohkan || 0),
          Number(n.skor_isian || 0),
          Number(n.skor_uraian || 0),
          Number(n.nilai_akhir || 0),
          String(n.status_uraian || "BELUM")
        ]);
      }
      nilaiSheet.getRange(1, 1, nilaiRows.length, nilaiHeaders.length).setValues(nilaiRows);
    }

    return { ok: true, syncedAt: new Date().toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function handleGetRealtimeMonitorData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {
    ok: true,
    sheetsInitialized: Boolean(ss && ss.getSheetByName("Jawaban") && ss.getSheetByName("Sesi")),
    sesi: [],
    jawaban: [],
    log_pelanggaran: [],
    nilai: [],
    serverTime: new Date().toISOString()
  };

  if (!ss) return result;

  // 1. Ambil Jawaban terlebih dahulu untuk menghitung jumlah_terjawab per siswa secara akurat
  var answeredCountMap = {};
  var jwbSheet = ss.getSheetByName("Jawaban");
  if (jwbSheet && jwbSheet.getLastRow() > 1) {
    var jData = jwbSheet.getDataRange().getValues();
    for (var j = 1; j < jData.length; j++) {
      var jr = jData[j];
      var jNis = String(jr[0] || "").trim();
      var jNo = Number(jr[1] || 0);
      var jAns = String(jr[2] || "");
      var jTime = String(jr[3] || "");
      if (jNis && jNo) {
        result.jawaban.push([jNis, jNo, jAns, jTime]);
        if (!answeredCountMap[jNis]) answeredCountMap[jNis] = {};
        if (jAns.trim() !== "") {
          answeredCountMap[jNis][jNo] = true;
        }
      }
    }
  }

  // 2. Ambil Sesi
  var sesiSheet = ss.getSheetByName("Sesi");
  if (sesiSheet && sesiSheet.getLastRow() > 1) {
    var sData = sesiSheet.getDataRange().getValues();
    for (var i = 1; i < sData.length; i++) {
      var r = sData[i];
      var nis = String(r[0] || "").trim();
      if (nis) {
        var countAns = answeredCountMap[nis] ? Object.keys(answeredCountMap[nis]).length : 0;
        result.sesi.push({
          nis: nis,
          ruang: String(r[1] || ""),
          token_sesi: String(r[2] || ""),
          waktu_mulai: String(r[3] || ""),
          batas_waktu: String(r[4] || ""),
          tambahan_menit: Number(r[5] || 0),
          status: String(r[6] || "MENGERJAKAN"),
          jumlah_pelanggaran: Number(r[7] || 0),
          soal_terakhir: Number(r[8] || 1),
          waktu_aktif_terakhir: String(r[9] || ""),
          jumlah_terjawab: countAns
        });
      }
    }
  }

  // 3. Ambil Log_Pelanggaran
  var logSheet = ss.getSheetByName("Log_Pelanggaran");
  if (logSheet && logSheet.getLastRow() > 1) {
    var lData = logSheet.getDataRange().getValues();
    for (var k = 1; k < lData.length; k++) {
      var lr = lData[k];
      if (lr[1]) {
        result.log_pelanggaran.push([
          String(lr[0] || ""),
          String(lr[1] || ""),
          String(lr[2] || "PINDAH_TAB"),
          String(lr[3] || "")
        ]);
      }
    }
  }

  return result;
}
`;


