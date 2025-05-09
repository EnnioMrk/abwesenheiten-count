// Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const fileInput = document.getElementById('qr-input');
const resultText = document.getElementById('result-text');
const startScanBtn = document.getElementById('start-scan');
const stopScanBtn = document.getElementById('stop-scan');
const flipCameraBtn = document.getElementById('flip-camera');

let html5QrCode;
let currentCameraId;
let cameras = [];
let currentCameraIndex = 0;

// Tab switching
tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');

        // Update active tab button
        tabBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        // Show selected tab content
        tabContents.forEach((content) => {
            content.classList.remove('active');
            if (content.id === tabId) {
                content.classList.add('active');
            }
        });
    });
});

// Handle file upload
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0, img.width, img.height);
            const imageData = context.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
            );

            // Use html5-qrcode to scan the image data
            const qrCodeReader = new Html5Qrcode('qr-reader', {
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            });
            qrCodeReader
                .scanFile(file, true)
                .then((decodedText) => {
                    handleQrResult(decodedText);
                })
                .catch((err) => {
                    console.error('Error scanning file:', err);
                    resultText.textContent =
                        'Could not decode QR code from image';
                });
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

const buttonNormal =
    'bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50';
const buttonDisabled =
    'bg-gray-300 text-gray-500 font-medium py-2 px-4 rounded-lg cursor-not-allowed';

function switchScanMode() {
    if (startScanBtn.classList.contains('cursor-not-allowed')) {
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

// Check for available cameras when the scan tab is selected
document.querySelector('[data-tab="scan"]').addEventListener('click', () => {
    // Check if there are multiple cameras
    Html5Qrcode.getCameras()
        .then((devices) => {
            cameras = devices;

            // Show or hide flip button based on camera count
            if (devices.length > 1) {
                flipCameraBtn.classList.remove('hidden');
                flipCameraBtn.disabled = true; // Still disabled until scanning starts
            } else {
                flipCameraBtn.classList.add('hidden');
            }
            console.log('Available cameras:', devices);
        })
        .catch((err) => {
            console.error('Error getting cameras', err);
            alert(err);
        });
});

// Initialize QR code scanner
startScanBtn.addEventListener('click', () => {
    html5QrCode = new Html5Qrcode('qr-reader');

    // Determine which camera to use
    const cameraId =
        cameras.length > 0
            ? cameras[currentCameraIndex].id
            : { facingMode: 'environment' };
    currentCameraId = cameraId;

    html5QrCode
        .start(cameraId, { fps: 10, qrbox: 250 }, handleQrResult, handleQrError)
        .then(() => {
            switchScanMode();

            // Enable flip button if we have multiple cameras
            if (cameras.length > 1) {
                flipCameraBtn.classList = buttonNormal;
                flipCameraBtn.disabled = false;
            }
        });
});

stopScanBtn.addEventListener('click', () => {
    if (html5QrCode) {
        html5QrCode
            .stop()
            .then(() => {
                switchScanMode();
                // Disable flip button when stopping
                flipCameraBtn.classList = buttonDisabled;
                flipCameraBtn.disabled = true;
            })
            .catch((err) => console.error('Error stopping scanner:', err));
    }
});

// Add camera flip functionality
flipCameraBtn.addEventListener('click', () => {
    if (html5QrCode && cameras.length > 1) {
        // Stop current camera
        html5QrCode.stop().then(() => {
            // Switch to next camera
            currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
            const newCameraId = cameras[currentCameraIndex].id;

            // Start with new camera
            html5QrCode
                .start(
                    newCameraId,
                    { fps: 10, qrbox: 250 },
                    handleQrResult,
                    handleQrError
                )
                .then(() => {
                    currentCameraId = newCameraId;
                    console.log('Switched to camera:', newCameraId);
                })
                .catch((err) => {
                    console.error('Error starting camera:', err);
                    // Try to restart previous camera if switch fails
                    html5QrCode.start(
                        currentCameraId,
                        { fps: 10, qrbox: 250 },
                        handleQrResult,
                        handleQrError
                    );
                });
        });
    }
});

// Handle QR code results
function handleQrResult(decodedText) {
    console.log('QR Code detected, URL:', decodedText);
    resultText.textContent = decodedText;

    // If running in scan mode, stop the scanner
    if (html5QrCode && !stopScanBtn.disabled) {
        html5QrCode.stop().then(() => {
            switchScanMode();
            flipCameraBtn.classList = buttonDisabled;
            flipCameraBtn.disabled = true;
        });
    }

    // Log the URL (you could extend this to send to a server)
    logQrUrl(decodedText);
    decodedText = decodedText.replace('untis://setschool?', '');
    const options = {};
    new URLSearchParams(decodedText).forEach((value, key) => {
        options[key] = value;
    });
    console.log(options);
}

function handleQrError(err) {
    // This is just for transient errors during scanning
    console.warn(err);
}

function logQrUrl(url) {
    // Log to console
    console.log('QR URL logged:', url);

    // You could extend this to send to your backend:

    fetch('/api/user/save-qr', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
    })
        .then((res) => res.json())
        .then((result) => {
            if (result) {
                console.log(result);
                window.location.href = '/dashboard';
            }
        });
}

const ismobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const cls = ismobile ? '' : 'flip';
document.getElementById('qr-reader').classList.add(cls);
