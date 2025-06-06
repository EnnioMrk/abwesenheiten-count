// Built with Bun at 2025-06-05T10:39:13.543Z
// public/untis-login/js/index.js
var tabBtns = document.querySelectorAll(".tab-btn");
var tabContents = document.querySelectorAll(".tab-content");
var fileInput = document.getElementById("qr-input");
var resultText = document.getElementById("result-text");
var startScanBtn = document.getElementById("start-scan");
var stopScanBtn = document.getElementById("stop-scan");
var flipCameraBtn = document.getElementById("flip-camera");
var html5QrCode;
var currentCameraId;
var cameras = [];
var currentCameraIndex = 0;
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabId = btn.getAttribute("data-tab");
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    tabContents.forEach((content) => {
      content.classList.remove("active");
      if (content.id === tabId) {
        content.classList.add("active");
      }
    });
  });
});
fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file)
    return;
  const reader = new FileReader;
  reader.onload = (e) => {
    const img = new Image;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0, img.width, img.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const qrCodeReader = new Html5Qrcode("qr-reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
      });
      qrCodeReader.scanFile(file, true).then((decodedText) => {
        handleQrResult(decodedText);
      }).catch((err) => {
        console.error("Error scanning file:", err);
        resultText.textContent = "Could not decode QR code from image";
      });
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});
var buttonNormal = "bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50";
var buttonDisabled = "bg-gray-300 text-gray-500 font-medium py-2 px-4 rounded-lg cursor-not-allowed";
function switchScanMode() {
  if (startScanBtn.classList.contains("cursor-not-allowed")) {
    startScanBtn.classList = buttonNormal;
    stopScanBtn.classList = buttonDisabled;
    stopScanBtn.disabled = true;
    startScanBtn.disabled = false;
  } else {
    startScanBtn.classList = buttonDisabled;
    stopScanBtn.classList = buttonNormal;
    stopScanBtn.disabled = false;
    startScanBtn.disabled = true;
  }
}
document.querySelector('[data-tab="scan"]').addEventListener("click", () => {
  Html5Qrcode.getCameras().then((devices) => {
    cameras = devices;
    if (devices.length > 1) {
      flipCameraBtn.classList.remove("hidden");
      flipCameraBtn.disabled = true;
    } else {
      flipCameraBtn.classList.add("hidden");
    }
    console.log("Available cameras:", devices);
  }).catch((err) => {
    console.error("Error getting cameras", err);
    alert(err);
  });
});
startScanBtn.addEventListener("click", () => {
  html5QrCode = new Html5Qrcode("qr-reader");
  const cameraId = cameras.length > 0 ? cameras[currentCameraIndex].id : { facingMode: "environment" };
  currentCameraId = cameraId;
  html5QrCode.start(cameraId, { fps: 10, qrbox: 250 }, handleQrResult, handleQrError).then(() => {
    switchScanMode();
    if (cameras.length > 1) {
      flipCameraBtn.classList = buttonNormal;
      flipCameraBtn.disabled = false;
    }
  });
});
stopScanBtn.addEventListener("click", () => {
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      switchScanMode();
      flipCameraBtn.classList = buttonDisabled;
      flipCameraBtn.disabled = true;
    }).catch((err) => console.error("Error stopping scanner:", err));
  }
});
flipCameraBtn.addEventListener("click", () => {
  if (html5QrCode && cameras.length > 1) {
    html5QrCode.stop().then(() => {
      currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
      const newCameraId = cameras[currentCameraIndex].id;
      html5QrCode.start(newCameraId, { fps: 10, qrbox: 250 }, handleQrResult, handleQrError).then(() => {
        currentCameraId = newCameraId;
        console.log("Switched to camera:", newCameraId);
      }).catch((err) => {
        console.error("Error starting camera:", err);
        html5QrCode.start(currentCameraId, { fps: 10, qrbox: 250 }, handleQrResult, handleQrError);
      });
    });
  }
});
function handleQrResult(decodedText) {
  console.log("QR Code detected, URL:", decodedText);
  resultText.textContent = decodedText;
  if (html5QrCode && !stopScanBtn.disabled) {
    html5QrCode.stop().then(() => {
      switchScanMode();
      flipCameraBtn.classList = buttonDisabled;
      flipCameraBtn.disabled = true;
    });
  }
  logQrUrl(decodedText);
  decodedText = decodedText.replace("untis://setschool?", "");
  const options = {};
  new URLSearchParams(decodedText).forEach((value, key) => {
    options[key] = value;
  });
  console.log(options);
}
function handleQrError(err) {
  console.warn(err);
}
function logQrUrl(url) {
  console.log("QR URL logged:", url);
  fetch("/api/user/save-qr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url })
  }).then((res) => res.json()).then((result) => {
    if (result) {
      console.log(result);
      window.location.href = "/dashboard";
    }
  });
}
var ismobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
var cls = ismobile ? "" : "flip";
document.getElementById("qr-reader").classList.add(cls);
