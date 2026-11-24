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
    } else if (action === "studentLogin") {
      result = handleStudentLogin(body);
    } else if (action === "saveAnswerBatch") {
      result = handleSaveAnswerBatch(body);
    } else if (action === "logViolation") {
      result = handleLogViolation(body);
    } else if (action === "submitExam") {
      result = handleSubmitExam(body);
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
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sesi");
    if (sheet && body.sesi) {
      var s = body.sesi;
      var row = [
        String(s.nis || body.nis || ""),
        String(s.ruang || ""),
        String(s.token_sesi || ""),
        String(s.waktu_mulai || new Date().toISOString()),
        String(s.batas_waktu || ""),
        Number(s.tambahan_menit || 0),
        String(s.status || "MENGERJAKAN"),
        Number(s.jumlah_pelanggaran || 0),
        Number(s.soal_terakhir || 1),
        String(s.waktu_aktif_terakhir || new Date().toISOString())
      ];
      sheet.getRange(sheet.getLastRow() + 1, 1, 1, 10).setValues([row]);
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

    // Update Sesi sheet soal_terakhir & waktu_aktif_terakhir in real-time
    var sesiSheet = ss.getSheetByName("Sesi");
    if (sesiSheet) {
      var sData = sesiSheet.getDataRange().getValues();
      var foundRow = -1;
      for (var r = 1; r < sData.length; r++) {
        if (String(sData[r][0]).trim() === nis) {
          foundRow = r + 1;
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

    return { ok: true, savedCount: rowsToAppend.length, serverTime: nowIso };
  } finally {
    lock.releaseLock();
  }
}

function handleLogViolation(body) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return { ok: false, retry: true };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Log_Pelanggaran");
    var nowIso = new Date().toISOString();
    var nis = String(body.nis || "");
    var row = [nowIso, nis, String(body.jenis || ""), String(body.keterangan || "")];
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, 4).setValues([row]);

    // Update jumlah_pelanggaran in Sesi sheet
    var sesiSheet = ss.getSheetByName("Sesi");
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
    var sheet = ss.getSheetByName("Nilai");
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
    var sesiSheet = ss.getSheetByName("Sesi");
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

function handleSyncAllToSpreadsheet(body) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) return { ok: false, retry: true, error: "Lock sibuk" };
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Sinkron Sheet Sesi
    if (body.sesi) {
      var sesiSheet = ss.getSheetByName("Sesi");
      if (sesiSheet) {
        var sesiKeys = Object.keys(body.sesi);
        if (sesiKeys.length > 0) {
          sesiSheet.clearContents();
          var sesiHeaders = ["NIS", "ruang", "token_sesi", "waktu_mulai", "batas_waktu", "tambahan_menit", "status", "jumlah_pelanggaran", "soal_terakhir", "waktu_aktif_terakhir"];
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
      }
    }

    // 2. Sinkron Sheet Jawaban
    if (body.jawaban) {
      var jwbSheet = ss.getSheetByName("Jawaban");
      if (jwbSheet) {
        var nisList = Object.keys(body.jawaban);
        var jwbRows = [["NIS", "no_soal", "jawaban", "waktu_simpan"]];
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
        if (jwbRows.length > 1) {
          jwbSheet.clearContents();
          jwbSheet.getRange(1, 1, jwbRows.length, 4).setValues(jwbRows);
        }
      }
    }

    // 3. Sinkron Sheet Nilai
    if (body.nilai) {
      var nilaiSheet = ss.getSheetByName("Nilai");
      if (nilaiSheet) {
        var nilaiKeys = Object.keys(body.nilai);
        if (nilaiKeys.length > 0) {
          nilaiSheet.clearContents();
          var nilaiHeaders = ["NIS", "nama", "kelas", "skor_pg", "skor_pgk", "skor_menjodohkan", "skor_isian", "skor_uraian", "nilai_akhir", "status_uraian"];
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
      }
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
    sesi: [],
    jawaban: [],
    log_pelanggaran: [],
    nilai: [],
    serverTime: new Date().toISOString()
  };

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


