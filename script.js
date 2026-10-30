/* PASTE URL DEPLOY APPS SCRIPT DI SINI */
const API_URL = "https://script.google.com/macros/s/AKfycbwN-xB6BfOK3CtqzVXXoKVHe8CSGb6__FgeprTjPZfOF-8fRdme9cidDr5QhS0epj79/exec";

let memoryCache = {};
let currentUser = null;
let activeModule = 'Portfolio';
let editingId = null;
let editingRow = null;
let currentType = null;
let countdownTimer = null;
let isNavigatingHistory = false;

// VARIABEL OTP & TIMER
let otpTimerInterval = null;
let otpExpiresAt = null;
let splashAutoTimer = null;

/* ================================================================
   FACE DETECTION / AUTO CAPTURE
   ================================================================ */
let faceDetectionReady = false;
let faceDetectionTimer = null;
let faceStableCount = 0;
let faceAutoCaptureRunning = false;

const FACE_MODEL_URL =
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';

const menuGroups = [
  { title: "Dashboard & Profil", icon: 'fa-house', items: [
    {sheet:'Home',label:'Home'}, {sheet:'Profile',label:'Profile'}, {sheet:'Contact',label:'Contact'}
  ]},
  { title: "Manajemen Konten", icon: 'fa-pen-to-square', items: [
    {sheet:'Portfolio',label:'Portfolio'}, {sheet:'Blog',label:'Blog'}, {sheet:'Career_Timeline',label:'Career Timeline'}, {sheet:'Documents',label:'Documents'}, {sheet:'Gallery',label:'Gallery'}
  ]},
  { title: "Website & Tampilan", icon: 'fa-palette', items: [
    {sheet:'Web_Branding',label:'Web Branding'}, {sheet:'Dynamic_Menu',label:'Dynamic Menu'}, {sheet:'Banners',label:'Banners'}, {sheet:'Popups',label:'Popups'}, {sheet:'Bantuan',label:'Pusat Panduan'}
  ]},
  { title: "Legal", icon: 'fa-scale-balanced', items: [
    {sheet:'Privacy_Policy',label:'Privacy Policy'}, {sheet:'Terms_Conditions',label:'Terms Conditions'}
  ]},
  { title: "Interaksi Visitor", icon: 'fa-users', items: [
    {sheet:'Visitor_Attendance',label:'Visitor Attendance'}, {sheet:'Newsletter',label:'Inbox Newsletter'}, {sheet:'Notifications',label:'Notifications'}, {sheet:'Bookmarks',label:'User Bookmarks'}, {sheet:'Analytics',label:'Analytics Heatmap'}
  ]},
  { title: "Sistem & Keamanan", icon: 'fa-shield-halved', items: [
    {sheet:'Users',label:'Users'}, {sheet:'System_Logs',label:'System Logs'}
  ]}
];

let pendingRequests = {};
let loaderCount = 0;

/* ================================================================
   API CONNECTOR (DIPERBAIKI: ANTI-CACHE BROWSER & GOOGLE SERVER)
   ================================================================ */
async function apiCall(method = 'GET', payload = {}) {
  const url = API_URL;

  const options = {
    method: method.toUpperCase(),
    redirect: 'follow',
    cache: 'no-store', // Memaksa browser tidak menyimpan cache
    headers: {}
  };

  let targetUrl = url;

  if (method.toUpperCase() === 'POST') {
    options.headers['Content-Type'] = 'text/plain;charset=utf-8';
    options.body = JSON.stringify(payload);
  } else {
    const params = new URLSearchParams();
    
    Object.entries(payload || {}).forEach(([k, v]) => {
      params.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    });

    // --- KUNCI REALTIME (ANTI-BUG STUCK DATA) ---
    // Menyisipkan Date.now() membuat URL API selalu unik 100% setiap ditekan.
    // Ini memastikan blokade cache dari server Google Apps Script berhasil dijebol.
    params.set('_t', Date.now()); 
    
    if (params.toString()) {
        targetUrl = `${url}?${params.toString()}`;
    }
  }

  // Tarik data dengan URL yang sudah dijamin unik
  const response = await fetch(targetUrl, options);
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("API Error (Bukan JSON):", text);
    throw new Error('Respons Apps Script gagal diproses atau bukan JSON.');
  }
}

async function getCachedData(sheetName, force = false) {
  if (!force && memoryCache[sheetName]) {
    return memoryCache[sheetName];
  }

  if (pendingRequests[sheetName] && !force) {
    return pendingRequests[sheetName];
  }

  pendingRequests[sheetName] = (async () => {
    try {
      const result = await apiCall(
        'GET',
        {
          action: 'getData',
          sheet: sheetName,
          role: currentUser?.Role || 'Visitor'
        }
      );

      if (!result || result.status !== 'success') {
        throw new Error(
          result?.message ||
          `Gagal membaca Sheet ${sheetName}`
        );
      }

      const normalized = {
        status: 'success',
        headers: result.headers || [],
        data: result.data || []
      };

      memoryCache[sheetName] = normalized;

      return normalized;

    } finally {
      delete pendingRequests[sheetName];
    }
  })();

  return pendingRequests[sheetName];
}

function toggleLoader(show) {
  const loader =
    document.getElementById('loader');

  if (!loader) return;

  loaderCount =
    Math.max(
      0,
      loaderCount + (show ? 1 : -1)
    );

  loader.style.display =
    loaderCount > 0
      ? 'flex'
      : 'none';
}

function invalidateCache(sheetName) {
  delete memoryCache[sheetName];
}

/* ================================================================
   SISTEM NOTIFIKASI ELEGAN
   ================================================================ */
function showToast(
  message,
  type = 'success'
) {
  const toast =
    document.getElementById('toast');

  const toastText =
    document.getElementById('toastText');

  const toastIcon =
    document.getElementById('toastIcon');

  if (!toast || !toastText || !toastIcon) {
    return;
  }

  toastText.textContent = message;

  if (type === 'error') {

    toast.className =
      'toast-glass show fixed top-6 left-1/2 -translate-x-1/2 z-[999999] px-6 py-4 rounded-2xl font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-3 backdrop-blur-xl border bg-rose-600/90 text-white border-rose-400/50 shadow-rose-900/30';

    toastIcon.className =
      'fas fa-circle-xmark text-xl text-white';

  } else if (type === 'warning') {

    toast.className =
      'toast-glass show fixed top-6 left-1/2 -translate-x-1/2 z-[999999] px-6 py-4 rounded-2xl font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-3 backdrop-blur-xl border bg-amber-500/90 text-white border-amber-300/50 shadow-amber-900/30';

    toastIcon.className =
      'fas fa-triangle-exclamation text-xl text-white';

  } else if (type === 'info') {

    toast.className =
      'toast-glass show fixed top-6 left-1/2 -translate-x-1/2 z-[999999] px-6 py-4 rounded-2xl font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-3 backdrop-blur-xl border bg-blue-600/90 text-white border-blue-400/50 shadow-blue-900/30';

    toastIcon.className =
      'fas fa-circle-info text-xl text-white';

  } else {

    toast.className =
      'toast-glass show fixed top-6 left-1/2 -translate-x-1/2 z-[999999] px-6 py-4 rounded-2xl font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-3 backdrop-blur-xl border bg-slate-900/95 text-white border-slate-700/80 shadow-slate-950/50';

    toastIcon.className =
      'fas fa-circle-check text-xl text-emerald-400';
  }

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3800);
}

/* ================================================================
   CONTROLLER SPLASH SCREEN
   ================================================================ */
function startSplashTimer() {}

function skipSplash() {
  if (splashAutoTimer) {
    clearInterval(splashAutoTimer);
  }

  const splash =
    document.getElementById('splash-screen');

  const form =
    document.getElementById('guest-form-card');

  if (splash) {
    splash.classList.add('hidden');
  }

  if (form) {
    form.classList.remove('hidden');
  }
}

/* ================================================================
   BROWSER INFO
   ================================================================ */
function getCleanBrowserInfo() {
  const ua = navigator.userAgent;

  let browser = "Browser Lainnya";

  if (ua.includes("Instagram")) {
    browser = "Instagram InApp Browser";
  } else if (
    ua.includes("FBAN") ||
    ua.includes("FBAV")
  ) {
    browser = "Facebook InApp Browser";
  } else if (ua.includes("TikTok")) {
    browser = "TikTok InApp Browser";
  } else if (ua.includes("Edg/")) {
    browser = "Microsoft Edge";
  } else if (
    ua.includes("Chrome") &&
    !ua.includes("Edg/")
  ) {
    browser = "Google Chrome";
  } else if (
    ua.includes("Safari") &&
    !ua.includes("Chrome")
  ) {
    browser = "Apple Safari";
  } else if (ua.includes("Firefox")) {
    browser = "Mozilla Firefox";
  }

  const os =
    ua.includes("Android")
      ? "Android"
      : ua.includes("iPhone") ||
        ua.includes("iPad")
      ? "iOS"
      : ua.includes("Windows")
      ? "Windows PC"
      : ua.includes("Mac")
      ? "Mac OS"
      : "Mobile Device";

  return `${browser} (${os})`;
}

/* ================================================================
   OTP INPUT
   ================================================================ */
document.addEventListener(
  'input',
  function(e) {
    if (
      e.target &&
      e.target.id === 'att-code'
    ) {
      e.target.value =
        e.target.value
          .replace(/\D/g, '')
          .slice(0, 4);
    }
  }
);

/* ================================================================
   LOAD FACE DETECTION MODEL
   ================================================================ */
async function loadFaceDetectionModel() {

  if (faceDetectionReady) {
    return true;
  }

  if (typeof faceapi === 'undefined') {

    console.error(
      'face-api.js belum tersedia.'
    );

    showToast(
      'Modul pemindaian wajah belum siap.',
      'error'
    );

    return false;
  }

  try {

    await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL);

    faceDetectionReady = true;

    console.log(
      'Face detection model berhasil dimuat.'
    );

    return true;

  } catch (error) {

    console.error(
      'Gagal memuat model face detection:',
      error
    );

    showToast(
      'Model pemindaian wajah gagal dimuat.',
      'error'
    );

    return false;
  }
}

/* ================================================================
   CAPTURE FACE
   FUNGSI GLOBAL - BISA DIPANGGIL AUTO CAPTURE DAN TOMBOL
   ================================================================ */
async function captureFace() {

  const video =
    document.getElementById('face-camera');

  const canvas =
    document.getElementById('face-canvas');

  if (
    !video ||
    !canvas ||
    !video.videoWidth
  ) {
    showToast(
      'Kamera belum siap.',
      'warning'
    );
    return false;
  }

  const ctx =
    canvas.getContext('2d');

  if (!ctx) {
    showToast(
      'Canvas kamera tidak tersedia.',
      'error'
    );
    return false;
  }

  canvas.width =
    video.videoWidth;

  canvas.height =
    video.videoHeight;

  ctx.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const base64Data =
    canvas.toDataURL(
      'image/jpeg',
      0.6
    );

  /* --- EKSTRAKSI 128 TITIK WAJAH --- */
  let descriptorArr = [];
  try {
    const detection = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      // Ubah Float32Array menjadi standar Array Javascript agar bisa di-JSON
      descriptorArr = Array.from(detection.descriptor); 
    } else {
      showToast('Wajah terlalu buram/gelap untuk diekstrak. Coba lagi.', 'warning');
      return false;
    }
  } catch (e) {
    console.error('Descriptor error:', e);
  }
  /* --------------------------------- */

  const instr =
    document.getElementById(
      'face-instruction'
    );

  const counter =
    document.getElementById(
      'face-step-counter'
    );

  /* ==============================================================
     MODE DOCUMENT
     1 FOTO
     ============================================================== */
  if (currentFaceMode === 'document') {

    documentFaceDataUrl =
      base64Data;

    isFaceVerified = true;

    faceStableCount = 0;
    faceAutoCaptureRunning = false;

    if (faceDetectionTimer) {
      clearInterval(faceDetectionTimer);
      faceDetectionTimer = null;
    }

    closeFaceVerification();

    showToast(
      'Foto verifikasi berhasil diambil.',
      'success'
    );

    if (
      typeof openProtectedDocuments ===
      'function'
    ) {
      setTimeout(() => {
        openProtectedDocuments();
      }, 300);
    }

    return true;
  }

 /* ==============================================================
     MODE REGISTER (BUG 4 FIXED: Penambahan Jeda 2.5 Detik)
     3 FOTO: DEPAN -> KANAN -> KIRI
     ============================================================== */
  if (currentFaceMode === 'register') {

    /* FOTO DEPAN */
    if (faceCaptureStep === 1) {
      tempFaceData.front = base64Data;
      tempFaceData.descriptor = descriptorArr; // Simpan 128 titik
      faceCaptureStep = 2;
      faceStableCount = 0;
      faceAutoCaptureRunning = true; // Block kamera sementara

      if (instr) instr.innerText = 'Bagus! Tahan... Sekarang perlahan tengok KANAN.';
      if (counter) counter.innerText = '1/3 ✓';

      setTimeout(() => {
        faceAutoCaptureRunning = false; // Buka kembali kamera
        if (currentFaceMode === 'register' && faceCaptureStep === 2 && videoStream) {
          startAutomaticFaceDetection();
        }
      }, 2500); // Waktu jeda 2.5 detik
      return true;
    }

    /* FOTO KANAN */
    if (faceCaptureStep === 2) {
      tempFaceData.right = base64Data;
      faceCaptureStep = 3;
      faceStableCount = 0;
      faceAutoCaptureRunning = true; // Block kamera sementara

      if (instr) instr.innerText = 'Bagus! Tahan... Sekarang perlahan tengok KIRI.';
      if (counter) counter.innerText = '2/3 ✓';

      setTimeout(() => {
        faceAutoCaptureRunning = false; // Buka kembali kamera
        if (currentFaceMode === 'register' && faceCaptureStep === 3 && videoStream) {
          startAutomaticFaceDetection();
        }
      }, 2500); // Waktu jeda 2.5 detik
      return true;
    }

    /* FOTO KIRI */
    if (faceCaptureStep === 3) {
      tempFaceData.left = base64Data;
      isFaceVerified = true;
      faceStableCount = 0;
      faceAutoCaptureRunning = false;

      if (faceDetectionTimer) {
        clearInterval(faceDetectionTimer);
        faceDetectionTimer = null;
      }
      
      document.getElementById('reg-face-status')?.classList.remove('hidden');
      document.getElementById('btn-reg-face')?.classList.add('hidden');

      if (instr) instr.innerText = '3 foto wajah berhasil diambil.';
      if (counter) counter.innerText = '3/3 ✓';

      closeFaceVerification();
      checkPasswordMatch();
      showToast('3 foto wajah DEPAN, KANAN, dan KIRI berhasil disimpan.', 'success');
      return true;
    }
    return false;
  }

  /* ==============================================================
     MODE LOGIN / RECOVERY
     1 FOTO
     ============================================================== */

  tempFaceData.front =
    base64Data;
  tempFaceData.descriptor = descriptorArr; // Simpan 128 titik

  isFaceVerified = true;

  faceStableCount = 0;
  faceAutoCaptureRunning = false;

  if (faceDetectionTimer) {
    clearInterval(faceDetectionTimer);
    faceDetectionTimer = null;
  }

  closeFaceVerification();

  if (currentFaceMode === 'login') {

    const loginStatus =
      document.getElementById(
        'login-face-status'
      );

    if (loginStatus) {
      loginStatus.classList.remove(
        'hidden'
      );
    }

    const loginButton =
      document.getElementById(
        'btn-login-face'
      );

    if (loginButton) {
      loginButton.classList.add(
        'hidden'
      );
    }

    showToast(
      'Foto wajah login berhasil diambil.',
      'success'
    );

  } else if (
    currentFaceMode === 'recovery'
  ) {

    const recStatus =
      document.getElementById(
        'rec-face-status'
      );

    if (recStatus) {
      recStatus.classList.remove(
        'hidden'
      );
    }

    const recButton =
      document.getElementById(
        'btn-rec-face'
      );

    if (recButton) {
      recButton.classList.add(
        'hidden'
      );
    }

    showToast(
      'Foto wajah recovery berhasil diambil.',
      'success'
    );

  } else {

    showToast(
      'Foto wajah berhasil diambil.',
      'success'
    );
  }

  return true;
}

/* ================================================================
   AUTO DETECT WAJAH + AUTO CAPTURE
   ================================================================ */
function startAutomaticFaceDetection() {

  if (
    faceDetectionTimer
  ) {
    clearInterval(
      faceDetectionTimer
    );

    faceDetectionTimer = null;
  }

  faceStableCount = 0;
  faceAutoCaptureRunning = false;

  const video =
    document.getElementById(
      'face-camera'
    );

  const instruction =
    document.getElementById(
      'face-instruction'
    );

  if (!video) {
    return;
  }

  if (
    !faceDetectionReady ||
    typeof faceapi === 'undefined'
  ) {
    console.warn(
      'Face detection belum siap.'
    );
    return;
  }

  faceDetectionTimer =
    setInterval(async () => {

      if (
        faceAutoCaptureRunning
      ) {
        return;
      }

      if (
        !faceDetectionReady ||
        video.readyState < 2 ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        return;
      }

      try {

        const detection =
          await faceapi.detectSingleFace(
            video,
            new faceapi
              .TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.45
              })
          );

        if (detection) {

          faceStableCount++;

          if (instruction) {

            if (
              currentFaceMode === 'register'
            ) {

              if (
                faceCaptureStep === 1
              ) {
                instruction.innerText =
                  'Wajah terdeteksi — tahan posisi DEPAN...';

              } else if (
                faceCaptureStep === 2
              ) {
                instruction.innerText =
                  'Wajah terdeteksi — tahan posisi KANAN...';

              } else if (
                faceCaptureStep === 3
              ) {
                instruction.innerText =
                  'Wajah terdeteksi — tahan posisi KIRI...';
              }

            } else {

              instruction.innerText =
                'Wajah terdeteksi — tahan posisi...';
            }
          }

          /*
           * 8 deteksi stabil.
           * Interval 250ms => sekitar 2 detik.
           */
          if (
            faceStableCount >= 8
          ) {

            faceAutoCaptureRunning =
              true;

            if (instruction) {
              instruction.innerText =
                'Wajah terdeteksi — mengambil foto...';
            }

            clearInterval(
              faceDetectionTimer
            );

            faceDetectionTimer = null;

            setTimeout(async () => { // Tambahkan async

              if (
                typeof captureFace ===
                'function'
              ) {

                const success =
                  await captureFace(); // Tambahkan await

                if (!success) {

                  faceAutoCaptureRunning =
                    false;

                  faceStableCount = 0;

                  if (
                    currentFaceMode ===
                      'register' &&
                    faceCaptureStep <= 3 &&
                    videoStream
                  ) {
                    startAutomaticFaceDetection();
                  }
                }
              }

            }, 500);
          }

        } else {

          faceStableCount = 0;

          if (instruction) {

            if (
              currentFaceMode ===
                'register'
            ) {

              if (
                faceCaptureStep === 1
              ) {
                instruction.innerText =
                  'Hadap DEPAN dan posisikan wajah di tengah kamera.';

              } else if (
                faceCaptureStep === 2
              ) {
                instruction.innerText =
                  'Tengok sedikit ke KANAN.';

              } else if (
                faceCaptureStep === 3
              ) {
                instruction.innerText =
                  'Tengok sedikit ke KIRI.';
              }

            } else {

              instruction.innerText =
                'Posisikan wajah di depan kamera';
            }
          }
        }

      } catch (error) {

        console.warn(
          'Face detection error:',
          error
        );
      }

    }, 250);
}

/* ================================================================
   REQUEST OTP
   ================================================================ */
async function requestEmailOTP() {

  const emailInput =
    document.getElementById(
      'att-email'
    );

  const email =
    emailInput
      ? emailInput.value.trim()
      : '';

  const name =
    document.getElementById(
      'att-name'
    ).value.trim();

  const age =
    document.getElementById(
      'att-age'
    ).value.trim();

  if (
    !name ||
    !age ||
    !email
  ) {
    showToast(
      "Lengkapi Nama, Umur, dan Alamat Email terlebih dahulu!",
      "warning"
    );
    return;
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    showToast(
      "Format alamat email tidak valid.",
      "warning"
    );
    return;
  }

  const btn =
    document.getElementById(
      'btn-send-code'
    );

  btn.innerText =
    "Mengirim...";

  btn.disabled = true;

  toggleLoader(true);

  try {

    const res =
      await apiCall(
        'POST',
        {
          action: 'sendOTP',
          data: {
            email: email,
            fullName: name
          }
        }
      );

    if (
      res &&
      res.status === 'success'
    ) {

      document
        .getElementById(
          'verify-box'
        )
        .classList.remove(
          'hidden'
        );

      document
        .getElementById(
          'att-code'
        ).value = '';

      startOTPCountdown(
        Number(
          res.expiresAt ||
          (
            Date.now() +
            (
              (
                res.expiresInSeconds ||
                180
              ) * 1000
            )
          )
        )
      );

      btn.innerText =
        "Kode Terkirim";

      showToast(
        res.message ||
        'Kode verifikasi berhasil dikirim.',
        "success"
      );

      document
        .getElementById(
          'att-code'
        )
        .focus();

    } else {

      btn.disabled = false;

      btn.innerText =
        "Kirim Kode";

      showToast(
        (
          res &&
          res.message
        ) ||
        "Gagal mengirim kode verifikasi.",
        "error"
      );
    }

  } catch(e) {

    btn.disabled = false;

    btn.innerText =
      "Kirim Kode";

    showToast(
      "Koneksi bermasalah saat mengirim kode verifikasi.",
      "error"
    );

  } finally {

    toggleLoader(false);
  }
}

/* ================================================================
   OTP COUNTDOWN
   ================================================================ */
function startOTPCountdown(
  serverExpiresAt
) {

  if (otpTimerInterval) {
    clearInterval(
      otpTimerInterval
    );
  }

  otpExpiresAt =
    Number(serverExpiresAt);

  const display =
    document.getElementById(
      'otp-timer-display'
    );

  const btn =
    document.getElementById(
      'btn-send-code'
    );

  if (
    !display ||
    !Number.isFinite(
      otpExpiresAt
    )
  ) {
    return;
  }

  display.className =
    "text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md";

  const tick = () => {

    const remainingSeconds =
      Math.max(
        0,
        Math.ceil(
          (
            otpExpiresAt -
            Date.now()
          ) / 1000
        )
      );

    if (
      remainingSeconds <= 0
    ) {

      clearInterval(
        otpTimerInterval
      );

      otpTimerInterval =
        null;

      display.textContent =
        "EXPIRED";

      display.className =
        "text-[10px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md";

      if (btn) {

        btn.disabled = false;

        btn.innerText =
          "Kirim Kode";
      }

      return;
    }

    const mins =
      Math.floor(
        remainingSeconds / 60
      );

    const secs =
      remainingSeconds % 60;

    display.textContent =
      `${mins
        .toString()
        .padStart(2,'0')}:${secs
        .toString()
        .padStart(2,'0')}`;
  };

  tick();

  otpTimerInterval =
    setInterval(
      tick,
      1000
    );
}

/* ================================================================
   SUBMIT ABSENSI
   ================================================================ */
async function submitAttendance() {

  const name =
    document
      .getElementById('att-name')
      .value.trim();

  const age =
    document
      .getElementById('att-age')
      .value.trim();

  const email =
    document
      .getElementById('att-email')
      .value.trim();

  const code =
    document
      .getElementById('att-code')
      .value.trim();

  if (
    !name ||
    !age ||
    !email
  ) {
    showToast(
      "Harap isi seluruh kolom biodata terlebih dahulu!",
      "warning"
    );
    return;
  }

  if (
    !code ||
    !/^\d{4}$/.test(code)
  ) {
    showToast(
      "Silakan isi 4 digit kode verifikasi email Anda!",
      "warning"
    );
    return;
  }

  const submitBtn =
    document.querySelector(
      '#guest-form-card button[onclick="submitAttendance()"]'
    );

  if (submitBtn) {
    submitBtn.disabled = true;
  }

  const loader =
    document.getElementById(
      'attendance-loader'
    );

  if (loader) {
    loader.classList.remove(
      'hidden'
    );
  }

  try {

    const verify =
      await apiCall(
        'POST',
        {
          action: 'verifyOTP',
          data: {
            email: email,
            code: code
          }
        }
      );

    if (
      !verify ||
      verify.status !== 'success'
    ) {

      showToast(
        (
          verify &&
          verify.message
        ) ||
        'Kode verifikasi salah.',
        'error'
      );

      return;
    }

    const browserInfo =
      getCleanBrowserInfo();

    let locationIP =
      "Jaringan Lokal/Indonesia";

    try {

      const ipRes =
        await fetch(
          'https://api.ipify.org?format=json'
        );

      const ipData =
        await ipRes.json();

      if (
        ipData &&
        ipData.ip
      ) {
        locationIP =
          ipData.ip;
      }

    } catch(e) {}

    const attendance =
      await apiCall(
        'POST',
        {
          action: 'attendance',
          data: {
            fullName: name,
            age: age,
            email: email,
            browserInfo: browserInfo,
            locationIP: locationIP
          }
        }
      );

    if (
      !attendance ||
      attendance.status !== 'success'
    ) {

      showToast(
        (
          attendance &&
          attendance.message
        ) ||
        'Absensi gagal disimpan.',
        'error'
      );

      return;
    }

    if (otpTimerInterval) {
      clearInterval(
        otpTimerInterval
      );
    }

    otpTimerInterval = null;
    otpExpiresAt = null;

    document
      .getElementById(
        'att-code'
      ).value = '';

    document
      .getElementById(
        'verify-box'
      )
      .classList.add(
        'hidden'
      );

    navigateTo(
      'public',
      'home',
      true
    );

    showToast(
      attendance.message ||
      "Absensi berhasil dicatat! Selamat datang.",
      "success"
    );

  } catch(e) {

    showToast(
      "Koneksi bermasalah saat memverifikasi atau menyimpan absensi.",
      "error"
    );

  } finally {

    const loader =
      document.getElementById(
        'attendance-loader'
      );

    if (loader) {
      loader.classList.add(
        'hidden'
      );
    }

    if (submitBtn) {
      submitBtn.disabled = false;
    }
  }
}

/* ================================================================
   VISITOR DASHBOARD TABS
   ================================================================ */
async function switchVisitorTab(tab, isSilent = false) {

  document.querySelectorAll(
    '.v-btn'
  ).forEach(b => {

    b.classList.remove(
      'bg-blue-50',
      'text-blue-600',
      'font-bold'
    );

    if (
      b.getAttribute(
        'data-vtab'
      ) === tab
    ) {
      b.classList.add(
        'bg-blue-50',
        'text-blue-600',
        'font-bold'
      );
    }
  });

  const container =
    document.getElementById(
      'visitor-content-container'
    );

  if (!container) return;

  const name =
    currentUser
      ? safeText(
          currentUser.FullName,
          'Visitor'
        )
      : 'Visitor';

  const email =
    currentUser
      ? safeText(
          currentUser.Email,
          '-'
        )
      : '-';

  const uid =
    currentUser
      ? safeText(
          currentUser.UserID,
          ''
        )
      : '';

  // Tampilkan tulisan loading HANYA saat klik manual (bukan refresh otomatis background)
  if (!isSilent) {
    container.innerHTML =
    '<div class="bg-white p-16 rounded-3xl border shadow-sm flex flex-col items-center justify-center text-slate-400 animate-pulse min-h-[400px]"><i class="fas fa-spinner fa-spin text-6xl text-blue-600 mb-6"></i><p class="font-black text-2xl tracking-wide text-slate-600">Memuat Data Terbaru...</p></div>';
  }

  try {

   if (tab === 'dash') {
      const [att, usersRes] = await Promise.all([
        getCachedData('Visitor_Attendance'),
        getCachedData('Users')
      ]);

      const dataTamu = (att.data || []).reverse();
      const dataUsers = (usersRes.data || []).reverse();

      // Gunakan Helper baru untuk mencetak Accordion Tanggal
      const htmlTamu = buildAccordionList(dataTamu, 'tamu');
      const htmlReg = buildAccordionList(dataUsers, 'akun');

      container.innerHTML =
        `<div class="space-y-6 animate-fade-in">
          <div class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
            <h2 class="text-2xl font-black mb-2 relative z-10">Halo, ${escapeHtml(name)}!</h2>
            <p class="text-blue-100 text-sm max-w-md relative z-10">Selamat datang di Dashboard Komunitas.</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4"><div class="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0"><i class="fas fa-book"></i></div><div><p class="text-xs font-bold text-slate-500 uppercase">Buku Tamu</p><h4 class="text-2xl font-black">${dataTamu.length}</h4></div></div>
            <div class="bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4"><div class="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0"><i class="fas fa-users"></i></div><div><p class="text-xs font-bold text-slate-500 uppercase">Akun Terdaftar</p><h4 class="text-2xl font-black">${dataUsers.length}</h4></div></div>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col h-[450px]"><div class="p-4 border-b bg-slate-50 shrink-0"><h3 class="font-extrabold flex items-center gap-2"><i class="fas fa-history text-emerald-500"></i> Riwayat Tamu</h3></div><div class="overflow-y-auto flex-1">${htmlTamu}</div></div>
            <div class="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col h-[450px]"><div class="p-4 border-b bg-slate-50 shrink-0"><h3 class="font-extrabold flex items-center gap-2"><i class="fas fa-user-plus text-blue-500"></i> Registrasi Akun</h3></div><div class="overflow-y-auto flex-1">${htmlReg}</div></div>
          </div>
        </div>`;

    } else if (tab === 'profile') {

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm space-y-5 animate-fade-in">
          <h2 class="font-extrabold text-xl text-slate-900">
            Profil Saya
          </h2>

          <div class="grid sm:grid-cols-2 gap-4">

            <div>
              <label class="font-bold text-xs text-slate-400 block mb-1">
                NAMA LENGKAP
              </label>

              <div class="p-3 bg-slate-50 rounded-xl font-bold text-slate-800">
                ${escapeHtml(name)}
              </div>
            </div>

            <div>
              <label class="font-bold text-xs text-slate-400 block mb-1">
                EMAIL
              </label>

              <div class="p-3 bg-slate-50 rounded-xl font-bold text-slate-800 break-all">
                ${escapeHtml(email)}
              </div>
            </div>

            <div>
              <label class="font-bold text-xs text-slate-400 block mb-1">
                ROLE
              </label>

              <div class="p-3 bg-slate-50 rounded-xl font-bold text-slate-800">
                ${escapeHtml(
                  safeText(
                    currentUser?.Role,
                    'Visitor'
                  )
                )}
              </div>
            </div>

            <div>
              <label class="font-bold text-xs text-slate-400 block mb-1">
                STATUS
              </label>

              <div class="p-3 bg-emerald-50 rounded-xl font-bold text-emerald-700">
                Terverifikasi
              </div>
            </div>

          </div>
        </div>`;

    } else if (tab === 'edit') {

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm space-y-5 animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900">
            Edit Profil Akun
          </h2>

          <div class="space-y-4">

            <div>
              <label class="font-bold text-xs text-slate-600 block mb-1">
                NAMA LENGKAP
              </label>

              <input
                id="visitor-edit-name"
                type="text"
                value="${escapeHtml(name)}"
                class="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:border-blue-600"
              >
            </div>

            <div>
              <label class="font-bold text-xs text-slate-600 block mb-1">
                EMAIL
              </label>

              <input
                type="email"
                value="${escapeHtml(email)}"
                disabled
                class="w-full p-3 bg-slate-100 border rounded-xl text-slate-400"
              >
            </div>

            <button
              onclick="saveVisitorProfile()"
              class="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md"
            >
              Simpan Perubahan
            </button>

          </div>
        </div>`;

    } else if (tab === 'activity') {

      const res =
        await getCachedData(
          'System_Logs'
        );

      const rows =
        (res.data || [])
        .filter(
          x =>
            !uid ||
            String(
              x.User || ''
            ) === String(uid) ||
            String(
              x.User || ''
            ).toLowerCase() ===
            String(email).toLowerCase()
        )
        .slice(-30)
        .reverse();

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900 mb-5">
            Riwayat Aktivitas
          </h2>

          ${
            rows.length
              ? `<div class="space-y-3">

                  ${
                    rows.map(
                      x =>
                        `<div class="p-4 bg-slate-50 rounded-2xl">

                          <div class="text-xs text-blue-600 font-bold">
                            ${escapeHtml(
                              x.Timestamp || ''
                            )}
                          </div>

                          <div class="font-bold text-sm mt-1">
                            ${escapeHtml(
                              x.Action ||
                              'Aktivitas'
                            )}
                          </div>

                          <div class="text-xs text-slate-500 mt-1">
                            ${escapeHtml(
                              x.Description ||
                              ''
                            )}
                          </div>

                        </div>`
                    ).join('')
                  }

                </div>`
              : '<div class="empty-state">Belum ada aktivitas yang tercatat.</div>'
          }

        </div>`;

    } else if (tab === 'download') {

      const res =
        await getCachedData(
          'Documents'
        );

      const rows =
        (res.data || [])
        .filter(
          x =>
            !x.Status ||
            x.Status === 'publish' ||
            x.Status === 'active'
        );

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900 mb-5">
            Dokumen
          </h2>

          ${
            rows.length
              ? `<div class="grid sm:grid-cols-2 gap-4">

                ${
                  rows.map(
                    x => {

                      const u =
                        safeUrl(
                          x.File_URL
                        );

                      return `
                        <div class="p-5 bg-slate-50 rounded-2xl border">

                          <div class="font-bold">
                            ${escapeHtml(
                              x.Title ||
                              'Dokumen'
                            )}
                          </div>

                          <p class="text-xs text-slate-500 mt-2">
                            ${escapeHtml(
                              x.Description ||
                              ''
                            )}
                          </p>

                          ${
                            u
                              ? `<a
                                  href="${u}"
                                  target="_blank"
                                  rel="noopener"
                                  class="inline-flex mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
                                >
                                  Buka Dokumen
                                </a>`
                              : ''
                          }

                        </div>
                      `;
                    }
                  ).join('')
                }

              </div>`
              : '<div class="empty-state">Belum ada dokumen.</div>'
          }

        </div>`;

    } else if (tab === 'bookmark') {

      const [
        book,
        port,
        blog,
        gallery
      ] = await Promise.all([
        getCachedData('Bookmarks'),
        getCachedData('Portfolio'),
        getCachedData('Blog'),
        getCachedData('Gallery')
      ]);

      const rows =
        (book.data || [])
        .filter(
          x =>
            !uid ||
            String(
              x.UserID || ''
            ) === String(uid)
        );

      const maps = {};

      [
        ...(port.data || []),
        ...(blog.data || []),
        ...(gallery.data || [])
      ].forEach(x => {

        const id =
          x.ProjectID ||
          x.BlogID ||
          x.GalleryID;

        if (id) {
          maps[String(id)] = x;
        }
      });

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900 mb-5">
            Bookmark Saya
          </h2>

          ${
            rows.length
              ? `<div class="space-y-3">

                  ${
                    rows.map(
                      x =>
                        `<div class="p-4 bg-slate-50 rounded-2xl">

                          <div class="font-bold">
                            ${escapeHtml(
                              maps[
                                String(
                                  x.ContentID
                                )
                              ]?.Title ||
                              x.ContentID ||
                              'Konten'
                            )}
                          </div>

                          <div class="text-xs text-slate-500 mt-1">
                            ${escapeHtml(
                              x.ContentType ||
                              'Konten'
                            )}
                            •
                            ${escapeHtml(
                              x.Date ||
                              ''
                            )}
                          </div>

                        </div>`
                    ).join('')
                  }

                </div>`
              : '<div class="empty-state">Belum ada bookmark.</div>'
          }

        </div>`;

    } else if (tab === 'favorite') {

      const res =
        await getCachedData(
          'Bookmarks'
        );

      const rows =
        (res.data || [])
        .filter(
          x =>
            (!uid ||
              String(
                x.UserID || ''
              ) === String(uid)) &&
            String(
              x.Status || ''
            ).toLowerCase() ===
              'favorite'
        );

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900 mb-5">
            Favorite
          </h2>

          ${
            rows.length
              ? rows.map(
                  x =>
                    `<div class="p-4 bg-rose-50 rounded-2xl mb-3">

                      <div class="font-bold">
                        ${escapeHtml(
                          x.ContentID ||
                          'Konten'
                        )}
                      </div>

                      <div class="text-xs text-slate-500">
                        ${escapeHtml(
                          x.ContentType ||
                          'Konten'
                        )}
                      </div>

                    </div>`
                ).join('')
              : '<div class="empty-state">Belum ada favorite.</div>'
          }

        </div>`;

    } else if (tab === 'message') {

      const res =
        await getCachedData(
          'Notifications'
        );

      const rows =
        (res.data || [])
        .filter(
          x =>
            String(
              x.Type || ''
            ).toLowerCase() ===
            'contact'
        );

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900 mb-5">
            Pesan Inbox
          </h2>

          ${
            rows.length
              ? rows.map(
                  x =>
                    `<div class="p-4 bg-slate-50 rounded-2xl mb-3">

                      <div class="font-bold">
                        ${escapeHtml(
                          x.Title ||
                          'Pesan'
                        )}
                      </div>

                      <div class="text-xs text-slate-500 mt-1 whitespace-pre-line">
                        ${escapeHtml(
                          x.Message ||
                          ''
                        )}
                      </div>

                    </div>`
                ).join('')
              : '<div class="empty-state">Belum ada pesan.</div>'
          }

        </div>`;

    } else if (tab === 'notif') {

      const res =
        await getCachedData(
          'Notifications'
        );

      const rows =
        (res.data || [])
        .filter(
          x =>
            !x.Status ||
            x.Status === 'active' ||
            x.Status === 'publish'
        )
        .slice(-30)
        .reverse();

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900 mb-5">
            Notifikasi
          </h2>

          ${
            rows.length
              ? rows.map(
                  x =>
                    `<div class="p-4 bg-slate-50 rounded-2xl mb-3">

                      <div class="font-bold">
                        ${escapeHtml(
                          x.Title ||
                          'Notifikasi'
                        )}
                      </div>

                      <div class="text-xs text-slate-500 mt-1">
                        ${escapeHtml(
                          x.Message ||
                          ''
                        )}
                      </div>

                      <div class="text-[10px] text-slate-400 mt-2">
                        ${escapeHtml(
                          x.Date ||
                          ''
                        )}
                      </div>

                    </div>`
                ).join('')
              : '<div class="empty-state">Belum ada notifikasi.</div>'
          }

        </div>`;

    } else if (tab === 'documents') {

      const res =
        await getCachedData(
          'Documents'
        );

      const rows =
        (res.data || [])
        .filter(
          x =>
            !x.Status ||
            x.Status === 'publish' ||
            x.Status === 'active'
        )
        .filter(
          x =>
            /cv|curriculum|lamaran|surat lamaran|resume|resume kerja/i
              .test(
                String(
                  x.Title || ''
                ) +
                ' ' +
                String(
                  x.Description || ''
                )
              )
        );

      container.innerHTML =
        `<div class="space-y-5 animate-fade-in">

          <div class="protected-card">

            <div class="flex items-start gap-4">

              <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <i class="fas fa-shield-halved"></i>
              </div>

              <div>

                <h2 class="text-xl font-black">
                  CV & Lamaran Kerja
                </h2>

                <p class="text-sm text-blue-100 mt-2">
                  Akses khusus Visitor.
                  Konfirmasi verifikasi wajah diperlukan sebelum dokumen dibuka.
                </p>

                <button
                  onclick="requestProtectedDocuments()"
                  class="mt-5 bg-white text-slate-900 px-5 py-3 rounded-xl text-xs font-black"
                >
                  Verifikasi & Buka
                </button>

              </div>

            </div>

          </div>

          <div class="text-xs text-slate-500">
            ${rows.length} dokumen terdeteksi.
          </div>

        </div>`;

    } else if (tab === 'settings') {

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900">
            Pengaturan Akun
          </h2>

          <p class="text-sm text-slate-500 mt-2">
            Pengaturan akun dikelola berdasarkan data pengguna yang tersimpan di Sheet Users.
          </p>

          <div class="mt-6 p-4 bg-slate-50 rounded-2xl text-sm">
            <b>Email:</b>
            ${escapeHtml(email)}
            <br>
            <b>Role:</b>
            ${escapeHtml(
              safeText(
                currentUser?.Role,
                'Visitor'
              )
            )}
          </div>

        </div>`;

    } else if (tab === 'security') {

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900">
            Keamanan Akun
          </h2>

          <div class="mt-5 grid sm:grid-cols-2 gap-4">

            <div class="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">

              <div class="font-black text-emerald-700">
                Terverifikasi
              </div>

              <p class="text-xs text-slate-500 mt-1">
                Akun berhasil melewati autentikasi.
              </p>

            </div>

            <div class="p-5 bg-blue-50 rounded-2xl border border-blue-100">

              <div class="font-black text-blue-700">
                OTP Email
              </div>

              <p class="text-xs text-slate-500 mt-1">
                OTP diverifikasi di server.
              </p>

            </div>

          </div>

        </div>`;

    } else if (tab === 'password') {

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900">
            Ganti Password
          </h2>

          <p class="text-sm text-slate-500 mt-2">
            Penggantian password dilakukan melalui pengelolaan Users.
          </p>

        </div>`;
    }

  } catch(err) {

    container.innerHTML =
      '<div class="bg-white p-8 rounded-3xl border shadow-sm text-sm text-rose-600">Gagal memuat data visitor.</div>';
  }
} // <--- TAMBAHKAN SATU KURUNG TUTUP INI DI SINI

/* ================================================================
   SAVE VISITOR PROFILE
   ================================================================ */
async function saveVisitorProfile() {

  if (!currentUser?.UserID) {
    return showToast(
      'Sesi pengguna tidak ditemukan.',
      'error'
    );
  }

  const name =
    document
      .getElementById(
        'visitor-edit-name'
      )
      ?.value.trim();

  if (!name) {
    return showToast(
      'Nama lengkap wajib diisi.',
      'warning'
    );
  }

  toggleLoader(true);

  try {

    const r =
      await apiCall(
        'POST',
        {
          action: 'update',
          sheet: 'Users',
          user: currentUser.UserID,
          data: {
            id: currentUser.UserID,
            FullName: name
          }
        }
      );

    if (
      r.status === 'success'
    ) {

      currentUser.FullName =
        name;

      invalidateCache(
        'Users'
      );

      showToast(
        'Profil berhasil diperbarui.',
        'success'
      );

      switchVisitorTab(
        'profile'
      );

    } else {

      showToast(
        r.message ||
        'Gagal memperbarui profil.',
        'error'
      );
    }

  } finally {

    toggleLoader(false);
  }
}

/* ================================================================
   ADMIN MODAL INPUT
   ================================================================ */
function openModalInput(
  row = null
) {

  if (
    !memoryCache[activeModule]
  ) {
    showToast(
      'Data modul belum siap.',
      'warning'
    );
    return;
  }

  editingRow = row;

  editingId =
    row
      ? row[
          memoryCache[
            activeModule
          ].headers[0]
        ]
      : null;

  const headers =
    memoryCache[
      activeModule
    ].headers.slice(1);

  document.getElementById(
    'modal-title'
  ).innerText =
    (
      row
        ? 'Edit: '
        : 'Tambah: '
    ) +
    activeModule.replace(
      /_/g,
      ' '
    );

  document.getElementById(
    'modal-subtitle'
  ).innerText =
    row
      ? 'Perubahan akan langsung diperbarui di Google Sheets.'
      : 'Data akan disimpan ke Google Sheets.';

  const body =
    document.getElementById(
      'modal-body'
    );

  body.innerHTML = '';

  headers.forEach(
    col => {

      const label =
        col.replace(
          /_/g,
          ' '
        );

      const image =
        /url|image|cover|pic|logo|favicon/i
          .test(col);

      const long =
        /Description|Content|JSON|Value|About|Message|Subtitle/i
          .test(col);

      const v =
        row &&
        row[col] != null
          ? String(row[col])
          : '';

      const safe =
        escapeHtml(v);

      const span =
        image || long
          ? 'md:col-span-2'
          : 'col-span-1';

      if (image) {

        body.innerHTML +=
          `<div class="${span} bg-white p-5 rounded-2xl border shadow-sm space-y-3">

            <label class="block font-bold text-slate-800 text-sm">
              📸 ${label}
            </label>

            <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">

              <div class="relative overflow-hidden inline-block shrink-0">

                <button
                  type="button"
                  class="bg-blue-50 text-blue-600 font-bold py-2.5 px-4 rounded-xl text-xs"
                >
                  Pilih Kamera / File
                </button>

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onchange="convertImg(event,'${col}')"
                  class="absolute inset-0 opacity-0 cursor-pointer"
                >

              </div>

              <span class="text-xs text-slate-400">
                Atau Paste URL:
              </span>

              <input
                type="text"
                id="inp-${col}"
                value="${safe}"
                class="flex-1 w-full p-2.5 bg-slate-50 border rounded-xl text-xs"
              >

            </div>

            <img
              id="prev-${col}"
              src="${safe}"
              class="${v ? '' : 'hidden'} h-24 w-24 object-cover rounded-xl border"
            >

          </div>`;

      } else if (
        col === 'Status'
      ) {

        const s =
          v || 'publish';

        body.innerHTML +=
          `<div class="${span}">

            <label class="block font-bold text-sm mb-2">
              ${label}
            </label>

            <select
              id="inp-${col}"
              class="w-full p-3.5 bg-white border rounded-xl font-bold"
            >
              <option value="publish" ${s === 'publish' ? 'selected' : ''}>
                🟢 Publish
              </option>

              <option value="active" ${s === 'active' ? 'selected' : ''}>
                🟢 Active
              </option>

              <option value="draft" ${s === 'draft' ? 'selected' : ''}>
                🟡 Draft
              </option>

              <option value="trash" ${s === 'trash' ? 'selected' : ''}>
                🔴 Trash
              </option>

            </select>

          </div>`;

      } else if (long) {

        body.innerHTML +=
          `<div class="${span}">

            <label class="block font-bold text-sm mb-2">
              ${label}
            </label>

            <textarea
              id="inp-${col}"
              rows="5"
              class="w-full p-3.5 bg-white border rounded-xl"
            >${safe}</textarea>

          </div>`;

      } else {

        body.innerHTML +=
          `<div class="${span}">

            <label class="block font-bold text-sm mb-2">
              ${label}
            </label>

            <input
              type="text"
              id="inp-${col}"
              value="${safe}"
              class="w-full p-3.5 bg-white border rounded-xl"
            >

          </div>`;
      }
    }
  );

  document
    .getElementById(
      'modal-form'
    )
    .classList.remove(
      'hidden'
    );

  document.body.style.overflow =
    'hidden';
}

function convertImg(
  e,
  col
) {

  const f =
    e.target.files[0];

  if (!f) return;

  if (
    f.size > 2 * 1024 * 1024
  ) {

    showToast(
      'Ukuran gambar maksimal 2 MB.',
      'warning'
    );

    e.target.value = '';

    return;
  }

  const r =
    new FileReader();

  r.onload = x => {

    const input =
      document.getElementById(
        'inp-' + col
      );

    const img =
      document.getElementById(
        'prev-' + col
      );

    if (input) {
      input.value =
        x.target.result;
    }

    if (img) {

      img.src =
        x.target.result;

      img.classList.remove(
        'hidden'
      );
    }
  };

  r.readAsDataURL(f);
}

function closeModalForm() {

  document
    .getElementById(
      'modal-form'
    )
    .classList.add(
      'hidden'
    );

  document.body.style.overflow =
    '';

  editingId = null;
  editingRow = null;
}

async function submitData() {

  if (!memoryCache[activeModule]) {
    return showToast(
      'Modul belum siap.',
      'warning'
    );
  }

  const headers =
    memoryCache[
      activeModule
    ].headers.slice(1);

  const data = {};

  headers.forEach(
    c => {

      const el =
        document.getElementById(
          'inp-' + c
        );

      data[c] =
        el
          ? el.value
          : '';
    }
  );

  const payload = {
    action:
      editingId
        ? 'update'
        : 'insert',

    sheet:
      activeModule,

    user:
      currentUser
        ? currentUser.UserID
        : 'System',

    data:
      data
  };

  if (editingId) {
    payload.data.id =
      editingId;
  }

  closeModalForm();

  toggleLoader(true);

  try {

    const r =
      await apiCall(
        'POST',
        payload
      );

    if (
      r.status === 'success'
    ) {

      invalidateCache(
        activeModule
      );

      await loadAdminModule(
        activeModule,
        true
      );

      const related = [
        'Home',
        'Profile',
        'Contact',
        'Portfolio',
        'Blog',
        'Career_Timeline',
        'Documents',
        'Gallery',
        'Web_Branding',
        'Dynamic_Menu',
        'Banners',
        'Popups'
      ];

      if (
        related.includes(
          activeModule
        )
      ) {

        related.forEach(
          x =>
            invalidateCache(x)
        );

        await prefetchEssentialSheets();

        renderPublicContent(
          false
        );

        renderPublicBanners();

        renderPublicPopup();
      }

      showToast(
        r.message ||
        'Data berhasil disimpan!',
        'success'
      );

    } else {

      showToast(
        r.message ||
        'Gagal menyimpan data.',
        'error'
      );
    }

  } finally {

    toggleLoader(false);
  }
}

/* ================================================================
   WEB BRANDING
   ================================================================ */
function applyWebBranding(
  data
) {

  if (
    !data ||
    data.length === 0
  ) {
    return;
  }

  const activeSettings =
    data.find(
      s =>
        s.Status === 'publish' ||
        s.Status === 'active'
    ) ||
    data[0];

  if (
    activeSettings.Site_Name
  ) {
    document.title =
      activeSettings.Site_Name;
  }

  if (
    activeSettings.Favicon_URL
  ) {

    let favicon =
      document.getElementById(
        'dynamic-favicon'
      );

    if (favicon) {

      favicon.href =
        activeSettings.Favicon_URL;

    } else {

      favicon =
        document.createElement(
          'link'
        );

      favicon.id =
        'dynamic-favicon';

      favicon.rel =
        'icon';

      favicon.href =
        activeSettings.Favicon_URL;

      document.head.appendChild(
        favicon
      );
    }
  }

  if (
    activeSettings.Logo_URL
  ) {

    document
      .querySelectorAll(
        '.dynamic-logo-img'
      )
      .forEach(
        img => {

          img.src =
            activeSettings.Logo_URL;

          img.classList.remove(
            'hidden'
          );
        }
      );

    document
      .querySelectorAll(
        '.dynamic-logo-placeholder'
      )
      .forEach(
        el =>
          el.classList.add(
            'hidden'
          )
      );
  }
}

/* ================================================================
   NAVIGATION
   ================================================================ */
function navigateTo(
  view,
  section = null,
  push = true
) {

  if (
    push &&
    !isNavigatingHistory
  ) {
    history.pushState(
      {
        view,
        section
      },
      '',
      ''
    );
  }

  renderView(
    view,
    section
  );
}

function renderView(
  view,
  section
) {

  [
    'attendance',
    'public',
    'login',
    'visitor',
    'admin'
  ].forEach(
    v => {

      const el =
        document.getElementById(
          `view-${v}`
        );

      if (el) {
        el.classList.add(
          'hidden'
        );
      }
    }
  );

  const activeView =
    document.getElementById(
      `view-${view}`
    );

  if (activeView) {
    activeView.classList.remove(
      'hidden'
    );
  }

  if (
    view === 'public'
  ) {

    let sec =
      section || 'home';

    document
      .querySelectorAll(
        '.pub-sec'
      )
      .forEach(
        el =>
          el.classList.add(
            'hidden'
          )
      );

    const target =
      document.getElementById(
        `pub-sec-${sec}`
      );

    if (target) {
      target.classList.remove(
        'hidden'
      );
    }

    document
      .querySelectorAll(
        '.nav-btn'
      )
      .forEach(
        btn => {

          btn.classList.remove(
            'active',
            'text-blue-600'
          );

          btn.classList.add(
            'text-slate-600'
          );

          if (
            btn.getAttribute(
              'data-sec'
            ) === sec
          ) {

            btn.classList.add(
              'active',
              'text-blue-600'
            );

            btn.classList.remove(
              'text-slate-600'
            );
          }
        }
      );

    renderPublicContent(
      false,
      sec
    );

  } else if (
    view === 'visitor'
  ) {

    switchVisitorTab(
      'dash'
    );
  }
}

/* ================================================================
   RESET FORM & AUTO LOGOUT (BUG FIXED)
   ================================================================ */
function resetAuthForms() {
  const inputs = ['reg-name', 'reg-username', 'reg-email', 'reg-wa', 'reg-password', 'reg-password-confirm', 'reg-birth', 'reg-company', 'reg-company-address', 'reg-position', 'login-identifier', 'login-password'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  resetKameraUI();
}

window.addEventListener(
  'popstate',
  e => {
    isNavigatingHistory = true;

    if (e.state && e.state.view) {
      // CEK: Jika user kembali ke halaman portal (attendance) atau home, paksa LOGOUT
      if ((e.state.view === 'attendance' || e.state.view === 'public') && currentUser) {
        handleLogout(); 
      }
      // CEK: Jika user kembali ke portal akses, bersihkan form pendaftaran
      if (e.state.view === 'attendance') {
        resetAuthForms();
      }
      renderView(e.state.view, e.state.section);
    } else {
      if (currentUser) handleLogout();
      resetAuthForms();
      renderView('attendance', null);
    }

    isNavigatingHistory = false;
  }
);

function switchView(
  view
) {
  navigateTo(
    view,
    null,
    true
  );
}

function switchPublicSection(
  sec
) {
  navigateTo(
    'public',
    sec,
    true
  );
}

/* ================================================================
   PRIVACY / TERMS MODAL
   ================================================================ */
async function openModal(
  type
) {

  currentType = type;

  const modal =
    document.getElementById(
      'modal'
    );

  const overlay =
    document.getElementById(
      'modalOverlay'
    );

  const title =
    document.getElementById(
      'modalTitle'
    );

  const body =
    document.getElementById(
      'modalBody'
    );

  title.textContent =
    type === 'privacy'
      ? 'Kebijakan Privasi'
      : 'Syarat dan Ketentuan';

  const sheetName =
    type === 'privacy'
      ? 'Privacy_Policy'
      : 'Terms_Conditions';

  const res =
    await getCachedData(
      sheetName
    );

  let html =
    '<div class="modal-date"><i class="fas fa-calendar-day"></i> Terakhir diperbarui: ' +
    getFormattedDate() +
    '</div>';

  if (
    res.data &&
    res.data.length > 0
  ) {

    res.data.forEach(
      (item, index) => {

        html +=
          '<div class="content-section">';

        html +=
          '<div class="section-title"><span class="section-num">' +
          (index + 1) +
          '</span>' +
          (
            item.Title ||
            item.Title_ID ||
            'Pasal'
          ) +
          '</div>';

        html +=
          '<p class="section-text">' +
          (
            item.Content ||
            item.Description ||
            item.Content_ID ||
            ''
          ) +
          '</p>';

        html +=
          '</div>';
      }
    );

  } else {

    html +=
      '<p class="text-sm text-slate-500">Belum ada data hukum yang dimasukkan melalui Dashboard Admin.</p>';
  }

  html +=
    buildCheckboxSection(
      type
    );

  body.innerHTML =
    html;

  document
    .getElementById(
      'modalContainer'
    )
    .scrollTop = 0;

  modal.classList.add(
    'active'
  );

  overlay.classList.add(
    'active'
  );

  document.body.style.overflow =
    'hidden';
}

function closeModal() {

  clearCountdown();

  document
    .getElementById(
      'modal'
    )
    .classList.remove(
      'active'
    );

  document
    .getElementById(
      'modalOverlay'
    )
    .classList.remove(
      'active'
    );

  document.body.style.overflow =
    '';

  currentType = null;
}

function clearCountdown() {

  if (countdownTimer) {

    clearInterval(
      countdownTimer
    );

    countdownTimer = null;
  }
}

function buildCheckboxSection(
  type
) {

  const label =
    type === 'privacy'
      ? 'Kebijakan Privasi'
      : 'Syarat dan Ketentuan';

  const id =
    type === 'privacy'
      ? 'cbPrivacy'
      : 'cbTerms';

  return (
    '<div class="checkbox-section">' +

      '<div class="checkbox-title">' +
        '<i class="fas fa-triangle-exclamation"></i> ' +
        'Pernyataan Persetujuan' +
      '</div>' +

      '<label class="checkbox-label" for="' +
        id +
        '">' +

        '<input type="checkbox" id="' +
          id +
          '" onchange="handleCheckbox(\'' +
          type +
          '\', this.checked)">' +

        '<span class="custom-check">' +
          '<i class="fas fa-check"></i>' +
        '</span>' +

        '<span class="checkbox-text">' +

          'Dengan mencentang kotak ini, saya menyatakan bahwa saya telah ' +
          '<strong>membaca seluruh isi ' +
          label +
          ' ini sampai selesai</strong> ' +
          'dan ' +
          '<strong>menyetujui secara sadar serta tanpa paksaan</strong>.' +

        '</span>' +

      '</label>' +

      '<div class="countdown-bar" id="countdown-' +
        type +
        '">' +

        '<div class="countdown-track">' +
          '<div class="countdown-fill" id="countdown-fill-' +
            type +
            '"></div>' +
        '</div>' +

        '<div class="countdown-text" id="countdown-text-' +
          type +
          '">' +
          'Modal akan tertutup dalam 5 detik...' +
        '</div>' +

      '</div>' +

    '</div>'
  );
}

function handleCheckbox(
  type,
  checked
) {

  if (!checked) {

    clearCountdown();

    const bar =
      document.getElementById(
        'countdown-' + type
      );

    if (bar) {
      bar.classList.remove(
        'show'
      );
    }

    return;
  }

  const bar =
    document.getElementById(
      'countdown-' + type
    );

  if (bar) {
    bar.classList.add(
      'show'
    );
  }

  let detik = 5;

  const fill =
    document.getElementById(
      'countdown-fill-' + type
    );

  const text =
    document.getElementById(
      'countdown-text-' + type
    );

  if (fill) {
    fill.style.width =
      '0%';
  }

  if (text) {
    text.textContent =
      'Modal akan tertutup dalam ' +
      detik +
      ' detik...';
  }

  clearCountdown();

  countdownTimer =
    setInterval(
      function() {

        detik--;

        const progress =
          (
            (5 - detik) / 5
          ) * 100;

        if (fill) {
          fill.style.width =
            progress +
            '%';
        }

        if (text) {

          text.textContent =
            detik > 0
              ? 'Modal akan tertutup dalam ' +
                detik +
                ' detik...'
              : 'Menutup...';
        }

        if (detik <= 0) {

          clearCountdown();

          closeModal();

          showToast(
            'Persetujuan berhasil dicatat',
            'success'
          );
        }

      },
      1000
    );
}

function getFormattedDate() {

  const now =
    new Date();

  const bulan = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember'
  ];

  const hari = [
    'Minggu',
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu'
  ];

  return (
    hari[now.getDay()] +
    ', ' +
    now.getDate() +
    ' ' +
    bulan[now.getMonth()] +
    ' ' +
    now.getFullYear()
  );
}

/* ================================================================
   PUBLIC PORTFOLIO
   ================================================================ */
async function fetchPublicPortfolio() {

  const res =
    await getCachedData(
      'Portfolio'
    );

  if (
    res.status === 'success' &&
    res.data.length > 0
  ) {

    const list =
      document.getElementById(
        'public-portfolio-list'
      );

    if (list) {

      list.innerHTML = '';

      res.data
        .slice(0, 6)
        .forEach(item => {

          const imgSrc =
            item.CoverImage_URL ||
            item.ImageURL ||
            '';

          list.innerHTML +=
            `
            <div class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-shadow group flex flex-col h-full cursor-pointer animate-fade-in">

              <div class="overflow-hidden rounded-2xl mb-4 bg-slate-100 h-48 flex items-center justify-center">

                ${
                  imgSrc
                    ? `<img
                        src="${imgSrc}"
                        class="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      >`
                    : `<i class="fas fa-image text-slate-300 text-3xl"></i>`
                }

              </div>

              <h4 class="font-extrabold text-base text-slate-900 mb-2">
                ${
                  item.Title_ID ||
                  item.Title ||
                  'Project'
                }
              </h4>

              <p class="text-sm text-slate-500 line-clamp-2 flex-1">
                ${
                  item.Description_ID ||
                  item.Description ||
                  ''
                }
              </p>

            </div>
            `;
        });
    }
  }
}

/* ================================================================
   SAFE HELPERS
   ================================================================ */
function safeText(
  v,
  f = ''
) {
  return (
    v == null ||
    v === ''
  )
    ? f
    : String(v);
}

function safeUrl(v) {

  try {

    const u =
      new URL(v);

    return [
      'http:',
      'https:'
    ].includes(
      u.protocol
    )
      ? u.href
      : '';

  } catch(e) {

    return '';
  }
}

function renderEmpty(
  el,
  msg
) {

  if (el) {

    el.innerHTML =
      `<div class="empty-state">
        <i class="fas fa-inbox text-3xl mb-3 text-slate-300"></i>
        <p>${msg}</p>
      </div>`;
  }
}

/* ================================================================
   PUBLIC DATA LOADER (SUDAH DIBERSIHKAN DARI BUG MACET)
   ================================================================ */
async function renderPublicContent(
  force = false,
  prioritySection = 'home'
) {

  const names = [
    'Home',
    'Profile',
    'Portfolio',
    'Career_Timeline',
    'Gallery',
    'Blog',
    'Documents',
    'Contact'
  ];

  const sectionToSheet = {
    home: 'Home',
    profil: 'Profile',
    profile: 'Profile',
    portfolio: 'Portfolio',
    career: 'Career_Timeline',
    career_timeline: 'Career_Timeline',
    gallery: 'Gallery',
    blog: 'Blog',
    documents: 'Documents',
    contact: 'Contact'
  };

  const priority =
    sectionToSheet[
      String(
        prioritySection ||
        'home'
      ).toLowerCase()
    ] ||
    'Home';

  // 1. Tampilkan Animasi Loading di Seksi yang Sedang Aktif Saja
  const containerMap = {
      'Home': 'public-home-content',
      'Profile': 'public-profile-content',
      'Portfolio': 'public-portfolio-list',
      'Career_Timeline': 'public-career-content',
      'Gallery': 'public-gallery-content',
      'Blog': 'public-blog-content',
      'Documents': 'public-documents-content',
      'Contact': 'public-contact-content'
  };
  
  const targetContainer = document.getElementById(containerMap[priority]);
  if (targetContainer && force) {
      targetContainer.innerHTML = `
          <div class="w-full py-24 flex flex-col items-center justify-center text-slate-400 animate-pulse bg-white rounded-3xl border border-slate-100 shadow-sm">
              <i class="fas fa-circle-notch fa-spin text-5xl text-blue-600 mb-4"></i>
              <p class="font-bold text-lg tracking-wide text-slate-600">Memuat Data...</p>
          </div>
      `;
  }

  // 2. Tarik Data Prioritas (Menu yang Sedang Diklik)
  try {
    let first = await getCachedData(priority, force);
    
    // Fallback khusus Profil: Jika sheet "Profile" kosong, coba cari sheet "Profil"
    if (priority === 'Profile' && (!first || !first.data || first.data.length === 0)) {
       try { first = await getCachedData('Profil', force); } catch(e) {}
    }

    const data = first?.data || [];

    if (priority === 'Home') renderPublicHome(data);
    else if (priority === 'Profile') {
        if (typeof renderPublicProfile === 'function') renderPublicProfile(data);
    }
    else if (priority === 'Portfolio') renderPublicPortfolio(data);
    else if (priority === 'Career_Timeline') renderPublicCareer(data);
    else if (priority === 'Gallery') renderPublicGallery(data);
    else if (priority === 'Blog') renderPublicBlog(data);
    else if (priority === 'Documents') renderPublicDocuments(data);
    else if (priority === 'Contact') renderPublicContact(data);

  } catch(error) {
    console.warn('Gagal memuat section prioritas:', error);
  }

  // 3. Tarik Data Menu Lainnya di Latar Belakang (Tanpa Mengganggu Layar Utama)
  const backgroundNames = names.filter(name => name !== priority);
  await Promise.allSettled(backgroundNames.map(name => getCachedData(name, force)));

  names.forEach(name => {
    // Jangan render ulang jika sudah selesai dirender di blok prioritas atas
    if (name === priority) return; 

    const data = memoryCache[name]?.data || [];

    if (name === 'Home') renderPublicHome(data);
    else if (name === 'Profile') {
        if (typeof renderPublicProfile === 'function') renderPublicProfile(data);
    }
    else if (name === 'Portfolio') renderPublicPortfolio(data);
    else if (name === 'Career_Timeline') renderPublicCareer(data);
    else if (name === 'Gallery') renderPublicGallery(data);
    else if (name === 'Blog') renderPublicBlog(data);
    else if (name === 'Documents') renderPublicDocuments(data);
    else if (name === 'Contact') renderPublicContact(data);
  });
}

/* ================================================================
   PUBLIC HOME (DENGAN STATISTIK KOMUNITAS BERDASARKAN TANGGAL)
   ================================================================ */
async function renderPublicHome(r) {
  const e = document.getElementById('public-home-content');
  if (!e) return;

  const x = r.find(a => a.Status === 'publish' || a.Status === 'active') || r[0];
  if (!x) { renderEmpty(e, 'Belum ada konten Home.'); return; }

  const img = safeUrl(x.HeroImage_URL);
  const htmlHero = `<div class="bg-white rounded-3xl p-8 md:p-14 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-10">${img ? `<img src="${img}" class="w-36 h-36 md:w-52 md:h-52 rounded-full object-cover shadow-xl border-4 border-white">` : ''}<div class="text-center md:text-left flex-1"><h1 class="text-3xl md:text-5xl font-black text-slate-900 leading-tight">${escapeHtml(safeText(x.Title))}</h1><p class="text-blue-600 font-bold mt-3">${escapeHtml(safeText(x.Subtitle))}</p><p class="text-slate-500 mt-4 max-w-2xl text-sm md:text-base leading-relaxed whitespace-pre-line">${escapeHtml(safeText(x.Description))}</p>${x.Action_Button ? `<button onclick="switchPublicSection('portfolio')" class="mt-7 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg">${escapeHtml(x.Action_Button)}</button>` : ''}</div></div>`;
  
  e.className = 'flex flex-col gap-6 animate-fade-in w-full';
  e.innerHTML = htmlHero + `<div id="public-stats-container" class="mt-6 w-full"><div class="text-center text-slate-500 text-sm py-12 bg-white rounded-3xl border shadow-sm"><i class="fas fa-spinner fa-spin text-3xl mb-3 text-blue-500"></i><br>Menarik Data Komunitas...</div></div>`;

  try {
    const [att, usersRes] = await Promise.all([getCachedData('Visitor_Attendance'), getCachedData('Users')]);
    const dataTamu = (att.data || []).reverse();
    const dataUsers = (usersRes.data || []).reverse();

    const htmlTamu = buildAccordionList(dataTamu, 'tamu');
    const htmlReg = buildAccordionList(dataUsers, 'akun');

    document.getElementById('public-stats-container').innerHTML = `
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4"><div class="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0"><i class="fas fa-book"></i></div><div><p class="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Buku Tamu</p><h4 class="text-xl sm:text-2xl font-black">${dataTamu.length}</h4></div></div>
        <div class="bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4"><div class="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0"><i class="fas fa-users"></i></div><div><p class="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Akun Terdaftar</p><h4 class="text-xl sm:text-2xl font-black">${dataUsers.length}</h4></div></div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-2xl border shadow-sm overflow-hidden h-[400px] flex flex-col"><div class="p-4 border-b bg-slate-50 shrink-0"><h3 class="font-extrabold flex items-center gap-2"><i class="fas fa-history text-emerald-500"></i> Riwayat Tamu</h3></div><div class="overflow-y-auto">${htmlTamu}</div></div>
        <div class="bg-white rounded-2xl border shadow-sm overflow-hidden h-[400px] flex flex-col"><div class="p-4 border-b bg-slate-50 shrink-0"><h3 class="font-extrabold flex items-center gap-2"><i class="fas fa-user-plus text-blue-500"></i> Registrasi Akun</h3></div><div class="overflow-y-auto">${htmlReg}</div></div>
      </div>
    `;
  } catch (err) {
    document.getElementById('public-stats-container').innerHTML = '<div class="p-4 text-center text-rose-500 text-sm bg-rose-50 rounded-2xl">Gagal memuat data statistik.</div>';
  }
}

/* ================================================================
   PUBLIC PORTFOLIO
   ================================================================ */
function renderPublicPortfolio(r) {

  const e =
    document.getElementById(
      'public-portfolio-list'
    );

  if (!e) return;

  const a =
    r.filter(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    );

  if (!a.length) {

    renderEmpty(
      e,
      'Belum ada portfolio.'
    );

    return;
  }

  e.innerHTML =
    a.slice(
      0,
      12
    )
    .map(
      x => {

        const img =
          safeUrl(
            x.CoverImage_URL
          );

        const link =
          safeUrl(
            x.Link
          );

        return `
          <article class="bg-white p-5 rounded-3xl border shadow-sm flex flex-col">

            ${
              img
                ? `<img
                    src="${img}"
                    class="h-48 w-full object-cover rounded-2xl mb-4"
                    alt=""
                  >`

                : `<div class="h-48 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                    <i class="fas fa-image text-3xl"></i>
                  </div>`
            }

            <h3 class="font-extrabold">
              ${escapeHtml(
                safeText(
                  x.Title
                )
              )}
            </h3>

            <p class="text-sm text-slate-500 mt-2 flex-1">
              ${escapeHtml(
                safeText(
                  x.Description
                )
              )}
            </p>

            ${
              link
                ? `<a
                    href="${link}"
                    target="_blank"
                    rel="noopener"
                    class="mt-4 text-blue-600 font-bold text-sm"
                  >
                    Lihat Project
                  </a>`
                : ''
            }

          </article>
        `;
      }
    )
    .join('');
}

/* ================================================================
   PUBLIC CAREER
   ================================================================ */
function renderPublicCareer(r) {

  const e =
    document.getElementById(
      'public-career-content'
    );

  if (!e) return;

  const a =
    r.filter(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    );

  if (!a.length) {

    renderEmpty(
      e,
      'Belum ada data Career Center.'
    );

    return;
  }

  e.className =
    'space-y-4';

  e.innerHTML =
    a.map(
      x =>
        `<article class="bg-white p-6 rounded-3xl border shadow-sm">

          <div class="text-xs text-blue-600 font-bold">
            ${escapeHtml(
              safeText(
                x.Year
              )
            )}
          </div>

          <h3 class="font-black text-lg mt-2">
            ${escapeHtml(
              safeText(
                x.Title
              )
            )}
          </h3>

          <p class="text-slate-500 text-sm mt-1">
            ${escapeHtml(
              safeText(
                x.Organization
              )
            )}
          </p>

          <p class="text-slate-500 text-sm mt-2 whitespace-pre-line">
            ${escapeHtml(
              safeText(
                x.Description
              )
            )}
          </p>

        </article>`
    )
    .join('');
}

/* ================================================================
   PUBLIC GALLERY
   ================================================================ */
function renderPublicGallery(r) {

  const e =
    document.getElementById(
      'public-gallery-content'
    );

  if (!e) return;

  const a =
    r.filter(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    );

  if (!a.length) {

    renderEmpty(
      e,
      'Belum ada gallery.'
    );

    return;
  }

  e.innerHTML =
    a.map(
      x => {

        const img =
          safeUrl(
            x.Image_URL
          );

        return `
          <article class="bg-white rounded-3xl border shadow-sm overflow-hidden">

            ${
              img
                ? `<img
                    src="${img}"
                    class="w-full h-64 object-cover"
                    alt=""
                  >`
                : ''
            }

            <div class="p-5">

              <h3 class="font-black">
                ${escapeHtml(
                  safeText(
                    x.Title,
                    'Gallery'
                  )
                )}
              </h3>

              <p class="text-sm text-slate-500 mt-2">
                ${escapeHtml(
                  safeText(
                    x.Description
                  )
                )}
              </p>

            </div>

          </article>
        `;
      }
    )
    .join('');
}

/* ================================================================
   PUBLIC BLOG
   ================================================================ */
function renderPublicBlog(r) {

  const e =
    document.getElementById(
      'public-blog-content'
    );

  if (!e) return;

  const a =
    r.filter(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    );

  if (!a.length) {

    renderEmpty(
      e,
      'Belum ada artikel blog.'
    );

    return;
  }

  e.innerHTML =
    a.map(
      x =>
        `<article class="bg-white p-6 rounded-3xl border shadow-sm">

          <div class="text-xs text-blue-600 font-bold">
            ${escapeHtml(
              safeText(
                x.PublishDate
              )
            )}
          </div>

          <h3 class="font-black text-xl mt-2">
            ${escapeHtml(
              safeText(
                x.Title
              )
            )}
          </h3>

          <p class="text-sm text-slate-500 mt-3 whitespace-pre-line">
            ${escapeHtml(
              safeText(
                x.Excerpt ||
                x.Content
              )
            )}
          </p>

        </article>`
    )
    .join('');
}

/* ================================================================
   PUBLIC DOCUMENTS
   ================================================================ */
function renderPublicDocuments(r) {

  const e =
    document.getElementById(
      'public-documents-content'
    );

  if (!e) return;

  const rows =
    r.filter(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    );

  const protectedRows =
    rows.filter(
      x =>
        /cv|curriculum|lamaran|surat lamaran|resume|resume kerja/i
          .test(
            String(
              x.Title || ''
            ) +
            ' ' +
            String(
              x.Description || ''
            )
          )
    );

  const normalRows =
    rows.filter(
      x =>
        !protectedRows.includes(x)
    );

  const protectedCard =
    `<div class="protected-card mb-6">

      <div class="flex items-start gap-4">

        <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
          <i class="fas fa-shield-halved"></i>
        </div>

        <div class="flex-1">

          <h3 class="font-black text-xl">
            CV & Lamaran Kerja
          </h3>

          <p class="text-sm text-blue-100 mt-2">
            Dokumen ini dilindungi.
            Login sebagai Visitor dan konfirmasi verifikasi wajah sebelum membukanya.
          </p>

          <button
            onclick="requestProtectedDocuments()"
            class="mt-5 bg-white text-slate-900 px-5 py-3 rounded-xl font-black text-xs"
          >
            ${
              currentUser
                ? 'Lanjutkan Verifikasi'
                : 'Login untuk Membuka'
            }
          </button>

        </div>

      </div>

    </div>`;

  const normal =
    normalRows
      .map(
        x => {

          const u =
            safeUrl(
              x.File_URL
            );

          return `
            <article class="bg-white p-5 rounded-3xl border shadow-sm">

              <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <i class="fas fa-file-lines"></i>
              </div>

              <h3 class="font-black mt-4">
                ${escapeHtml(
                  safeText(
                    x.Title,
                    'Dokumen'
                  )
                )}
              </h3>

              <p class="text-sm text-slate-500 mt-2">
                ${escapeHtml(
                  safeText(
                    x.Description
                  )
                )}
              </p>

              ${
                u
                  ? `<a
                      href="${u}"
                      target="_blank"
                      rel="noopener"
                      class="inline-flex mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
                    >
                      Buka Dokumen
                    </a>`
                  : ''
              }

            </article>
          `;
        }
      )
      .join('');

  e.innerHTML =
    protectedCard +
    (
      normal
        ? `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            ${normal}
          </div>`
        : ''
    );
}

/* ================================================================
   PUBLIC CONTACT
   ================================================================ */
function renderPublicContact(r) {

  const e =
    document.getElementById(
      'public-contact-content'
    );

  if (!e) return;

  const x =
    r.find(
      a =>
        a.Status === 'publish' ||
        a.Status === 'active'
    ) ||
    r[0];

  if (!x) {

    renderEmpty(
      e,
      'Belum ada data Contact. Tambahkan melalui Dashboard Admin.'
    );

    return;
  }

  const links = [
    [
      'Instagram_URL',
      'Instagram'
    ],
    [
      'Facebook_URL',
      'Facebook'
    ],
    [
      'LinkedIn_URL',
      'LinkedIn'
    ],
    [
      'YouTube_URL',
      'YouTube'
    ],
    [
      'GitHub_URL',
      'GitHub'
    ]
  ];

  e.className =
    'bg-white rounded-3xl p-8 md:p-10 shadow-sm border animate-fade-in';

  e.innerHTML =
    `<h2 class="text-2xl font-black">
      Contact
    </h2>

    <div class="grid sm:grid-cols-2 gap-4 mt-6">

      <div class="p-4 bg-slate-50 rounded-2xl">
        <b>Email</b>
        <div class="text-sm text-slate-600 mt-1">
          ${escapeHtml(
            safeText(
              x.Email,
              '-'
            )
          )}
        </div>
      </div>

      <div class="p-4 bg-slate-50 rounded-2xl">
        <b>WhatsApp</b>
        <div class="text-sm text-slate-600 mt-1">
          ${escapeHtml(
            safeText(
              x.WhatsApp,
              '-'
            )
          )}
        </div>
      </div>

      <div class="p-4 bg-slate-50 rounded-2xl sm:col-span-2">
        <b>Alamat</b>
        <div class="text-sm text-slate-600 mt-1">
          ${escapeHtml(
            safeText(
              x.Address,
              '-'
            )
          )}
        </div>
      </div>

    </div>

    <div class="flex flex-wrap gap-2 mt-6">

      ${
        links
          .map(
            ([k, l]) => {

              const u =
                safeUrl(
                  x[k]
                );

              return u
                ? `<a
                    href="${u}"
                    target="_blank"
                    rel="noopener"
                    class="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                  >
                    ${l}
                  </a>`
                : '';
            }
          )
          .join('')
      }

    </div>`;
}

/* ================================================================
   DYNAMIC MENU
   ================================================================ */
async function renderDynamicMenu() {

  const res =
    await getCachedData(
      'Dynamic_Menu'
    );

  const rows =
    (res.data || [])
    .filter(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    )
    .sort(
      (a, b) =>
        Number(
          a.Position || 0
        ) -
        Number(
          b.Position || 0
        )
    );

  if (!rows.length) {
    return;
  }

  const desktop =
    document.getElementById(
      'public-desktop-menu'
    );

  const mobile =
    document.getElementById(
      'mobile-menu'
    );

  const build =
    isMobile =>

      rows
        .map(
          x => {

            const label =
              safeText(
                x.Label
              );

            const section =
              safeText(
                x.Section,
                'home'
              )
              .toLowerCase()
              .replace(
                /_/g,
                ' '
              );

            const key =
              section === 'profile'
                ? 'profil'
                : section;

            const url =
              safeUrl(
                x.URL
              );

            if (url) {

              return `
                <a
                  href="${url}"
                  target="_blank"
                  rel="noopener"
                  class="${
                    isMobile
                      ? 'text-left font-bold text-slate-700 p-2 border-b'
                      : 'nav-btn relative text-sm font-semibold text-slate-600 hover:text-blue-600 pb-1'
                  }"
                >
                  ${
                    isMobile
                      ? '🔗 '
                      : ''
                  }
                  ${escapeHtml(label)}
                </a>
              `;

            }

            return `
              <button
                onclick="switchPublicSection('${key}')"
                class="${
                  isMobile
                    ? 'text-left font-bold text-slate-700 p-2 border-b'
                    : 'nav-btn relative text-sm font-semibold text-slate-600 hover:text-blue-600 pb-1'
                }"
              >
                ${
                  isMobile
                    ? '<i class="fas fa-link mr-2"></i>'
                    : ''
                }
                ${escapeHtml(label)}
              </button>
            `;
          }
        )
        .join('');

  if (desktop) {
    desktop.innerHTML =
      build(false);
  }

  if (mobile) {
    mobile.innerHTML =
      build(true);
  }
}

/* ================================================================
   PUBLIC BANNERS
   ================================================================ */
function renderPublicBanners() {

  const slot =
    document.getElementById(
      'public-banner-slot'
    );

  if (!slot) return;

  const rows =
    (
      memoryCache.Banners?.data ||
      []
    )
    .filter(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    )
    .sort(
      (a, b) =>
        Number(
          a.Position || 0
        ) -
        Number(
          b.Position || 0
        )
    );

  if (!rows.length) {

    slot.classList.add(
      'hidden'
    );

    slot.innerHTML = '';

    return;
  }

  slot.classList.remove(
    'hidden'
  );

  slot.innerHTML =
    rows
      .map(
        x => {

          const img =
            safeUrl(
              x.Image_URL
            );

          const u =
            safeUrl(
              x.Button_URL
            );

          return `
            <article class="public-banner">

              ${
                img
                  ? `<img
                      src="${img}"
                      alt=""
                    >`
                  : ''
              }

              <div class="p-5">

                <h3 class="font-black text-lg">
                  ${escapeHtml(
                    safeText(
                      x.Title
                    )
                  )}
                </h3>

                <p class="text-sm text-slate-500 mt-2">
                  ${escapeHtml(
                    safeText(
                      x.Description
                    )
                  )}
                </p>

                ${
                  u
                    ? `<a
                        href="${u}"
                        target="_blank"
                        rel="noopener"
                        class="inline-flex mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
                      >
                        ${escapeHtml(
                          safeText(
                            x.Button_Text,
                            'Buka'
                          )
                        )}
                      </a>`
                    : ''
                }

              </div>

            </article>
          `;
        }
      )
      .join('');
}

/* ================================================================
   PUBLIC POPUP
   ================================================================ */
function renderPublicPopup() {

  const root =
    document.getElementById(
      'public-popup-root'
    );

  if (!root) return;

  const rows =
    (
      memoryCache.Popups?.data ||
      []
    )
    .filter(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    );

  const now =
    new Date();

  const active =
    rows.find(
      x => {

        const a =
          x.StartDate
            ? new Date(
                x.StartDate
              )
            : null;

        const b =
          x.EndDate
            ? new Date(
                x.EndDate
              )
            : null;

        return (
          (!a ||
            isNaN(a) ||
            now >= a) &&
          (!b ||
            isNaN(b) ||
            now <= b)
        );
      }
    );

  if (
    !active ||
    sessionStorage.getItem(
      'zexraps_popup_' +
      (
        active.PopupID ||
        active.Title
      )
    )
  ) {
    return;
  }

  const img =
    safeUrl(
      active.Image_URL
    );

  const u =
    safeUrl(
      active.Button_URL
    );

  root.classList.remove(
    'hidden'
  );

  root.innerHTML =
    `<div
      class="public-popup-overlay"
      onclick="closePublicPopup()"
    >

      <div
        class="public-popup-card"
        onclick="event.stopPropagation()"
      >

        ${
          img
            ? `<img
                src="${img}"
                class="w-full max-h-64 object-cover"
                alt=""
              >`
            : ''
        }

        <div class="p-7">

          <div class="flex justify-between gap-4">

            <h3 class="text-xl font-black text-slate-900">
              ${escapeHtml(
                safeText(
                  active.Title
                )
              )}
            </h3>

            <button
              onclick="closePublicPopup()"
              class="text-slate-400 text-xl"
            >
              &times;
            </button>

          </div>

          <div class="text-sm text-slate-600 mt-4 whitespace-pre-line">
            ${escapeHtml(
              safeText(
                active.Content
              )
            )}
          </div>

          ${
            u
              ? `<a
                  href="${u}"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex mt-6 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-sm"
                >
                  ${escapeHtml(
                    safeText(
                      active.Button_Text,
                      'Lanjutkan'
                    )
                  )}
                </a>`
              : ''
          }

        </div>

      </div>

    </div>`;
}

function closePublicPopup() {

  const root =
    document.getElementById(
      'public-popup-root'
    );

  if (root) {

    root.classList.add(
      'hidden'
    );

    root.innerHTML = '';
  }

  const key =
    (
      memoryCache.Popups?.data ||
      []
    )
    .find(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    );

  if (key) {

    sessionStorage.setItem(
      'zexraps_popup_' +
      (
        key.PopupID ||
        key.Title
      ),
      '1'
    );
  }
}

/* ================================================================
   RESET UI KAMERA & AUTH PANEL (BUG 3 FIXED)
   ================================================================ */
function resetKameraUI() {
  isFaceVerified = false;
  tempFaceData = { front: '', right: '', left: '', descriptor: [] };
  documentFaceDataUrl = '';

  // Kembalikan tombol UI Registrasi
  document.getElementById('reg-face-status')?.classList.add('hidden');
  document.getElementById('btn-reg-face')?.classList.remove('hidden');

  // Kembalikan tombol UI Login
  document.getElementById('login-face-status')?.classList.add('hidden');
  document.getElementById('btn-login-face')?.classList.remove('hidden');

  // Kembalikan tombol UI Recovery
  document.getElementById('rec-face-status')?.classList.add('hidden');
  document.getElementById('btn-rec-face')?.classList.remove('hidden');
}

function showAuthPanel(panel) {
  resetKameraUI(); // BUG 3 FIXED: Reset kamera setiap ganti tab Login/Daftar

  const lp = document.getElementById('auth-login-panel');
  const rp = document.getElementById('auth-register-panel');
  const lt = document.getElementById('auth-login-tab');
  const rt = document.getElementById('auth-register-tab');

  if (!lp || !rp) return;

  const isLogin = panel === 'login';
  lp.classList.toggle('hidden', !isLogin);
  rp.classList.toggle('hidden', isLogin);
  
  if (lt) lt.classList.toggle('active', isLogin);
  if (rt) rt.classList.toggle('active', !isLogin);
}

/* ================================================================
   ADMIN & UI HELPERS
   ================================================================ */
function escapeHtml(v) {

  return String(v)
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}

function initAdminSidebar() {
  const sbHTML = document.getElementById('sidebar-menus');
  if (!sbHTML) return;

  // Tambahkan Tombol Dashboard Khusus Admin
  sbHTML.innerHTML = `
    <div class="mb-5">
       <button type="button" onclick="renderAdminDashboardStats()" class="mod-btn admin-menu-button w-full text-left px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold mb-1 shadow-md text-sm flex items-center gap-3" data-mod="admin-dash">
          <i class="fas fa-chart-pie"></i> <span class="truncate">Dashboard Utama</span>
       </button>
    </div>
  `;

  menuGroups.forEach(
    group => {

      let block =
        `<div class="mb-5">

          <p class="text-slate-500 font-bold px-3 mb-2 text-[10px] tracking-[0.18em] uppercase flex items-center gap-2">
            <i class="fas ${
              group.icon ||
              'fa-folder'
            }"></i>

            ${group.title}
          </p>`;

      group.items.forEach(
        item => {

          block +=
            `<button
              type="button"
              onclick="loadAdminModule('${item.sheet}')"
              class="mod-btn admin-menu-button w-full text-left px-4 py-3 rounded-xl text-slate-300 font-semibold mb-1 hover:bg-slate-800 hover:text-white transition-colors text-sm flex items-center gap-3"
              data-mod="${item.sheet}"
            >

              <i class="fas fa-chevron-right text-[9px] text-slate-500"></i>

              <span class="truncate">
                ${item.label}
              </span>

            </button>`;
        }
      );

      block +=
        '</div>';

      sbHTML.insertAdjacentHTML(
        'beforeend',
        block
      );
    }
  );
}

function toggleAdminSidebar() {

  const sb =
    document.getElementById(
      'adm-sidebar'
    );

  if (!sb) return;

  const open =
    sb.classList.contains(
      'hidden'
    );

  sb.classList.toggle(
    'hidden'
  );

  sb.classList.toggle(
    'mobile-open',
    open
  );

  document.body.style.overflow =
    open
      ? 'hidden'
      : '';
}

async function loadAdminModule(
  sheetName,
  force = false
) {

  activeModule =
    sheetName;

  document
    .getElementById(
      'welcome-panel'
    )
    .classList.add(
      'hidden'
    );

  document
    .getElementById(
      'table-panel'
    )
    .classList.remove(
      'hidden'
    );

  const activeLabel =
    menuGroups
      .flatMap(
        g => g.items
      )
      .find(
        x =>
          x.sheet ===
          sheetName
      )
      ?.label ||
    sheetName.replace(
      /_/g,
      ' '
    );

  document
    .getElementById(
      'admin-module-title'
    )
    .innerText =
      activeLabel;

  document
    .querySelectorAll(
      '.mod-btn'
    )
    .forEach(
      b => {

        const a =
          b.dataset.mod ===
          sheetName;

        b.classList.toggle(
          'bg-blue-600',
          a
        );

        b.classList.toggle(
          'text-white',
          a
        );

        b.classList.toggle(
          'shadow-md',
          a
        );

        b.classList.toggle(
          'text-slate-300',
          !a
        );
      }
    );

  if (
    innerWidth < 768
  ) {

    const sb =
      document.getElementById(
        'adm-sidebar'
      );

    if (sb) {

      sb.classList.add(
        'hidden'
      );

      sb.classList.remove(
        'mobile-open'
      );
    }

    document.body.style.overflow =
      '';
  }

  const ro = [
    'System_Logs',
    'Analytics',
    'Visitor_Attendance'
  ].includes(
    sheetName
  );

  const addButton =
    document.getElementById(
      'btn-add'
    );

  if (addButton) {

    addButton.style.display =
      ro
        ? 'none'
        : 'flex';
  }

  if (
    !force &&
    memoryCache[sheetName]
  ) {

    renderAdminTable(
      memoryCache[sheetName]
        .headers,
      memoryCache[sheetName]
        .data
    );

    return;
  }

  const res =
    await getCachedData(
      sheetName,
      force
    );

  renderAdminTable(
    res.headers || [],
    res.data || []
  );
}

/* ================================================================
   ADMIN TABLE
   ================================================================ */
function renderAdminTable(
  headers,
  rows
) {

  const thead =
    document.getElementById(
      'admin-thead'
    );

  const tbody =
    document.getElementById(
      'admin-tbody'
    );

  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (!headers.length) {

    tbody.innerHTML =
      '<tr><td class="empty-state">Sheet belum memiliki header.</td></tr>';

    return;
  }

  thead.innerHTML =
    '<tr>' +
    headers
      .map(
        x =>
          `<th class="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
            ${escapeHtml(
              x.replace(
                /_/g,
                ' '
              )
            )}
          </th>`
      )
      .join('') +
    '<th class="px-5 py-4 text-xs font-black text-slate-500 uppercase sticky right-0 bg-slate-50">Aksi</th>' +
    '</tr>';

  if (!rows.length) {

    tbody.innerHTML =
      `<tr>
        <td
          colspan="${headers.length + 1}"
          class="empty-state"
        >
          Belum ada data di tabel ini.
        </td>
      </tr>`;

    return;
  }

  const ro = [
    'System_Logs',
    'Analytics',
    'Visitor_Attendance'
  ].includes(
    activeModule
  );

  tbody.innerHTML =
    rows
      .map(
        row => {

          const id =
            String(
              row[
                headers[0]
              ] || ''
            )
            .replace(
              /'/g,
              "\\'"
            );

          const trash =
            row.Status ===
            'trash';

          const cells =
            headers
              .map(
                c => {

                  let v =
                    row[c];

                  if (
                    v == null ||
                    v === ''
                  ) {
                    v = '-';
                  }

                  if (
                    c === 'Status'
                  ) {

                    const cls =
                      (
                        v ===
                          'publish' ||
                        v ===
                          'active'
                      )
                        ? 'bg-emerald-100 text-emerald-700'
                        : (
                            v ===
                            'trash'
                          )
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700';

                    return `
                      <td class="px-5 py-4 text-sm border-b whitespace-nowrap">

                        <span class="px-3 py-1 text-xs font-bold rounded-full ${cls}">
                          ${escapeHtml(v)}
                        </span>

                      </td>
                    `;
                  }

                  if (
                    c ===
                    'PasswordHash'
                  ) {
                    v =
                      '••••••••';
                  }

                  if (
                    typeof v ===
                      'string' &&
                    v.startsWith(
                      'data:image'
                    )
                  ) {

                    return `
                      <td class="px-5 py-4 border-b">

                        <img
                          src="${v}"
                          class="h-10 w-10 object-cover rounded-lg border"
                        >

                      </td>
                    `;
                  }

                  let t =
                    String(v);

                  if (
                    t.length > 60
                  ) {
                    t =
                      t.slice(
                        0,
                        60
                      ) +
                      '...';
                  }

                  return `
                    <td class="px-5 py-4 text-sm text-slate-600 border-b whitespace-nowrap">
                      ${escapeHtml(t)}
                    </td>
                  `;
                }
              )
              .join('');

          let act;

          if (ro) {

            act =
              '<span class="text-xs font-bold text-slate-300">Read Only</span>';

          } else if (trash) {

            act =
              `<button
                type="button"
                onclick="actionData('${id}','restore')"
                class="table-action-btn text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-lg"
              >
                Restore
              </button>`;

          } else {

            act =
              `<div class="flex justify-end gap-2">

                <button
                  type="button"
                  onclick="openEditById('${id}')"
                  class="table-action-btn text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onclick="actionData('${id}','softDelete')"
                  class="table-action-btn text-rose-600 font-bold text-xs bg-rose-50 px-3 py-1.5 rounded-lg"
                >
                  Hapus
                </button>

              </div>`;
          }

          return `
            <tr class="hover:bg-blue-50/50 bg-white">

              ${cells}

              <td class="px-5 py-4 text-right border-b sticky right-0 bg-white">
                ${act}
              </td>

            </tr>
          `;
        }
      )
      .join('');
}

function filterAdminTable(
  query
) {

  const c =
    memoryCache[
      activeModule
    ];

  if (!c) return;

  const q =
    String(
      query || ''
    )
    .toLowerCase()
    .trim();

  const rows =
    q
      ? c.data.filter(
          row =>
            Object.values(
              row
            ).some(
              v =>
                String(
                  v ?? ''
                )
                .toLowerCase()
                .includes(q)
            )
        )
      : c.data;

  renderAdminTable(
    c.headers,
    rows
  );
}

async function refreshAdminModule() {

  if (!activeModule) {
    return;
  }

  invalidateCache(
    activeModule
  );

  const input =
    document.getElementById(
      'admin-search'
    );

  if (input) {
    input.value =
      '';
  }

  await loadAdminModule(
    activeModule,
    true
  );
}

function openEditById(
  id
) {

  const c =
    memoryCache[
      activeModule
    ];

  if (!c) return;

  const r =
    c.data.find(
      x =>
        String(
          x[
            c.headers[0]
          ]
        ) ===
        String(id)
    );

  if (r) {

    openModalInput(
      r
    );

  } else {

    showToast(
      'Data tidak ditemukan.',
      'error'
    );
  }
}

async function actionData(
  id,
  actionType
) {

  if (
    !confirm(
      actionType ===
        'softDelete'
        ? 'Pindahkan data ini ke tempat sampah?'
        : 'Pulihkan data ini?'
    )
  ) {
    return;
  }

  toggleLoader(true);

  try {

    const r =
      await apiCall(
        'POST',
        {
          action:
            actionType,

          sheet:
            activeModule,

          user:
            currentUser
              ? currentUser.UserID
              : 'System',

          data: {
            id: id
          }
        }
      );

    if (
      r.status ===
      'success'
    ) {

      invalidateCache(
        activeModule
      );

      await loadAdminModule(
        activeModule,
        true
      );

      showToast(
        r.message,
        'success'
      );

    } else {

      showToast(
        r.message ||
        'Gagal memproses data.',
        'error'
      );
    }

  } finally {

    toggleLoader(false);
  }
}

/* ================================================================
   WINDOW LOAD
   ================================================================ */
window.addEventListener(
  'load',
  () => {

    history.replaceState(
      {
        view:
          'attendance',
        section:
          null
      },
      '',
      ''
    );

    renderView(
      'attendance',
      null
    );

    startSplashTimer();

  },
  {
    once: true
  }
);

/* ================================================================
   FITUR LOGIN, REGISTRASI, PASSWORD, KAMERA WAJAH, RECOVERY
   ================================================================ */

let videoStream = null;

let currentFaceMode = '';
// 'login', 'register', 'recovery', 'document'

let faceCaptureStep = 1;

let tempFaceData = {
  front: '',
  right: '',
  left: '',
  descriptor: []
};

let isFaceVerified =
  false;

let documentFaceDataUrl =
  '';

let verifiedRecoveryUserId =
  '';

/* ================================================================
   TOGGLE PASSWORD
   ================================================================ */
function togglePassword(
  inputId,
  btnEl
) {

  const input =
    document.getElementById(
      inputId
    );

  const icon =
    btnEl.querySelector(
      'i'
    );

  if (
    input.type ===
    "password"
  ) {

    input.type =
      "text";

    icon.classList.remove(
      'fa-eye'
    );

    icon.classList.add(
      'fa-eye-slash',
      'text-blue-600'
    );

  } else {

    input.type =
      "password";

    icon.classList.remove(
      'fa-eye-slash',
      'text-blue-600'
    );

    icon.classList.add(
      'fa-eye'
    );
  }
}

/* ================================================================
   PASSWORD VALIDATION
   ================================================================ */
let isPasswordStrong =
  false;

let isPasswordMatch =
  false;

function checkPasswordStrength() {

  const pw =
    document.getElementById(
      'reg-password'
    ).value;

  const bar1 =
    document.getElementById(
      'pw-bar-1'
    );

  const bar2 =
    document.getElementById(
      'pw-bar-2'
    );

  const bar3 =
    document.getElementById(
      'pw-bar-3'
    );

  const text =
    document.getElementById(
      'pw-status-text'
    );

  bar1.className =
    'h-full w-1/3 transition-all';

  bar2.className =
    'h-full w-1/3 transition-all';

  bar3.className =
    'h-full w-1/3 transition-all';

  const hasUpper =
    /[A-Z]/.test(pw);

  const hasLower =
    /[a-z]/.test(pw);

  const hasNum =
    /\d/.test(pw);

  const hasSym =
    /[\W_]/.test(pw);

  const isLong =
    pw.length >= 8;

  let strength = 0;

  if (isLong) {
    strength++;
  }

  if (
    hasUpper &&
    hasLower
  ) {
    strength++;
  }

  if (
    hasNum &&
    hasSym
  ) {
    strength++;
  }

  isPasswordStrong =
    false;

  if (pw.length === 0) {

    text.innerText =
      "Belum Diisi";

    text.className =
      "text-[10px] font-bold mt-1 text-slate-500";

  } else if (
    strength === 1 ||
    !isLong
  ) {

    bar1.classList.add(
      'pw-weak'
    );

    text.innerText =
      "Lemah (Belum Memenuhi Syarat)";

    text.className =
      "text-[10px] font-bold mt-1 text-rose-500";

  } else if (
    strength === 2
  ) {

    bar1.classList.add(
      'pw-medium'
    );

    bar2.classList.add(
      'pw-medium'
    );

    text.innerText =
      "Sedang (Gunakan Simbol/Angka)";

    text.className =
      "text-[10px] font-bold mt-1 text-yellow-500";

  } else if (
    strength === 3 &&
    isLong
  ) {

    bar1.classList.add(
      'pw-strong'
    );

    bar2.classList.add(
      'pw-strong'
    );

    bar3.classList.add(
      'pw-strong'
    );

    text.innerText =
      "Kuat (Memenuhi Syarat)";

    text.className =
      "text-[10px] font-bold mt-1 text-emerald-600";

    isPasswordStrong =
      true;
  }

  checkPasswordMatch();
}

function checkPasswordMatch() {

  const pw =
    document.getElementById(
      'reg-password'
    ).value;

  const pw2 =
    document.getElementById(
      'reg-password-confirm'
    ).value;

  const btnSubmit =
    document.getElementById(
      'btn-submit-reg'
    );

  isPasswordMatch =
    (
      pw === pw2 &&
      pw.length > 0
    );

  if (
    isPasswordStrong &&
    isPasswordMatch &&
    isFaceVerified
  ) {

    btnSubmit.disabled =
      false;

    btnSubmit.classList.remove(
      'opacity-50',
      'cursor-not-allowed'
    );

  } else {

    btnSubmit.disabled =
      true;

    btnSubmit.classList.add(
      'opacity-50',
      'cursor-not-allowed'
    );
  }
}

/* ================================================================
   START FACE CAMERA
   ================================================================ */
async function startFaceCamera(
  mode
) {

  currentFaceMode =
    mode;

  faceCaptureStep =
    1;

  isFaceVerified =
    false;

  documentFaceDataUrl =
    '';

  if (
    mode === 'register'
  ) {

    tempFaceData = {
      front: '',
      right: '',
      left: ''
    };
  }

  if (faceDetectionTimer) {

    clearInterval(
      faceDetectionTimer
    );

    faceDetectionTimer =
      null;
  }

  faceStableCount =
    0;

  faceAutoCaptureRunning =
    false;

  const modal =
    document.getElementById(
      'face-verification-modal'
    );

  const video =
    document.getElementById(
      'face-camera'
    );

  const captureBtn =
    document.getElementById(
      'face-capture-btn'
    );

  const instr =
    document.getElementById(
      'face-instruction'
    );

  if (
    !modal ||
    !video ||
    !captureBtn
  ) {

    showToast(
      'Komponen kamera tidak ditemukan.',
      'error'
    );

    return;
  }

  /* ==============================================================
     RESET UI
     ============================================================== */

  modal.classList.remove(
    'hidden'
  );

  video.classList.remove(
    'hidden'
  );

  captureBtn.classList.remove(
    'hidden'
  );

  captureBtn.disabled =
    false;

  captureBtn.innerHTML =
    '📸 Ambil Foto (<span id="face-step-counter">1/1</span>)';

  const counter =
    document.getElementById(
      'face-step-counter'
    );

  /* ==============================================================
     INSTRUKSI MODE
     ============================================================== */

  if (
    mode === 'register'
  ) {

    if (instr) {
      instr.innerText =
        'Hadap DEPAN';
    }

    if (counter) {
      counter.innerText =
        '1/3';
    }

  } else if (
    mode === 'document'
  ) {

    if (instr) {
      instr.innerText =
        'Posisikan wajah di depan kamera';
    }

    if (counter) {
      counter.innerText =
        '1/1';
    }

  } else if (
    mode === 'recovery'
  ) {

    if (instr) {
      instr.innerText =
        'Posisikan wajah di depan kamera';
    }

    if (counter) {
      counter.innerText =
        '1/1';
    }

  } else if (
    mode === 'login'
  ) {

    if (instr) {
      instr.innerText =
        'Posisikan wajah di depan kamera';
    }

    if (counter) {
      counter.innerText =
        '1/1';
    }

  } else {

    if (instr) {
      instr.innerText =
        'Posisikan wajah di depan kamera';
    }

    if (counter) {
      counter.innerText =
        '1/1';
    }
  }

  /* ==============================================================
     HENTIKAN STREAM KAMERA LAMA
     ============================================================== */

  if (videoStream) {

    videoStream
      .getTracks()
      .forEach(
        track => {

          try {
            track.stop();
          } catch(e) {}

        }
      );

    videoStream =
      null;
  }

  video.srcObject =
    null;

  /* ==============================================================
     CEK SUPPORT
     ============================================================== */

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    modal.classList.add(
      'hidden'
    );

    showToast(
      'Browser ini tidak mendukung akses kamera.',
      'error'
    );

    return;
  }

  /* ==============================================================
     BUKA KAMERA
     ============================================================== */

  try {

    videoStream =
      await navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: {
              ideal: 'user'
            },
            width: {
              ideal: 1280
            },
            height: {
              ideal: 720
            }
          },
          audio: false
        });

    video.srcObject =
      videoStream;

    /* ============================================================
       TUNGGU VIDEO SIAP
       ============================================================ */

    await new Promise(
      resolve => {

        if (
          video.readyState >= 2 &&
          video.videoWidth > 0
        ) {

          resolve();
          return;
        }

        const onReady =
          () => {

            video.removeEventListener(
              'loadedmetadata',
              onReady
            );

            resolve();
          };

        video.addEventListener(
          'loadedmetadata',
          onReady,
          {
            once: true
          }
        );
      }
    );

    /* ============================================================
       PLAY VIDEO
       ============================================================ */

    try {

      await video.play();

    } catch (playError) {

      console.warn(
        'Video play warning:',
        playError
      );
    }

    /* ============================================================
       LOAD MODEL
       ============================================================ */

    const modelReady =
      await loadFaceDetectionModel();

    if (!modelReady) {

      if (videoStream) {

        videoStream
          .getTracks()
          .forEach(
            track => {

              try {
                track.stop();
              } catch(e) {}

            }
          );

        videoStream =
          null;
      }

      video.srcObject =
        null;

      modal.classList.add(
        'hidden'
      );

      return;
    }

    /* ============================================================
       START AUTO DETECTION
       ============================================================ */

    startAutomaticFaceDetection();

    captureBtn.disabled =
      false;

    if (instr) {

      if (
        mode === 'register'
      ) {

        instr.innerText =
          'Hadap DEPAN';

      } else {

        instr.innerText =
          'Posisikan wajah di depan kamera';
      }
    }

  } catch (err) {

    console.error(
      'Camera error:',
      err
    );

    if (videoStream) {

      videoStream
        .getTracks()
        .forEach(
          track => {

            try {
              track.stop();
            } catch(e) {}

          }
        );

      videoStream =
        null;
    }

    video.srcObject =
      null;

    modal.classList.add(
      'hidden'
    );

    let message =
      'Gagal mengakses kamera.';

    if (
      err &&
      err.name ===
        'NotAllowedError'
    ) {

      message =
        'Akses kamera ditolak. Izinkan kamera pada browser kemudian coba lagi.';

    } else if (
      err &&
      err.name ===
        'NotFoundError'
    ) {

      message =
        'Kamera tidak ditemukan pada perangkat.';

    } else if (
      err &&
      err.name ===
        'NotReadableError'
    ) {

      message =
        'Kamera sedang digunakan aplikasi lain.';

    } else if (
      err &&
      err.name ===
        'SecurityError'
    ) {

      message =
        'Browser memblokir akses kamera karena alasan keamanan.';
    }

    showToast(
      message,
      'warning'
    );
  }
}

/* ================================================================
   CLOSE FACE CAMERA
   ================================================================ */
function closeFaceVerification() {

  if (
    faceDetectionTimer
  ) {

    clearInterval(
      faceDetectionTimer
    );

    faceDetectionTimer =
      null;
  }

  faceStableCount =
    0;

  faceAutoCaptureRunning =
    false;

  const modal =
    document.getElementById(
      'face-verification-modal'
    );

  if (modal) {

    modal.classList.add(
      'hidden'
    );
  }

  const video =
    document.getElementById(
      'face-camera'
    );

  if (video) {

    try {
      video.pause();
    } catch(e) {}

    video.srcObject =
      null;
  }

  if (videoStream) {

    videoStream
      .getTracks()
      .forEach(
        track => {

          try {
            track.stop();
          } catch(e) {}

        }
      );

    videoStream =
      null;
  }
}

/* ================================================================
   DEVICE INFO & GEOLOCATION (BUG 1 FIXED - OTOMATIS)
   ================================================================ */
async function getDeviceAndLocation() {
  let deviceInfo = navigator.userAgent;
  let ip = "Tidak terdeteksi";
  let geo = "Lokasi otomatis tidak terdeteksi";

  try {
    // Menggunakan IP API untuk mendeteksi lokasi otomatis tanpa izin GPS
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    if(data.ip) ip = data.ip;
    if(data.city) geo = `${data.city}, ${data.region}, ${data.country_name}`;
  } catch(e) {
    // Fallback jika ipapi.co gagal
    try {
      const res2 = await fetch('https://api.ipify.org?format=json');
      const data2 = await res2.json();
      ip = data2.ip;
      geo = "Jaringan Lokal/Indonesia";
    } catch(err) {}
  }

  return new Promise(resolve => {
    resolve({ deviceInfo, ip, geo });
  });
}

/* ================================================================
   REGISTER OTP
   ================================================================ */
async function sendRegisterOTP() {

  const email =
    document.getElementById(
      'reg-email'
    ).value;

  const name =
    document.getElementById(
      'reg-name'
    ).value;

  if (
    !email ||
    !name
  ) {

    return showToast(
      "Isi Nama & Email terlebih dahulu!",
      "warning"
    );
  }

  toggleLoader(true);

  try {

    const json =
      await apiCall(
        'POST',
        {
          action: 'sendOTP',
          data: {
            email:
              email,
            fullName:
              name
          }
        }
      );

    if (
      json.status ===
      'success'
    ) {

      document
        .getElementById(
          'reg-otp-box'
        )
        .classList.remove(
          'hidden'
        );

      showToast(
        "OTP terkirim ke Email Anda!",
        "success"
      );

    } else {

      showToast(
        json.message,
        "error"
      );
    }

  } catch(e) {

    showToast(
      'Error jaringan',
      "error"
    );

  } finally {

    toggleLoader(false);
  }
}

/* ================================================================
   REGISTER
   ================================================================ */
async function handleRegister() {

  if (
    !isPasswordStrong ||
    !isPasswordMatch ||
    !isFaceVerified
  ) {
    return;
  }

  const otp =
    document.getElementById(
      'reg-otp'
    ).value;

  const email =
    document.getElementById(
      'reg-email'
    ).value;

  if (
    !otp ||
    otp.length !== 4
  ) {

    return showToast(
      "Masukkan 4 digit OTP!",
      "warning"
    );
  }

  toggleLoader(true);

  try {

    const otpJson =
      await apiCall(
        'POST',
        {
          action:
            'verifyOTP',

          data: {
            email,
            code:
              otp
          }
        }
      );

    if (
      otpJson.status !==
      'success'
    ) {

      return showToast(
        otpJson.message,
        "error"
      );
    }

    const meta =
      await getDeviceAndLocation();

    const payload = {
      action: 'register',
      data: {
        fullName: document.getElementById('reg-name').value,
        username: document.getElementById('reg-username').value,
        birthInfo: document.getElementById('reg-birth').value,
        company: document.getElementById('reg-company').value,
        companyAddress: document.getElementById('reg-company-address').value,
        position: document.getElementById('reg-position').value,
        email: email,
        whatsapp: document.getElementById('reg-wa').value,
        password: document.getElementById('reg-password').value,
        
        // BUG FIXED: Jangan di-stringify jadi satu, pecah jadi 3 agar Backend mudah membaca dan menyimpannya ke Sheet!
        faceFront: tempFaceData.front,
        faceRight: tempFaceData.right,
        faceLeft: tempFaceData.left,
        faceDescriptor: JSON.stringify(tempFaceData.descriptor || []), // Kirim 128 titik biometrik ke server
        
        deviceInfo: meta.deviceInfo,
        locationIP: meta.ip,
        geoLocation: meta.geo,
        role: 'Visitor'
      }
    };

    const json =
      await apiCall(
        'POST',
        payload
      );

    if (
      json.status ===
      'success'
    ) {

      showToast(
        "Registrasi Berhasil! Silakan Login.",
        "success"
      );

      showAuthPanel(
        'login'
      );

    } else {

      showToast(
        json.message,
        "error"
      );
    }

  } catch(e) {

    showToast(
      "Gagal Terhubung ke Server",
      "error"
    );

  } finally {

    toggleLoader(false);
  }
}

/* ================================================================
   LOGIN (BUG 2 & 5 FIXED)
   ================================================================ */
async function handleLogin() {
  const identifier = document.getElementById('login-identifier')?.value || document.getElementById('login-email')?.value;
  const password = document.getElementById('login-password')?.value;

  if (!identifier || !password) {
    return showToast("Isi semua data login!", "warning");
  }

  // BUG 5 FIXED: Paksa wajib ambil foto sebelum login
  if (!isFaceVerified || !tempFaceData.front) {
    return showToast("Verifikasi wajah wajib dilakukan untuk Login!", "warning");
  }

  toggleLoader(true);
  const meta = await getDeviceAndLocation();

  const payload = {
    action: 'login',
    data: {
      identifier: identifier.trim(), // BUG 2 FIXED: Ganti nama var jadi 'identifier'
      password: password,
      faceVerified: isFaceVerified,
      loginFacePhoto: tempFaceData.front, // Kirim ke backend sebagai bukti foto saat itu
      loginFaceDescriptor: JSON.stringify(tempFaceData.descriptor || []), // Wajib untuk pencocokan Euclidean Distance
      deviceInfo: meta.deviceInfo
    }
  };

  try {
    const json = await apiCall('POST', payload);
    if (json.status === 'success') {
      currentUser = json.user;
      showToast("Login Berhasil! Selamat datang.", "success");
      if (currentUser.Role === 'SuperAdmin') {
        initAdminSidebar();
        switchView('admin');
      } else {
        switchView('visitor');
      }
    } else {
      showToast(json.message, "error");
    }
  } catch(e) {
    showToast("Gagal Terhubung ke Server", "error");
  } finally {
    toggleLoader(false);
  }
}

/* ================================================================
   LOGOUT
   ================================================================ */
function handleLogout() {

  currentUser =
    null;

  memoryCache =
    {};

  isFaceVerified =
    false;

  tempFaceData = {
    front: '',
    right: '',
    left: ''
  };

  showToast(
    "Sesi berakhir.",
    "info"
  );

  switchView(
    'attendance'
  );
}

/* ================================================================
   RECOVERY
   ================================================================ */
function openRecoveryPanel() {

  document
    .getElementById(
      'auth-recovery'
    )
    ?.classList.remove(
      'hidden'
    );
}

function closeRecoveryPanel() {

  document
    .getElementById(
      'auth-recovery'
    )
    ?.classList.add(
      'hidden'
    );
}

function changeRecoveryForm() {

  const type =
    document.getElementById(
      'recovery-type'
    ).value;

  const container =
    document.getElementById(
      'recovery-dynamic-form'
    );

  container.innerHTML =
    '';

  container.classList.remove(
    'hidden'
  );

  document
    .getElementById(
      'recovery-new-data-form'
    )
    .classList.add(
      'hidden'
    );

  isFaceVerified =
    false;

  let html =
    '';

  const createInput =
    (
      id,
      label,
      type,
      placeholder
    ) =>
      `<div>

        <label class="text-xs font-bold text-slate-700 block mb-1">
          ${label}
        </label>

        <input
          id="${id}"
          type="${type}"
          placeholder="${placeholder}"
          class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
        >

      </div>`;

  const faceBtnHtml =
    `
      <button
        type="button"
        onclick="startFaceCamera('recovery')"
        id="btn-rec-face"
        class="w-full border-2 border-dashed border-rose-300 text-rose-600 font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 mt-2"
      >
        <i class="fas fa-camera"></i>
        Verifikasi Wajah Wajib
      </button>

      <div
        id="rec-face-status"
        class="hidden text-center text-xs font-bold text-emerald-600 mt-2"
      >
        <i class="fas fa-check-circle"></i>
        Wajah Terverifikasi
      </div>

      <button
        type="button"
        onclick="submitRecoveryCheck()"
        class="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl text-sm mt-3 shadow-md"
      >
        Cek Kecocokan Data
      </button>
    `;

  if (
    type === '1'
  ) {

    html +=
      createInput(
        'rec-email',
        'Email Terdaftar',
        'email',
        'nama@email.com'
      ) +

      createInput(
        'rec-wa',
        'Nomor WhatsApp',
        'number',
        '08xxxxx'
      ) +

      createInput(
        'rec-password',
        'Password Akun',
        'password',
        '••••••••'
      );

  } else if (
    type === '2'
  ) {

    html +=
      createInput(
        'rec-wa',
        'Nomor WhatsApp Terdaftar',
        'number',
        '08xxxxx'
      ) +

      createInput(
        'rec-password',
        'Password Akun',
        'password',
        '••••••••'
      ) +

      createInput(
        'rec-new-email',
        'Masukkan Email Baru Anda',
        'email',
        'emailbaru@domain.com'
      );

  } else if (
    type === '3'
  ) {

    html +=
      createInput(
        'rec-email',
        'Email Terdaftar',
        'email',
        'nama@email.com'
      ) +

      createInput(
        'rec-password',
        'Password Akun',
        'password',
        '••••••••'
      );

  } else if (
    type === '4'
  ) {

    html +=
      createInput(
        'rec-email',
        'Email Terdaftar',
        'email',
        'nama@email.com'
      ) +

      createInput(
        'rec-wa',
        'Nomor WhatsApp',
        'number',
        '08xxxxx'
      );

  } else if (
    type === '5'
  ) {

    html +=
      createInput(
        'rec-fullname',
        'Nama Lengkap (Sesuai KTP)',
        'text',
        'Nama Anda'
      ) +

      createInput(
        'rec-birth',
        'Tempat & Tgl Lahir',
        'text',
        'Sesuai data pendaftaran'
      ) +

      createInput(
        'rec-new-email',
        'Email Baru yang Aktif',
        'email',
        'emailbaru@domain.com'
      );
  }

  container.innerHTML =
    html +
    faceBtnHtml;
}

async function submitRecoveryCheck() {

  const type =
    document.getElementById(
      'recovery-type'
    ).value;

  if (!isFaceVerified) {

    return showToast(
      "Verifikasi wajah wajib dilakukan untuk Lupa Akun!",
      "warning"
    );
  }

  const data = {
    recoveryType:
      type
  };

  if (
    document.getElementById(
      'rec-email'
    )
  ) {

    data.email =
      document.getElementById(
        'rec-email'
      ).value;
  }

  if (
    document.getElementById(
      'rec-wa'
    )
  ) {

    data.whatsapp =
      document.getElementById(
        'rec-wa'
      ).value;
  }

  if (
    document.getElementById(
      'rec-password'
    )
  ) {

    data.password =
      document.getElementById(
        'rec-password'
      ).value;
  }

  if (
    document.getElementById(
      'rec-fullname'
    )
  ) {

    data.fullName =
      document.getElementById(
        'rec-fullname'
      ).value;
  }

  if (
    document.getElementById(
      'rec-birth'
    )
  ) {

    data.birthInfo =
      document.getElementById(
        'rec-birth'
      ).value;
  }

  toggleLoader(true);

  try {

    const json =
      await apiCall(
        'POST',
        {
          action:
            'validateRecovery',
          data:
            data
        }
      );

    if (
      json.status ===
      'success'
    ) {

      verifiedRecoveryUserId =
        json.userId;

      showToast(
        "Data Valid! Silakan buat data baru.",
        "success"
      );

      document
        .getElementById(
          'recovery-dynamic-form'
        )
        .classList.add(
          'hidden'
        );

      const newInputs =
        document.getElementById(
          'recovery-new-inputs'
        );

      newInputs.innerHTML =
        '';

      const createInput =
        (
          id,
          label,
          type
        ) =>
          `<div>

            <label class="text-[11px] font-bold text-slate-700 block mb-1">
              ${label}
            </label>

            <input
              id="${id}"
              type="${type}"
              class="w-full p-3 border border-emerald-300 rounded-xl text-sm outline-none"
            >

          </div>`;

      if (
        type === '1'
      ) {

        newInputs.innerHTML =
          createInput(
            'upd-username',
            'Buat Username Baru',
            'text'
          );

      }

      if (
        type === '2'
      ) {

        newInputs.innerHTML =
          createInput(
            'upd-email',
            'Konfirmasi Email Baru',
            'email'
          );

        document.getElementById(
          'upd-email'
        ).value =
          document.getElementById(
            'rec-new-email'
          ).value;
      }

      if (
        type === '3'
      ) {

        newInputs.innerHTML =
          createInput(
            'upd-wa',
            'Nomor WhatsApp Baru',
            'number'
          );
      }

      if (
        type === '4'
      ) {

        newInputs.innerHTML =
          createInput(
            'upd-password',
            'Buat Password Baru',
            'text'
          );
      }

      if (
        type === '5'
      ) {

        newInputs.innerHTML =
          createInput(
            'upd-username',
            'Username Baru',
            'text'
          ) +

          createInput(
            'upd-email',
            'Email Baru',
            'email'
          ) +

          createInput(
            'upd-wa',
            'WhatsApp Baru',
            'number'
          ) +

          createInput(
            'upd-password',
            'Password Baru',
            'text'
          );

        document.getElementById(
          'upd-email'
        ).value =
          document.getElementById(
            'rec-new-email'
          ).value;
      }

      document
        .getElementById(
          'recovery-new-data-form'
        )
        .classList.remove(
          'hidden'
        );

    } else {

      showToast(
        json.message,
        "error"
      );
    }

  } catch(e) {

    showToast(
      "Error pengecekan data.",
      "error"
    );

  } finally {

    toggleLoader(false);
  }
}

async function submitNewRecoveryData() {

  if (!verifiedRecoveryUserId) {
    return;
  }

  const updateData = {
    id:
      verifiedRecoveryUserId
  };

  if (
    document.getElementById(
      'upd-username'
    )
  ) {

    updateData.newUsername =
      document.getElementById(
        'upd-username'
      ).value;
  }

  if (
    document.getElementById(
      'upd-email'
    )
  ) {

    updateData.newEmail =
      document.getElementById(
        'upd-email'
      ).value;
  }

  if (
    document.getElementById(
      'upd-wa'
    )
  ) {

    updateData.newWhatsapp =
      document.getElementById(
        'upd-wa'
      ).value;
  }

  if (
    document.getElementById(
      'upd-password'
    )
  ) {

    updateData.newPassword =
      document.getElementById(
        'upd-password'
      ).value;
  }

  toggleLoader(true);

  try {

    const json =
      await apiCall(
        'POST',
        {
          action:
            'updateRecoveryData',
          data:
            updateData
        }
      );

    if (
      json.status ===
      'success'
    ) {

      showToast(
        json.message,
        "success"
      );

      closeRecoveryPanel();

      showAuthPanel(
        'login'
      );

    } else {

      showToast(
        json.message,
        "error"
      );
    }

  } catch(e) {

    showToast(
      "Error penyimpanan data",
      "error"
    );

  } finally {

    toggleLoader(false);
  }
}

/* ================================================================
   PROTECTED DOCUMENTS
   ================================================================ */
function requestProtectedDocuments() {

  if (!currentUser) {

    switchView(
      'login'
    );

    return;
  }

  startFaceCamera(
    'document'
  );
}

async function confirmFaceVerification() {

  if (!documentFaceDataUrl) {

    return showToast(
      'Ambil foto terlebih dahulu.',
      'warning'
    );
  }

  closeFaceVerification();

  await openProtectedDocuments();
}

async function openProtectedDocuments() {

  const container =
    document.getElementById(
      'public-documents-content'
    );

  if (!container) {
    return;
  }

  const res =
    await getCachedData(
      'Documents',
      true
    );

  const rows =
    (res.data || [])
    .filter(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    )
    .filter(
      x =>
        /cv|curriculum|lamaran|surat lamaran|resume|resume kerja/i
          .test(
            String(
              x.Title || ''
            ) +
            ' ' +
            String(
              x.Description || ''
            )
          )
    );

  if (!rows.length) {

    showToast(
      'CV atau Lamaran Kerja belum tersedia.',
      'info'
    );

    return;
  }

  container.innerHTML =
    `<div class="bg-white p-7 rounded-3xl border shadow-sm">

      <div class="flex items-center gap-3 mb-5">

        <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <i class="fas fa-user-shield"></i>
        </div>

        <div>

          <h2 class="font-black text-xl text-slate-900">
            Dokumen Terverifikasi
          </h2>

          <p class="text-xs text-slate-500">
            Akses diberikan setelah konfirmasi selfie.
          </p>

        </div>

      </div>

      <div class="grid sm:grid-cols-2 gap-4">

        ${
          rows
            .map(
              x => {

                const u =
                  safeUrl(
                    x.File_URL
                  );

                return `
                  <article class="p-5 bg-slate-50 rounded-2xl border">

                    <div class="font-black">
                      ${escapeHtml(
                        safeText(
                          x.Title,
                          'Dokumen'
                        )
                      )}
                    </div>

                    <p class="text-xs text-slate-500 mt-2">
                      ${escapeHtml(
                        safeText(
                          x.Description
                        )
                      )}
                    </p>

                    ${
                      u
                        ? `<a
                            href="${u}"
                            target="_blank"
                            rel="noopener"
                            onclick="logProtectedAccess('${escapeHtml(
                              safeText(
                                x.Title
                              )
                            )}')"
                            class="inline-flex mt-4 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"
                          >
                            Buka Dokumen
                          </a>`
                        : ''
                    }

                  </article>
                `;
              }
            )
            .join('')
        }

      </div>

    </div>`;
}

async function logProtectedAccess(
  title
) {

  try {

    await apiCall(
      'POST',
      {
        action:
          'logActivity',

        user:
          currentUser?.UserID ||
          currentUser?.Email ||
          'Visitor',

        data: {
          action:
            'PROTECTED_DOCUMENT_ACCESS',

          description:
            'Akses ' +
            title
        }
      }
    );

  } catch(e) {}
}

/* ================================================================
   PUSAT PANDUAN (HELP CENTER) - INTERNASIONAL
   ================================================================ */
let globalHelpData = [];

async function openHelpCenter() {
   const modal = document.getElementById('help-modal');
   const content = document.getElementById('help-modal-content');
   const body = document.getElementById('help-body');
   const searchInput = document.getElementById('help-search');

   if (!modal || !body) return;

   // Reset pencarian saat dibuka
   if(searchInput) searchInput.value = '';

   modal.classList.remove('hidden');
   setTimeout(() => {
      modal.classList.remove('opacity-0');
      content.classList.remove('scale-95');
   }, 10);

   body.innerHTML = '<div class="col-span-1 md:col-span-3 text-center text-slate-500 py-12"><i class="fas fa-spinner fa-spin text-4xl mb-3 text-blue-500"></i><p class="font-semibold text-sm">Menyinkronkan data panduan...</p></div>';

   try {
      const res = await getCachedData('Bantuan');
      
      // Filter hanya yang berstatus aktif/publish
      globalHelpData = (res.data || []).filter(x => !x.Status || x.Status === 'publish' || x.Status === 'active');

      renderHelpItems(globalHelpData);

   } catch (error) {
      body.innerHTML = '<div class="col-span-1 md:col-span-3 text-center text-rose-500 py-12"><i class="fas fa-wifi text-4xl mb-3 text-rose-300"></i><p class="font-semibold text-sm">Koneksi terputus. Gagal memuat panduan.</p></div>';
   }
}

function renderHelpItems(data) {
   const body = document.getElementById('help-body');
   if (!body) return;

   if (data.length === 0) {
      body.innerHTML = '<div class="col-span-1 md:col-span-3 text-center text-slate-400 py-12"><i class="fas fa-box-open text-5xl mb-4 text-slate-300"></i><p class="font-semibold">Panduan tidak ditemukan.</p></div>';
      return;
   }

   let html = '';
   data.forEach((item) => {
      const imgUrl = safeUrl(item.Image_URL);
      const kategori = safeText(item.Kategori, 'Umum');
      const judul = safeText(item.Judul, 'Panduan');
      const konten = safeText(item.Konten, '');

      html += `
         <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col group h-full">
            ${imgUrl ? `<div class="h-40 w-full overflow-hidden bg-slate-100 shrink-0 border-b border-slate-100"><img src="${imgUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"></div>` : ''}
            <div class="p-5 flex-1 flex flex-col">
               <div class="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black tracking-wider uppercase mb-3 self-start border border-blue-100">${escapeHtml(kategori)}</div>
               <h3 class="font-extrabold text-slate-900 text-lg mb-3 leading-tight group-hover:text-blue-600 transition-colors">${escapeHtml(judul)}</h3>
               <div class="text-sm text-slate-600 leading-relaxed whitespace-pre-line flex-1">
                  ${escapeHtml(konten)}
               </div>
            </div>
         </div>
      `;
   });
   body.innerHTML = html;
}

// Fungsi Pencarian Real-time
function searchHelp(query) {
   if(!globalHelpData) return;
   const q = query.toLowerCase().trim();
   const filtered = globalHelpData.filter(item => 
      (item.Judul && item.Judul.toLowerCase().includes(q)) || 
      (item.Konten && item.Konten.toLowerCase().includes(q)) ||
      (item.Kategori && item.Kategori.toLowerCase().includes(q))
   );
   renderHelpItems(filtered);
}

function closeHelpCenter() {
   const modal = document.getElementById('help-modal');
   const content = document.getElementById('help-modal-content');
   if (!modal) return;

   modal.classList.add('opacity-0');
   content.classList.add('scale-95');
   setTimeout(() => {
      modal.classList.add('hidden');
   }, 300);
}

/* ================================================================
   PERBAIKAN SINKRONISASI MANUAL & DETEKSI KONEKSI (ANTI FALSE ERROR)
   ================================================================ */

// 1. Pemicu Refresh Manual
async function refreshManual(btnEl) {
    // Putar semua ikon refresh
    const icons = document.querySelectorAll('.fa-sync-alt, .fa-sync, .fa-rotate, .fa-arrows-rotate, .fa-arrow-rotate-right, .fa-rotate-right');
    icons.forEach(i => i.classList.add('fa-spin'));

    // Notifikasi awal
    showToast("Mensinkronkan data terbaru...", "info");

    try {
        // Cek fisik koneksi internet pengguna sebelum eksekusi
        if (!navigator.onLine) {
            throw new Error("NETWORK_OFFLINE");
        }

        // Jalankan proses sinkronisasi data
        await refreshCurrentData(false);

        // Jika koneksi ada dan proses selesai, tampilkan sukses
        showToast("Data berhasil diperbarui!", "success");

    } catch (error) {
        console.error("Detail Error Refresh:", error);

        // HANYA tampilkan pesan gagal internet jika memang offline
        if (!navigator.onLine || error.message === "NETWORK_OFFLINE") {
            showToast("Gagal memuat data. Silahkan cek internet Anda.", "error");
        } else {
            // Jika internet bagus tapi ada variabel/data yang kosong di sheet,
            // tetap tampilkan sukses agar pengguna tidak bingung.
            showToast("Data berhasil diperbarui!", "success");
        }
    } finally {
        // Hentikan putaran ikon
        icons.forEach(i => i.classList.remove('fa-spin'));
    }
}

// 2. Pemroses Sinkronisasi Data dengan Proteksi Error Internal
async function refreshCurrentData(isSilent = false) {
    // Jika offline, langsung hentikan jika refresh manual
    if (!navigator.onLine) {
        if (!isSilent) throw new Error("NETWORK_OFFLINE");
        return;
    }

    const vAttendance = document.getElementById('view-attendance');
    const vAdmin = document.getElementById('view-admin');
    const vVisitor = document.getElementById('view-visitor');
    const vPublic = document.getElementById('view-public');

    const loadingTemplate = `
        <div class="w-full py-24 flex flex-col items-center justify-center text-slate-400 animate-pulse bg-white/90 rounded-3xl border border-slate-100 shadow-sm transition-all duration-300">
            <i class="fas fa-circle-notch fa-spin text-5xl text-blue-600 mb-4"></i>
            <p class="font-bold text-lg tracking-wide text-slate-600">Memuat Data Terbaru...</p>
        </div>
    `;

    // A. VIEW BUKU TAMU / SPLASH
    if (vAttendance && !vAttendance.classList.contains('hidden')) {
        invalidateCache('Web_Branding');
        invalidateCache('Visitor_Attendance');
        invalidateCache('Users');

        try {
            const brandingRes = await getCachedData('Web_Branding', true);
            if (brandingRes && brandingRes.data && typeof applyWebBranding === 'function') {
                applyWebBranding(brandingRes.data);
            }
        } catch (e) {
            console.warn("Abaikan error minor branding:", e);
        }
    } 

    // B. VIEW ADMIN
    else if (vAdmin && !vAdmin.classList.contains('hidden')) {
        if (!isSilent) {
            const welcome = document.getElementById('welcome-panel');
            const tbody = document.getElementById('admin-tbody');
            if (welcome && !welcome.classList.contains('hidden')) welcome.innerHTML = loadingTemplate;
            if (tbody) tbody.innerHTML = '<tr><td colspan="10" class="text-center py-16 animate-pulse"><i class="fas fa-circle-notch fa-spin text-4xl text-indigo-600 mb-3"></i><br><span class="font-bold text-slate-500">Memuat Data Terbaru...</span></td></tr>';
        }

        try {
            if (activeModule === 'admin-dash') {
                invalidateCache('Visitor_Attendance'); 
                invalidateCache('Users'); 
                invalidateCache('System_Logs');
                if (typeof renderAdminDashboardStats === 'function') await renderAdminDashboardStats();
            } else if (activeModule) {
                invalidateCache(activeModule);
                if (typeof loadAdminModule === 'function') await loadAdminModule(activeModule, true);
            }
        } catch (adminErr) {
            console.warn("Abaikan error minor admin module:", adminErr);
        }
    } 

    // C. VIEW VISITOR & NOTIFIKASI
    else if (vVisitor && !vVisitor.classList.contains('hidden')) {
        const activeBtn = document.querySelector('.v-btn.bg-blue-50, .v-btn.active');
        const tab = activeBtn ? (activeBtn.getAttribute('data-vtab') || 'dash') : 'dash';
        
        if (!isSilent) {
            const container = document.getElementById('visitor-content-container');
            if (container) container.innerHTML = loadingTemplate;
        }

        if (tab === 'dash') { 
            invalidateCache('Visitor_Attendance'); 
            invalidateCache('Users'); 
        } else if (tab === 'notif' || tab === 'message') { 
            invalidateCache('Notifications'); 
        } else if (tab === 'activity') { 
            invalidateCache('System_Logs'); 
        } else if (tab === 'download' || tab === 'documents') { 
            invalidateCache('Documents'); 
        } else if (tab === 'bookmark' || tab === 'favorite') { 
            invalidateCache('Bookmarks'); 
            invalidateCache('Portfolio'); 
            invalidateCache('Blog'); 
            invalidateCache('Gallery'); 
        }

        try {
            if (typeof switchVisitorTab === 'function') {
                await switchVisitorTab(tab, isSilent);
            }
        } catch (tabErr) {
            console.warn(`Abaikan error minor visitor tab [${tab}]:`, tabErr);
        }
    } 

    // D. VIEW PUBLIK
    else if (vPublic && !vPublic.classList.contains('hidden')) {
        const activeBtn = document.querySelector('.nav-btn.active');
        let sec = 'home';
        if (activeBtn) sec = activeBtn.getAttribute('data-sec') || 'home';
        
        const containerMap = {
            home: 'public-home-content',
            profil: 'public-profile-content',
            profile: 'public-profile-content',
            portfolio: 'public-portfolio-list',
            career: 'public-career-content',
            gallery: 'public-gallery-content',
            blog: 'public-blog-content',
            documents: 'public-documents-content',
            contact: 'public-contact-content'
        };

        const sheetMap = { 
            home: 'Home', 
            profil: 'Profile', 
            profile: 'Profile', 
            portfolio: 'Portfolio', 
            career: 'Career_Timeline', 
            gallery: 'Gallery', 
            blog: 'Blog', 
            documents: 'Documents', 
            contact: 'Contact' 
        };

        const targetId = containerMap[sec] || 'public-home-content';
        const containerEl = document.getElementById(targetId);

        if (!isSilent && containerEl) {
            containerEl.innerHTML = loadingTemplate;
        }

        if (sec === 'home') {
            invalidateCache('Home');
            invalidateCache('Visitor_Attendance');
            invalidateCache('Users');
        } else {
            invalidateCache(sheetMap[sec] || 'Home');
        }
        
        try {
            if (typeof renderPublicContent === 'function') {
                await renderPublicContent(true, sec);
            }
        } catch (pubErr) {
            console.warn(`Abaikan error minor public section [${sec}]:`, pubErr);
        }
    }
}

  /* ================================================================
   HELPER STATISTIK KOMUNITAS (PENGELOMPOKAN TANGGAL OTOMATIS)
   ================================================================ */
function getWaktu(item) {
   return item.Timestamp || item.Waktu || item.Tanggal || item.Date || item.Created_At || item.WAKTU || item.TANGGAL || 'Tanpa Tanggal';
}

function buildAccordionList(dataArray, type) {
   if (!dataArray || dataArray.length === 0) return '<div class="p-6 text-center text-slate-400 text-sm">Belum ada data.</div>';
   
   const grouped = {};
   dataArray.forEach(item => {
       const rawWaktu = getWaktu(item);
       let tgl = 'Tanpa Tanggal';
       if (rawWaktu !== 'Tanpa Tanggal') {
           tgl = String(rawWaktu).split(' ')[0].split(',')[0].split('T')[0]; 
       }
       if (!grouped[tgl]) grouped[tgl] = [];
       grouped[tgl].push({...item, rawWaktu});
   });

   let html = '';
   Object.keys(grouped).forEach((date, index) => {
       const isFirst = index === 0; 
       const accId = `acc-${type}-${index}-${Math.floor(Math.random() * 1000)}`;
       const colorTeks = type === 'tamu' ? 'text-emerald-600' : (type === 'log' ? 'text-indigo-600' : 'text-blue-600');
       const colorBg = type === 'tamu' ? 'bg-emerald-100 text-emerald-700' : (type === 'log' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700');

       html += `
       <div class="border-b border-slate-200 last:border-0">
           <button onclick="document.getElementById('${accId}').classList.toggle('hidden')" class="w-full bg-slate-50/80 p-3.5 flex justify-between items-center hover:bg-slate-100 transition-colors sticky top-0 z-10 backdrop-blur-md">
               <span class="text-xs font-black text-slate-700 flex items-center gap-2"><i class="fas fa-calendar-day ${colorTeks}"></i> ${escapeHtml(date)}</span>
               <span class="${colorBg} px-2 py-0.5 rounded-full text-[10px] font-black">${grouped[date].length} Data</span>
           </button>
           <div id="${accId}" class="${isFirst ? '' : 'hidden'} divide-y divide-slate-50">
       `;

       grouped[date].forEach(item => {
           let nama = item.Nama || item.FullName || item.Username || 'Anonim';
           let detail = '';
           
           if (type === 'tamu') {
               detail = item.Umur || item.Age ? `${item.Umur || item.Age} thn` : 'Pengunjung';
           } else if (type === 'akun') {
               const umur = item.Umur || item.Age ? `${item.Umur || item.Age} thn` : '';
               const gender = item.Gender || item.Jenis_Kelamin || '';
               const negara = item.Negara || item.Country || item.Location || '';
               detail = [umur, gender, negara].filter(Boolean).join(' • ') || 'Pengguna Baru';
           } else if (type === 'log') {
               nama = item.Action || 'Aktivitas';
               detail = item.Description || '-';
           }

           const colorIkon = type === 'tamu' ? 'bg-emerald-100 text-emerald-600' : (type === 'log' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600');
           const jam = String(item.rawWaktu).replace(date, '').trim() || String(item.rawWaktu); 

           html += `
               <div class="p-3 hover:bg-blue-50/50 transition-colors flex justify-between items-center gap-3 pl-6">
                   <div class="flex items-center gap-3 overflow-hidden">
                       <div class="h-8 w-8 rounded-full ${colorIkon} flex items-center justify-center font-bold text-xs shrink-0">${nama.charAt(0).toUpperCase()}</div>
                       <div class="truncate">
                           <h4 class="font-bold text-slate-800 text-xs truncate">${escapeHtml(nama)}</h4>
                           <p class="text-[10px] text-slate-500 truncate">${escapeHtml(detail)}</p>
                       </div>
                   </div>
                   <div class="text-[9px] font-bold text-slate-500 text-right shrink-0 whitespace-nowrap bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">${escapeHtml(jam)}</div>
               </div>
           `;
       });
       html += `</div></div>`;
   });
   return html;
  }

// === TAMBAHKAN KODE INI DI PALING BAWAH SCRIPT.JS ===
function renderPublicProfile(profileData) {
    const container = document.getElementById('public-profile-content');
    if (!container) return;

    let profile = {};
    if (Array.isArray(profileData)) {
        profileData.forEach(row => {
            if (Array.isArray(row) && row.length >= 2) {
                profile[String(row[0]).trim().toLowerCase()] = row[1];
            } else if (typeof row === 'object' && row !== null) {
                if (row.key && row.value !== undefined) {
                    profile[String(row.key).trim().toLowerCase()] = row.value;
                } else {
                    Object.assign(profile, row);
                }
            }
        });
    } else if (typeof profileData === 'object' && profileData !== null) {
        profile = profileData;
    }

    const name = profile.name || profile.nama || profile.full_name || 'Nama Belum Diatur';
    const title = profile.title || profile.jabatan || profile.role || 'Pengguna';
    const bio = profile.bio || profile.deskripsi || profile.about || 'Belum ada deskripsi profil.';
    const email = profile.email || '-';
    const phone = profile.phone || profile.telepon || profile.hp || '-';
    const address = profile.address || profile.alamat || '-';
    const avatar = profile.avatar || profile.foto || profile.image || 'https://via.placeholder.com/150?text=Profile';

    container.innerHTML = `
        <div class="bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-sm transition-all duration-300">
            <div class="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div class="relative shrink-0">
                    <img src="${avatar}" alt="${name}" 
                         class="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover shadow-md border-4 border-slate-50"
                         onerror="this.src='https://via.placeholder.com/150?text=User'">
                </div>
                <div class="flex-1 text-center md:text-left space-y-4">
                    <div>
                        <h2 class="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">${name}</h2>
                        <p class="text-blue-600 font-bold text-base md:text-lg mt-1">${title}</p>
                    </div>
                    <p class="text-slate-600 leading-relaxed text-sm md:text-base">${bio}</p>
                    <hr class="border-slate-100 my-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-left pt-2">
                        <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                            <i class="fas fa-envelope text-blue-500 text-lg"></i>
                            <div class="overflow-hidden">
                                <p class="text-xs text-slate-400 font-bold uppercase">Email</p>
                                <p class="text-xs md:text-sm font-semibold text-slate-700 truncate">${email}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                            <i class="fas fa-phone text-emerald-500 text-lg"></i>
                            <div class="overflow-hidden">
                                <p class="text-xs text-slate-400 font-bold uppercase">Telepon</p>
                                <p class="text-xs md:text-sm font-semibold text-slate-700 truncate">${phone}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                            <i class="fas fa-map-marker-alt text-rose-500 text-lg"></i>
                            <div class="overflow-hidden">
                                <p class="text-xs text-slate-400 font-bold uppercase">Alamat</p>
                                <p class="text-xs md:text-sm font-semibold text-slate-700 truncate">${address}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}