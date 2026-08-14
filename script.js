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
    {sheet:'Web_Branding',label:'Web Branding'}, {sheet:'Dynamic_Menu',label:'Dynamic Menu'}, {sheet:'Banners',label:'Banners'}, {sheet:'Popups',label:'Popups'}
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
    API CONNECTOR
    Menggunakan text/plain agar request POST Apps Script tidak
    memicu preflight CORS yang menyebabkan "Koneksi bermasalah".
    ================================================================ */
async function apiCall(method = 'GET', payload = {}) {
  const url = API_URL;

  const options = {
    method: method.toUpperCase(),
    redirect: 'follow',
    cache: 'no-store'
  };

  if (method.toUpperCase() === 'POST') {
    options.headers = {
      'Content-Type': 'text/plain;charset=utf-8'
    };

    options.body = JSON.stringify(payload);
  } else {
    const params = new URLSearchParams();

    Object.entries(payload || {}).forEach(([k, v]) => {
      params.set(
        k,
        typeof v === 'object'
          ? JSON.stringify(v)
          : String(v)
      );
    });

    const target =
      params.toString()
        ? `${url}?${params.toString()}`
        : url;

    const response =
      await fetch(target, options);

    const text =
      await response.text();

    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(
        'Respons Apps Script bukan JSON.'
      );
    }
  }

  const response =
    await fetch(url, options);

  const text =
    await response.text();

  let result;

  try {
    result = JSON.parse(text);
  } catch (e) {
    throw new Error(
      'Respons Apps Script bukan JSON.'
    );
  }

  return result;
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

    await faceapi.nets.tinyFaceDetector
      .loadFromUri(FACE_MODEL_URL);

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
function captureFace() {

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
     MODE REGISTER
     3 FOTO:
     DEPAN -> KANAN -> KIRI
     ============================================================== */
  if (currentFaceMode === 'register') {

    /* ------------------------------------------------------------
       FOTO DEPAN
       ------------------------------------------------------------ */
    if (faceCaptureStep === 1) {

      tempFaceData.front =
        base64Data;

      faceCaptureStep = 2;

      faceStableCount = 0;
      faceAutoCaptureRunning = false;

      if (instr) {
        instr.innerText =
          'Foto depan berhasil. Tengok sedikit ke KANAN.';
      }

      if (counter) {
        counter.innerText =
          '2/3';
      }

      setTimeout(() => {

        if (
          currentFaceMode === 'register' &&
          faceCaptureStep === 2 &&
          videoStream
        ) {
          startAutomaticFaceDetection();
        }

      }, 800);

      return true;
    }

    /* ------------------------------------------------------------
       FOTO KANAN
       ------------------------------------------------------------ */
    if (faceCaptureStep === 2) {

      tempFaceData.right =
        base64Data;

      faceCaptureStep = 3;

      faceStableCount = 0;
      faceAutoCaptureRunning = false;

      if (instr) {
        instr.innerText =
          'Foto kanan berhasil. Sekarang tengok sedikit ke KIRI.';
      }

      if (counter) {
        counter.innerText =
          '3/3';
      }

      setTimeout(() => {

        if (
          currentFaceMode === 'register' &&
          faceCaptureStep === 3 &&
          videoStream
        ) {
          startAutomaticFaceDetection();
        }

      }, 800);

      return true;
    }

    /* ------------------------------------------------------------
       FOTO KIRI
       ------------------------------------------------------------ */
    if (faceCaptureStep === 3) {

      tempFaceData.left =
        base64Data;

      isFaceVerified = true;

      faceStableCount = 0;
      faceAutoCaptureRunning = false;

      if (faceDetectionTimer) {
        clearInterval(faceDetectionTimer);
        faceDetectionTimer = null;
      }

      const regStatus =
        document.getElementById(
          'reg-face-status'
        );

      if (regStatus) {
        regStatus.classList.remove(
          'hidden'
        );
      }

      const regButton =
        document.getElementById(
          'btn-reg-face'
        );

      if (regButton) {
        regButton.classList.add(
          'hidden'
        );
      }

      if (instr) {
        instr.innerText =
          '3 foto wajah berhasil diambil.';
      }

      if (counter) {
        counter.innerText =
          '3/3 ✓';
      }

      closeFaceVerification();

      checkPasswordMatch();

      showToast(
        '3 foto wajah DEPAN, KANAN, dan KIRI berhasil disimpan.',
        'success'
      );

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

            setTimeout(() => {

              if (
                typeof captureFace ===
                'function'
              ) {

                const success =
                  captureFace();

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
async function switchVisitorTab(tab) {

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

  container.innerHTML =
    '<div class="bg-white p-8 rounded-3xl border shadow-sm text-sm text-slate-500 animate-fade-in"><i class="fas fa-spinner fa-spin mr-2"></i> Memuat data...</div>';

  try {

    if (tab === 'dash') {

      const [
        book,
        notif,
        att,
        docs
      ] = await Promise.all([
        getCachedData('Bookmarks'),
        getCachedData('Notifications'),
        getCachedData('Visitor_Attendance'),
        getCachedData('Documents')
      ]);

      const bc =
        (book.data || [])
        .filter(x =>
          !uid ||
          String(
            x.UserID || ''
          ) === String(uid)
        )
        .length;

      const nc =
        (notif.data || [])
        .filter(
          x =>
            !x.Status ||
            x.Status === 'active' ||
            x.Status === 'publish'
        )
        .length;

      const ac =
        (att.data || [])
        .filter(
          x =>
            String(
              x.Email || ''
            ).toLowerCase() ===
            String(
              email
            ).toLowerCase()
        )
        .length;

      const dc =
        (docs.data || [])
        .filter(
          x =>
            !x.Status ||
            x.Status === 'publish' ||
            x.Status === 'active'
        )
        .length;

      container.innerHTML =
        `<div class="space-y-6 animate-fade-in">
          <div class="bg-white p-8 rounded-3xl border shadow-sm">
            <h2 class="font-extrabold text-xl text-slate-900">
              Dashboard Utama Visitor
            </h2>

            <p class="text-sm text-slate-500 mt-1">
              Selamat datang, ${escapeHtml(name)}.
            </p>

            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">

              <div class="bg-blue-50 p-5 rounded-2xl border border-blue-100">
                <div class="text-2xl font-black text-blue-600">
                  ${bc}
                </div>
                <div class="text-xs text-slate-500 font-bold mt-1">
                  Bookmark
                </div>
              </div>

              <div class="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                <div class="text-2xl font-black text-emerald-600">
                  ${ac}
                </div>
                <div class="text-xs text-slate-500 font-bold mt-1">
                  Kunjungan
                </div>
              </div>

              <div class="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                <div class="text-2xl font-black text-indigo-600">
                  ${dc}
                </div>
                <div class="text-xs text-slate-500 font-bold mt-1">
                  Dokumen Tersedia
                </div>
              </div>

              <div class="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                <div class="text-2xl font-black text-amber-600">
                  ${nc}
                </div>
                <div class="text-xs text-slate-500 font-bold mt-1">
                  Notifikasi
                </div>
              </div>

            </div>
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
}

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

window.addEventListener(
  'popstate',
  e => {

    isNavigatingHistory = true;

    if (
      e.state &&
      e.state.view
    ) {

      renderView(
        e.state.view,
        e.state.section
      );

    } else {

      renderView(
        'attendance',
        null
      );
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
   PUBLIC DATA LOADER
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

  try {

    const first =
      await getCachedData(
        priority,
        force
      );

    const data =
      first.data ||
      [];

    if (
      priority === 'Home'
    ) {
      renderPublicHome(data);

    } else if (
      priority === 'Profile'
    ) {
      renderPublicProfile(data);

    } else if (
      priority === 'Portfolio'
    ) {
      renderPublicPortfolio(data);

    } else if (
      priority === 'Career_Timeline'
    ) {
      renderPublicCareer(data);

    } else if (
      priority === 'Gallery'
    ) {
      renderPublicGallery(data);

    } else if (
      priority === 'Blog'
    ) {
      renderPublicBlog(data);

    } else if (
      priority === 'Documents'
    ) {
      renderPublicDocuments(data);

    } else if (
      priority === 'Contact'
    ) {
      renderPublicContact(data);
    }

  } catch(error) {

    console.warn(
      'Gagal memuat section prioritas:',
      error
    );
  }

  const backgroundNames =
    names.filter(
      name =>
        name !== priority
    );

  await Promise.allSettled(
    backgroundNames.map(
      name =>
        getCachedData(
          name,
          force
        )
    )
  );

  names.forEach(
    name => {

      const data =
        memoryCache[name]?.data ||
        [];

      if (
        name === 'Home'
      ) {
        renderPublicHome(data);

      } else if (
        name === 'Profile'
      ) {
        renderPublicProfile(data);

      } else if (
        name === 'Portfolio'
      ) {
        renderPublicPortfolio(data);

      } else if (
        name === 'Career_Timeline'
      ) {
        renderPublicCareer(data);

      } else if (
        name === 'Gallery'
      ) {
        renderPublicGallery(data);

      } else if (
        name === 'Blog'
      ) {
        renderPublicBlog(data);

      } else if (
        name === 'Documents'
      ) {
        renderPublicDocuments(data);

      } else if (
        name === 'Contact'
      ) {
        renderPublicContact(data);
      }
    }
  );
}

function prefetchEssentialSheets() {

  const sheets = [
    'Home',
    'Profile',
    'Dynamic_Menu',
    'Banners',
    'Popups',
    'Web_Branding'
  ];

  const run = () =>
    Promise.allSettled(
      sheets.map(
        sheet =>
          getCachedData(
            sheet,
            false
          )
      )
    );

  if (
    'requestIdleCallback' in window
  ) {

    requestIdleCallback(
      run,
      {
        timeout: 2500
      }
    );

  } else {

    setTimeout(
      run,
      1200
    );
  }
}

/* ================================================================
   PUBLIC HOME
   ================================================================ */
function renderPublicHome(r) {

  const e =
    document.getElementById(
      'public-home-content'
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
      'Belum ada konten Home. Tambahkan melalui Dashboard Admin.'
    );

    return;
  }

  const img =
    safeUrl(
      x.HeroImage_URL
    );

  e.className =
    'bg-white rounded-3xl p-8 md:p-14 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-10 animate-fade-in';

  e.innerHTML =
    `${img
      ? `<img
          src="${img}"
          class="w-36 h-36 md:w-52 md:h-52 rounded-full object-cover shadow-xl border-4 border-white"
          alt=""
        >`
      : ''
    }

    <div class="text-center md:text-left flex-1">

      <h1 class="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
        ${escapeHtml(
          safeText(
            x.Title
          )
        )}
      </h1>

      <p class="text-blue-600 font-bold mt-3">
        ${escapeHtml(
          safeText(
            x.Subtitle
          )
        )}
      </p>

      <p class="text-slate-500 mt-4 max-w-2xl text-sm md:text-base leading-relaxed whitespace-pre-line">
        ${escapeHtml(
          safeText(
            x.Description
          )
        )}
      </p>

      ${
        x.Action_Button
          ? `<button
              onclick="switchPublicSection('portfolio')"
              class="mt-7 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg"
            >
              ${escapeHtml(
                x.Action_Button
              )}
            </button>`
          : ''
      }

    </div>`;
}

/* ================================================================
   PUBLIC PROFILE
   ================================================================ */
function renderPublicProfile(r) {

  const e =
    document.getElementById(
      'public-profile-content'
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
      'Belum ada data Profil. Tambahkan melalui Dashboard Admin.'
    );

    return;
  }

  e.className =
    'bg-white p-8 md:p-10 rounded-3xl shadow-sm border animate-fade-in';

  e.innerHTML =
    `<h2 class="text-2xl md:text-3xl font-black">
      ${escapeHtml(
        safeText(
          x.FullName,
          'Profil'
        )
      )}
    </h2>

    <p class="text-blue-600 font-bold mt-2">
      ${escapeHtml(
        safeText(
          x.Profession
        )
      )}
    </p>

    <p class="text-slate-600 leading-8 mt-6 whitespace-pre-line">
      ${escapeHtml(
        safeText(
          x.About,
          'Belum ada deskripsi profil.'
        )
      )}
    </p>

    <div class="grid sm:grid-cols-2 gap-4 mt-8">

      ${
        [
          ['Email', x.Email],
          ['Phone', x.Phone],
          ['Address', x.Address],
          ['Profile URL', x.Profile_URL]
        ]
        .filter(
          a => a[1]
        )
        .map(
          a =>
            `<div class="p-4 bg-slate-50 rounded-2xl">

              <span class="text-xs text-slate-400 font-bold uppercase">
                ${a[0]}
              </span>

              <div class="font-semibold mt-1 break-all">
                ${escapeHtml(
                  a[1]
                )}
              </div>

            </div>`
        )
        .join('')
      }

    </div>`;
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
   AUTH PANEL
   ================================================================ */
function showAuthPanel(
  panel
) {

  const lp =
    document.getElementById(
      'auth-login-panel'
    );

  const rp =
    document.getElementById(
      'auth-register-panel'
    );

  const lt =
    document.getElementById(
      'auth-login-tab'
    );

  const rt =
    document.getElementById(
      'auth-register-tab'
    );

  if (
    !lp ||
    !rp
  ) {
    return;
  }

  const isLogin =
    panel === 'login';

  lp.classList.toggle(
    'hidden',
    !isLogin
  );

  rp.classList.toggle(
    'hidden',
    isLogin
  );

  if (lt) {
    lt.classList.toggle(
      'active',
      isLogin
    );
  }

  if (rt) {
    rt.classList.toggle(
      'active',
      !isLogin
    );
  }
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

  const sbHTML =
    document.getElementById(
      'sidebar-menus'
    );

  if (!sbHTML) return;

  sbHTML.innerHTML = '';

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
  left: ''
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
   DEVICE INFO & GEOLOCATION
   ================================================================ */
async function getDeviceAndLocation() {

  let deviceInfo =
    navigator.userAgent;

  let ip =
    "Tidak terdeteksi";

  let geo =
    "Tidak diizinkan GPS";

  try {

    const res =
      await fetch(
        'https://api.ipify.org?format=json'
      );

    const data =
      await res.json();

    ip =
      data.ip;

  } catch(e) {}

  return new Promise(
    resolve => {

      if (
        navigator.geolocation
      ) {

        navigator.geolocation
          .getCurrentPosition(
            pos => {

              geo =
                `${pos.coords.latitude}, ${pos.coords.longitude}`;

              resolve({
                deviceInfo,
                ip,
                geo
              });
            },

            err => {

              resolve({
                deviceInfo,
                ip,
                geo
              });
            },

            {
              timeout: 5000
            }
          );

      } else {

        resolve({
          deviceInfo,
          ip,
          geo
        });
      }
    }
  );
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
      action:
        'register',

      data: {

        fullName:
          document.getElementById(
            'reg-name'
          ).value,

        username:
          document.getElementById(
            'reg-username'
          ).value,

        birthInfo:
          document.getElementById(
            'reg-birth'
          ).value,

        company:
          document.getElementById(
            'reg-company'
          ).value,

        companyAddress:
          document.getElementById(
            'reg-company-address'
          ).value,

        position:
          document.getElementById(
            'reg-position'
          ).value,

        email:
          email,

        whatsapp:
          document.getElementById(
            'reg-wa'
          ).value,

        password:
          document.getElementById(
            'reg-password'
          ).value,

        /*
         * 3 foto wajah:
         * front
         * right
         * left
         */
        faceData:
          JSON.stringify(
            tempFaceData
          ),

        deviceInfo:
          meta.deviceInfo,

        locationIP:
          meta.ip,

        geoLocation:
          meta.geo,

        role:
          'Visitor'
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
   LOGIN
   ================================================================ */
async function handleLogin() {

  const identifier =
    document.getElementById(
      'login-identifier'
    )?.value ||
    document.getElementById(
      'login-email'
    )?.value;

  const password =
    document.getElementById(
      'login-password'
    )?.value;

  if (
    !identifier ||
    !password
  ) {

    return showToast(
      "Isi semua data login!",
      "warning"
    );
  }

  toggleLoader(true);

  const meta =
    await getDeviceAndLocation();

  const payload = {
    action:
      'login',

    data: {
      email:
        identifier,

      password:
        password,

      faceVerified:
        isFaceVerified,

      deviceInfo:
        meta.deviceInfo
    }
  };

  try {

    const json =
      await apiCall(
        'POST',
        payload
      );

    if (
      json.status ===
      'success'
    ) {

      currentUser =
        json.user;

      showToast(
        "Login Berhasil! Selamat datang.",
        "success"
      );

      if (
        currentUser.Role ===
        'SuperAdmin'
      ) {

        initAdminSidebar();

        switchView(
          'admin'
        );

      } else {

        switchView(
          'visitor'
        );
      }

    } else {

      showToast(
        json.message,
        "error"
      );
    }

  } catch(e) {

    showToast(
      "Gagal Terhubung",
      "error"
    );

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