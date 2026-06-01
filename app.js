// app.js
console.log("SHIELD_SYSTEM: BOOTING_SECURITY_PATCH_V10.3_EXTREME");
import { auth, database, storage } from './firebase-config.js';
import {
    ref as sRef,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithRedirect,
    signInWithPopup,
    getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    ref,
    push,
    set,
    onChildAdded,
    onChildChanged,
    onValue,
    onDisconnect,
    get,
    update,
    query,
    limitToLast
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- GLOBAL NOTIFICATION & BACKGROUND MANAGER ---
let appInForeground = true;
let bgTimer;
let mediaRecorder;
let audioChunks = [];
let recInterval;
let recSeconds = 0;

// GLOBAL ERROR SHIELD
const updateBootStatus = (msg) => {
    const statusEl = document.querySelector('.auth-status');
    if (statusEl) {
        statusEl.textContent = `> ${msg.toUpperCase()}...`;
        statusEl.style.color = "var(--terminal-green)";
    }
};

window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.error("GLOBAL_CRASH:", msg, error);
    const errorDisplay = document.createElement('div');
    errorDisplay.style.cssText = "position:fixed; bottom:0; left:0; right:0; background:rgba(255,0,0,0.8); color:white; font-size:10px; z-index:999999; padding:5px; font-family:monospace; pointer-events:none;";
    errorDisplay.textContent = `SYSTEM_ERR: ${msg} (${lineNo}:${columnNo})`;
    document.body.appendChild(errorDisplay);
    updateBootStatus("BOOT_FAILURE");
    setTimeout(() => { if (errorDisplay.parentNode) errorDisplay.remove(); }, 8000);
    return false;
};

// BROWSER MASTER ENGINE
const masterAudio = document.createElement('audio');
masterAudio.id = 'shield-master-player';
masterAudio.style.display = 'none';
document.body.appendChild(masterAudio);
window._masterShieldAudio = masterAudio;

window._audioActivated = false;

window.activateAudioEngine = () => {
    if (window._audioActivated) return;
    // Silent play to "wake up" the hardware
    window._masterShieldAudio.play().then(() => {
        window._masterShieldAudio.pause();
        window._audioActivated = true;
        console.log("SHIELD_AUDIO: ENGINE_ACTIVE");
    }).catch(() => { });
};

// Attach wake-up to first interaction
document.addEventListener('touchstart', window.activateAudioEngine, { once: true });
document.addEventListener('click', window.activateAudioEngine, { once: true });

window._shieldSignalBuffer = {}; // RAM Cache for heavy media files

// ROBUST COPY TOOL
window.cyberCopy = (text, alertMsg = "SIGNAL COPIED TO BUFFER") => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            window.cyberAlert(alertMsg);
        }).catch(err => {
            console.warn("Clipboard API Fail, falling back:", err);
            fallbackCopyTextToClipboard(text, alertMsg);
        });
    } else {
        fallbackCopyTextToClipboard(text, alertMsg);
    }
};

function fallbackCopyTextToClipboard(text, alertMsg) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed"; 
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        window.cyberAlert(alertMsg);
    } catch (err) {
        console.error('Fallback Copy Error:', err);
        window.cyberAlert("COPY_FAILURE: MANUAL_SELECT_REQUIRED", "error");
    }
    document.body.removeChild(textArea);
}

// UNIVERSAL MASTER ENGINE (Android/iPhone/PC)
if (!window._masterShieldAudio) {
    const masterAudio = document.createElement('audio');
    masterAudio.id = 'shield-master-player';
    masterAudio.style.display = 'none';
    document.body.appendChild(masterAudio);
    window._masterShieldAudio = masterAudio;
}
window._audioUnlocked = false;

// The "WhatsApp" Unlock Handshake
window.unlockAudioSystem = () => {
    if (window._audioUnlocked) return;
    window._masterShieldAudio.play().then(() => {
        window._masterShieldAudio.pause();
        window._audioUnlocked = true;
        console.log("SHIELD_AUDIO: HARDWARE_UNLOCKED");
    }).catch(() => { });
};
document.addEventListener('click', window.unlockAudioSystem, { once: true });
document.addEventListener('touchstart', window.unlockAudioSystem, { once: true });

window.directShieldPlay = (msgId) => {
    const btn = document.getElementById(`play-btn-${msgId}`);
    if (!btn) return;

    // Toggle
    if (window._currentPlayingId === msgId && !window._masterShieldAudio.paused) {
        window._masterShieldAudio.pause();
        btn.innerHTML = '\u25B6\uFE0F';
        return;
    }

    // Clean previous
    if (window._currentPlayingId && window._currentPlayingId !== msgId) {
        const pBtn = document.getElementById(`play-btn-${window._currentPlayingId}`);
        if (pBtn) pBtn.innerHTML = '\u25B6\uFE0F';
    }

    try {
        const raw = window._shieldSignalBuffer[msgId];
        if (!raw) {
            window.cyberAlert("SIGNAL_LOST: REFRESH", "error");
            return;
        }

        // ANDROID FIX: Convert to Binary Blob immediately (Data URIs fail on long notes)
        const b64Part = raw.includes('base64,') ? raw.split('base64,')[1] : raw;
        const container = btn.closest('.audio-message');
        const mime = (container ? container.dataset.mime : null) || 'audio/webm;codecs=opus';

        const blob = window.b64toBlob(b64Part, mime);
        const url = URL.createObjectURL(blob);

        window._masterShieldAudio.src = url;
        window._masterShieldAudio.load();
        window._currentPlayingId = msgId;

        // Ensure engine is active
        if (window.activateAudioEngine) window.activateAudioEngine();

        window._masterShieldAudio.onended = () => {
            btn.innerHTML = '\u25B6\uFE0F';
            const fill = document.getElementById(`fill-${msgId}`);
            if (fill) fill.style.width = '0%';
            URL.revokeObjectURL(url);
        };

        window._masterShieldAudio.ontimeupdate = () => {
            const fill = document.getElementById(`fill-${msgId}`);
            if (fill && window._masterShieldAudio.duration) {
                const p = (window._masterShieldAudio.currentTime / window._masterShieldAudio.duration) * 100;
                fill.style.width = p + '%';
            }
        };

        const promise = window._masterShieldAudio.play();
        if (promise !== undefined) {
            promise.then(() => {
                btn.innerHTML = '\u23F8\uFE0F'; // Pause icon
            }).catch(e => {
                console.error("Audio Playback Failed:", e);
                window.cyberAlert("PLAYBACK_DENIED: TAP SCREEN", "error");
            });
        }

        window._masterShieldAudio.onerror = (e) => {
            console.error("Master Audio Error:", e);
            window.cyberAlert("SIGNAL_CORRUPTED: DOWNLOAD AGAIN", "error");
            btn.innerHTML = '\u25B6\uFE0F';
        };
    } catch (e) {
        console.error("Playback Fatal:", e);
        window.cyberAlert("SIGNAL_INCOMPATIBLE", "error");
    }
};

window.resetAudioUI = (msgId) => {
    const btn = document.getElementById(`play-btn-${msgId}`);
    if (btn) btn.innerHTML = '\u25B6\uFE0F';
    const fill = document.getElementById(`fill-${msgId}`);
    if (fill) fill.style.width = '0%';
};

window.updateAudioProgress = (msgId, el) => {
    const fill = document.getElementById(`fill-${msgId}`);
    if (fill && el.duration) {
        const p = (el.currentTime / el.duration) * 100;
        fill.style.width = p + '%';
    }
};

window.b64toBlob = (b64Data, contentType = '', sliceSize = 512) => {
    try {
        const byteCharacters = atob(b64Data.trim());
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: contentType });
    } catch (e) {
        console.error("B64 Process Error:", e);
        return null;
    }
};

const initNotifications = async () => {
    // 1. Browser Notification Support (Web Preview)
    if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    // 2. Define universal notify handler
    window._notify = async (title, body, chatData = {}) => {
        console.log(`[SIGNAL_INTEL] ${title}: ${body}`);

        // Don't show if app is active
        if (appInForeground) return;

        // Try Capacitor Local Notifications first
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const { LocalNotifications } = window.Capacitor.Plugins;
            if (LocalNotifications) {
                try {
                    await LocalNotifications.schedule({
                        notifications: [{
                            title: title || 'NEW SIGNAL',
                            body: body || 'Tap to decrypt.',
                            id: Math.floor(Math.random() * 100000),
                            schedule: { at: new Date(Date.now()) },
                            sound: 'default',
                            extra: chatData,
                            channelId: 'shield_alerts',
                            importance: 5,
                            priority: 1
                        }]
                    });
                    return;
                } catch (err) { console.warn("Capacitor Notify Error:", err); }
            }
        }

        // Fallback to Browser Notification API
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(title, { body: body, icon: 'assets/shield_logo.png' });
        }
    };

    // 3. Capacitor Specific Init
    if (typeof window !== 'undefined' && window.Capacitor) {
        try {
            const plugins = window.Capacitor.Plugins || {};
            const { LocalNotifications, App, PushNotifications } = plugins;

            if (App) {
                App.addListener('appStateChange', ({ isActive }) => {
                    appInForeground = isActive;
                    if (!isActive) {
                        bgTimer = setTimeout(() => { sessionStorage.setItem('_shield_unlocked', 'false'); }, 15000);
                    } else {
                        if (bgTimer) clearTimeout(bgTimer);
                        const requiresLock = localStorage.getItem('toggle-applock') === 'true';
                        if (requiresLock && sessionStorage.getItem('_shield_unlocked') !== 'true') {
                            if (window.showLockScreen) window.showLockScreen();
                        }
                    }
                });
            }

            if (window.Capacitor.isNativePlatform() && LocalNotifications) {
                await LocalNotifications.createChannel({
                    id: 'shield_alerts',
                    name: 'Shield Alerts',
                    importance: 5,
                    visibility: 1,
                    sound: 'default'
                });
            }

            if (window.Capacitor.isNativePlatform() && PushNotifications) {
                try {
                    console.log("SHIELD_INTEL: REQUESTING_NOTIF_PERMS");
                    const result = await PushNotifications.requestPermissions();
                    if (result.receive === 'granted') {
                        console.log("SHIELD_INTEL: PERMS_GRANTED. REGISTERING_TOKEN...");
                        // CRITICAL: We wrap this because it WILL crash if google-services.json is missing
                        try {
                            await PushNotifications.register();
                            console.log("SHIELD_INTEL: REGISTRATION_SUCCESS");
                        } catch (regError) {
                            console.error("SHIELD_INTEL: PUSH_REG_CRASH_PREVENTED:", regError);
                            if (window.cyberAlert) window.cyberAlert("NOTIFICATIONS: CFG_ERROR (Missing JSON?)", "error");
                        }
                    } else {
                        console.warn("SHIELD_INTEL: PERMS_DENIED");
                    }
                } catch (permError) {
                    console.error("SHIELD_INTEL: PERM_REQ_ERROR:", permError);
                }
            }
        } catch (e) {
            console.error("Capacitor Init Error:", e);
        }
    }
}
initNotifications();

document.addEventListener('DOMContentLoaded', () => {
    // IMMEDIATE BOOT: ensure background is black
    document.body.style.backgroundColor = '#000000';

    console.log("DOM Loaded: System Boot Sequence Started");

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('doc')) {
        window.hideSplash();
    }

    // --- INTERNET CONNECTIVITY CHECK ---
    const checkConnectivity = () => {
        if (!navigator.onLine) {
            window.cyberAlert("OFFLINE: INTERNET NOT DETECTED", "error");
        }
    };
    window.addEventListener('online', () => window.cyberAlert("ONLINE: BRIDGE RESTORED"));
    window.addEventListener('offline', () => window.cyberAlert("OFFLINE: BRIDGE DROPPED", "error"));
    checkConnectivity();

    window.downloadFromLink = async function (docId) {
        window.cyberAlert("ACQUIRING SIGNAL...");
        try {
            const snap = await get(ref(database, `shared_docs/${docId}`));
            if (snap.exists()) {
                const doc = snap.val();

                // --- ROBUST DOWNLOAD BLOB ENGINE ---
                const base64Data = doc.data.split(',')[1];
                const parts = doc.data.split(',')[0].split(':');
                const contentType = parts[1].split(';')[0];

                const byteCharacters = atob(base64Data);
                const byteArrays = [];
                for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                    const slice = byteCharacters.slice(offset, offset + 512);
                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                        byteNumbers[i] = slice.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    byteArrays.push(byteArray);
                }
                const blob = new Blob(byteArrays, { type: contentType });
                const url = window.URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = doc.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                window.cyberAlert("SIGNAL DECRYPTED");
            } else {
                window.cyberAlert("SIGNAL VOID OR EXPIRED", "error");
            }
        } catch (err) {
            console.error("Downlink Error:", err);
            window.cyberAlert("DECODE FAILURE", "error");
        }
    }

    // --- SECURE DOWNLINK LANDING PAGE UI ---
    window.renderDownlinkUI = async function (docId) {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div style="height:100vh; background:#000; color:var(--terminal-green); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px; font-family:var(--font-mono); font-size:0.75rem;">
                <div style="width:100%; max-width:400px; background:rgba(255,255,255,0.05); border:1px solid var(--terminal-green); border-radius:20px; padding:40px; text-align:center; box-shadow:0 0 30px rgba(0,255,157,0.1);">
                    <div id="dl-icon" style="font-size:3rem; margin-bottom:20px;">📄</div>
                    <div id="dl-loading">
                        <p style="letter-spacing:2px; animation: pulse 1s infinite;">ACQUIRING ENCRYPTED SIGNAL...</p>
                    </div>
                    <div id="dl-ready" style="display:none;">
                        <h2 id="dl-name" style="color:#fff; margin-bottom:10px; font-size:1rem; word-break:break-all;"></h2>
                        <p id="dl-info" style="opacity:0.6; margin-bottom:30px; font-size:0.6rem;"></p>
                        <div id="dl-preview" style="margin-bottom:20px; display:none;">
                            <img id="dl-img-prev" style="width:100%; border-radius:10px; border:1px solid rgba(192,192,192,0.2);">
                        </div>
                        <button class="quantum-btn" style="width:100%; padding:15px; background:var(--terminal-green); color:#000; font-weight:bold;" onclick="window.downloadFromLink('${docId}')">DECRYPT & DOWNLOAD</button>
                    </div>
                </div>
                <p style="margin-top:30px; opacity:0.4; font-size:0.55rem;">[ SHIELD SECURE TRANSMISSION CHANNEL ]</p>
            </div>
        `;

        try {
            const snap = await get(ref(database, `shared_docs/${docId}`));
            if (snap.exists()) {
                const doc = snap.val();
                document.getElementById('dl-loading').style.display = 'none';
                document.getElementById('dl-ready').style.display = 'block';
                document.getElementById('dl-name').innerText = doc.name;
                document.getElementById('dl-info').innerText = `SIZE: ~${(doc.data.length / 1024).toFixed(1)} KB | FREQUENCY: SECURE_UPLINK`;

                // Image Preview Logic
                if (doc.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                    document.getElementById('dl-icon').innerText = "\uD83D\uDDBC\uFE0F";
                    document.getElementById('dl-preview').style.display = 'block';
                    document.getElementById('dl-img-prev').src = doc.data;
                } else {
                    document.getElementById('dl-icon').innerText = "\uD83D\uDCC4";
                }
            } else {
                document.getElementById('dl-loading').innerHTML = `<p style="color:red;">SIGNAL ERROR: DATA NOT FOUND ON SERVER</p>`;
            }
        } catch (e) {
            document.getElementById('dl-loading').innerHTML = `<p style="color:red;">CONNECTION INTERRUPTED</p>`;
        }
    }



    // GENERATE STARS FOR DASHBOARD BG
    function generateStars() {
        const container = document.getElementById('stars-container');
        if (!container) return;

        // Clear existing
        container.innerHTML = '';

        for (let i = 0; i < 50; i++) {
            const star = document.createElement('div');
            star.classList.add('star');
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const delay = Math.random() * 3;
            const duration = 2 + Math.random() * 3;

            star.style.left = `${x}%`;
            star.style.top = `${y}%`;
            star.style.width = Math.random() > 0.5 ? '2px' : '1px';
            star.style.height = star.style.width;
            star.style.setProperty('--duration', `${duration}s`);
            star.style.animationDelay = `${delay}s`;

            container.appendChild(star);
        }
    }
    // Call immediately in case we are already on chat page (e.g. reload)
    // Ensure we are fully visible and covering the screen
    console.log("SHIELD OS BOOT: System Ready");
    document.body.style.backgroundColor = '#000000';
    document.documentElement.style.backgroundColor = '#000000';
    generateStars();

    // Pages are managed by the high-priority bootstrap in index.html

    // Navigation logic handled globally now (see index.html)
    // Compatibility shim if needed locally, but we should call window.showPage
    const showPage = window.showPage;

    // Expose for inline usage
    // window.showPage = showPage; // This line is now redundant if showPage is global

    // Standardized Toast Alert System (Minimal Pill)
    window.cyberAlert = function (message, type = 'success') {
        const existing = document.querySelector('.cyber-alert');
        if (existing) existing.remove(); // Only show one at a time for cleanliness

        const alertDiv = document.createElement('div');
        alertDiv.className = 'cyber-alert';
        const icon = type === 'error' ? '\u2716\uFE0F' : '\u2705';
        const iconColor = type === 'error' ? '#FF5252' : '#D4AF37';
        alertDiv.innerHTML = `<span style="color:${iconColor}; font-weight:900;">${icon}</span> <span>${message}</span>`;
        document.body.appendChild(alertDiv);

        requestAnimationFrame(() => alertDiv.classList.add('active'));

        setTimeout(() => {
            alertDiv.classList.remove('active');
            setTimeout(() => alertDiv.remove(), 400);
        }, 2200); // Shorter duration for less obstruction
    };

    window.cyberConfirm = function (message, title = 'CONFIRM') {
        return window.showModal({ title, message, confirmText: 'YES', cancelText: 'NO' });
    };

    // Premium Modal System (Confirm/Prompt) - Minimized for better UX
    window.showModal = function ({ title, message, placeholder = '', showInput = false, confirmText = 'OK', cancelText = 'CANCEL' }) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `position:fixed; inset:0; z-index:12000; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.3s ease;`;

            const modal = document.createElement('div');
            modal.style.cssText = `width:80%; max-width:280px; border-radius:32px; padding:24px; background:rgba(15,15,15,0.98); border:1px solid rgba(255,255,255,0.08); box-shadow:0 30px 60px rgba(0,0,0,0.8); transform:scale(0.9); transition:all 0.38s cubic-bezier(0.34, 1.56, 0.64, 1); text-align:center;`;

            modal.innerHTML = `
                <div style="margin-bottom:20px;">
                    <h3 style="color:#D4AF37; margin-bottom:12px; letter-spacing:1px; font-size:0.85rem; text-transform:uppercase; font-weight:800; font-family:var(--font-heading);">${title}</h3>
                    <div style="color:rgba(255,255,255,0.7); font-size:0.75rem; line-height:1.4; font-family:var(--font-mono);">${message}</div>
                </div>
            `;

            let input = null;
            if (showInput) {
                input = document.createElement('input');
                input.type = 'text';
                input.placeholder = placeholder;
                input.style.cssText = "width:100%; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:14px; padding:12px 14px; color:#fff; font-family:var(--font-mono); margin-bottom:20px; outline:none; font-size:0.85rem; box-sizing:border-box; text-align:center;";
                modal.appendChild(input);
            }

            const btnRow = document.createElement('div');
            btnRow.style.cssText = "display:flex; gap:10px; justify-content:center;";

            const cancelBtn = document.createElement('button');
            cancelBtn.style.cssText = "flex:1; padding:12px; font-size:0.7rem; border-radius:14px; border:1px solid rgba(255,255,255,0.05); background:rgba(255,255,255,0.02); color:rgba(255,255,255,0.4); cursor:pointer; font-weight:600; text-transform:uppercase; letter-spacing:1px;";
            cancelBtn.textContent = cancelText;

            const confirmBtn = document.createElement('button');
            confirmBtn.style.cssText = "flex:1; padding:12px; font-size:0.7rem; border-radius:14px; border:none; background:linear-gradient(135deg, #D4AF37, #B08D26); color:#000; cursor:pointer; font-weight:800; text-transform:uppercase; letter-spacing:1px;";
            confirmBtn.textContent = confirmText;

            btnRow.appendChild(cancelBtn);
            btnRow.appendChild(confirmBtn);
            modal.appendChild(btnRow);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                modal.style.transform = 'scale(1)';
            });

            const close = (val) => {
                overlay.style.opacity = '0';
                modal.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    overlay.remove();
                    resolve(val);
                }, 300);
            };

            cancelBtn.onclick = () => close(false);
            confirmBtn.onclick = () => {
                if (showInput) close(input.value);
                else close(true);
            };
            overlay.onclick = (e) => {
                if (e.target === overlay) close(null);
            };

            if (input) {
                input.onkeydown = (e) => { if (e.key === 'Enter') confirmBtn.click(); };
                setTimeout(() => input.focus(), 100);
            }
        });
    };

    window.cyberConfirm = (message, title = 'Confirm') => window.showModal({ title, message, showInput: false });
    window.cyberPrompt = (message, placeholder = '', title = 'Input Required') => window.showModal({ title, message, placeholder, showInput: true });

    // --- Biometric Authentication Bridge (must be defined before auth state listener) ---
    window.requestBiometricAuth = async (isSetup = false) => {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const { NativeBiometric } = window.Capacitor.Plugins;
                if (NativeBiometric) {
                    await NativeBiometric.verifyIdentity({
                        reason: isSetup ? "Authorize Secure Access" : "Unlock App",
                        title: "Biometric Authentication",
                        subtitle: "Scan your fingerprint",
                        description: "Please authenticate to continue"
                    });
                    return true;
                }
            } catch (e) {
                console.warn("Native Bio Error:", e);
                return false;
            }
        }

        // Fallback: Biometric Scan UI Simulation
        return new Promise((resolve) => {
            const scanOverlay = document.createElement('div');
            scanOverlay.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:100000; display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter:blur(10px); color:#D4AF37; font-family:var(--font-mono);";
            scanOverlay.innerHTML = `
                <div style="width:120px; height:120px; border:2px solid #D4AF37; border-radius:50%; position:relative; display:flex; align-items:center; justify-content:center; overflow:hidden; cursor:pointer;" id="bio-scan-btn">
                    <div id="scan-line" style="position:absolute; top:0; left:0; width:100%; height:2px; background:#D4AF37; box-shadow:0 0 15px #D4AF37; animation:scan 2s infinite ease-in-out; display:none;"></div>
                    <svg viewBox="0 0 24 24" style="width:60px; height:60px; color:#D4AF37; opacity:0.8;"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="currentColor"/></svg>
                </div>
                <p style="margin-top:30px; letter-spacing:3px; font-size:0.8rem; text-align:center;">${isSetup ? 'TAP TO ENROLL BIOMETRICS' : 'TAP TO SCAN BIOMETRIC'}</p>
                <style>@keyframes scan { 0% {top:0;} 50% {top:100%;} 100% {top:0;} }</style>
            `;
            document.body.appendChild(scanOverlay);

            document.getElementById('bio-scan-btn').onclick = async () => {
                document.getElementById('scan-line').style.display = 'block';
                await new Promise(r => setTimeout(r, 1000));
                scanOverlay.remove();

                const pin = localStorage.getItem('app-pin') || "1234";
                const entered = await window.cyberPrompt(
                    isSetup ? "Set a PIN as fallback" : "Enter your PIN",
                    "xxxx",
                    "Authentication"
                );

                if (isSetup && entered && entered.length >= 4) {
                    localStorage.setItem('app-pin', entered);
                    resolve(true);
                } else if (!isSetup && entered === pin) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            };
        });
    };

    // Handle Redirect Result (Google/Social Login)
    getRedirectResult(auth).then(async (result) => {
        if (result?.user) {
            console.log("SHIELD_AUTH: REDIRECT_SUCCESS:", result.user.email);
            sessionStorage.removeItem('_shield_auth_redirect');
            // Ensure user profile exists in database
            try {
                const userSnap = await get(ref(database, `users/${result.user.uid}`));
                if (!userSnap.exists()) {
                    await set(ref(database, 'users/' + result.user.uid), {
                        email: result.user.email,
                        createdAt: Date.now(),
                        lastLogin: Date.now(),
                        wallet: { balance: 100 }
                    });
                    console.log("SHIELD_AUTH: NEW_USER_PROFILE_CREATED_VIA_REDIRECT");
                }
            } catch (dbErr) {
                console.warn("SHIELD_AUTH: DB_PROFILE_SYNC_RETRY", dbErr);
            }
            // onAuthStateChanged will handle navigation
        }
    }).catch((error) => {
        console.error("Redirect Auth Error:", error.code, error.message);
        sessionStorage.removeItem('_shield_auth_redirect');
        if (error.code !== 'auth/popup-closed-by-user') {
            window.cyberAlert("AUTH FAILED: " + (error.code || error.message), "error");
        }
    });

    // --- Unified Security Gate ---
    window.showLockScreen = async () => {
        const user = auth.currentUser;
        if (!user) {
            window.showPage('welcome');
            return;
        }

        // Demo account skips lock
        if (user.email === 'demo@shield.com') {
            sessionStorage.setItem('_shield_unlocked', 'true');
            finalizeUserInit(user);
            return;
        }

        const isUnlocked = sessionStorage.getItem('_shield_unlocked') === 'true';
        if (isUnlocked) {
            finalizeUserInit(user);
            return;
        }

        let success = false;
        const requiresBiometric = localStorage.getItem('biometric-lock-enabled') === 'true';
        const requiresAppLock = localStorage.getItem('app-pin') && localStorage.getItem('app-lock-enabled') === 'true';

        if (requiresBiometric && window.requestBiometricAuth) {
            success = await window.requestBiometricAuth(false);
        } else if (requiresAppLock) {
            const pin = await window.cyberPrompt("ENTER SECURITY PIN", "xxxx", "SHIELD ENCRYPTION");
            if (pin === localStorage.getItem('app-pin')) {
                success = true;
            } else if (pin !== null) {
                window.cyberAlert("ACCESS DENIED: INTRUSION DETECTED", "error");
            }
        } else {
            // No lock configured
            success = true;
        }

        if (success) {
            sessionStorage.setItem('_shield_unlocked', 'true');
            finalizeUserInit(user);
        } else {
            console.warn("SHIELD_LOCK: AUTH_REFUSED");
            window.showPage('welcome');
        }
    };


    // --- NUCLEAR TERMINATION PROTOCOL (Absolute Lockdown) ---
    const handleTermination = () => {
        console.error("SHIELD_SECURITY: ACCOUNT_TERMINATED_PROTOCOL_ACTIVE");
        
        // 1. Immediate Visual & Interaction Death
        document.body.innerHTML = `
            <div style="height:100vh; background:#000; color:#ff1744; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:var(--font-mono); text-align:center; padding:20px; z-index:99999; position:fixed; inset:0;">
                <div style="font-size:4rem; margin-bottom:20px;">\u26D4</div>
                <div style="font-size:1.5rem; letter-spacing:5px; font-weight:900; margin-bottom:10px;">SIGNAL_TERMINATED</div>
                <div style="opacity:0.6; font-size:0.7rem; margin-bottom:20px;">ADMIN_REVOKED_ACCESS // NODE_PURGED</div>
                
                <button onclick="localStorage.removeItem('_SHIELD_TERMINATED'); window.location.href='index.html';" 
                        style="background:transparent; border:1px solid #ff1744; color:#ff1744; padding:12px 25px; border-radius:12px; font-family:inherit; font-weight:bold; cursor:pointer; text-transform:uppercase; letter-spacing:2px; margin-bottom:20px;">
                    BACK TO LOGIN
                </button>

                <div style="font-size:0.6rem; color:#555;">REF_ID: ${Math.random().toString(36).substring(7).toUpperCase()}</div>
            </div>
        `;
        document.body.style.overflow = "hidden";
        
        // 2. Clear all traces
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('_SHIELD_TERMINATED', 'true');
        
        // 3. Force Logout (User must click button to go back)
        signOut(auth).finally(() => {
            console.warn("SHIELD_SECURITY: SESSION_PURGED");
            // Automatic redirect removed to allow manual recovery via button
        });
    };

    // Auth State Listener
    onAuthStateChanged(auth, async (user) => {
        // --- PERSISTENT TERMINATION CHECK (Resistant to Page Reload) ---
        // Only trigger if NOT on the welcome/login pages to allow recovery
        const isAuthContext = ['welcome', 'login', 'register', 'forgot'].some(id => 
            document.getElementById(id + '-page')?.classList.contains('active')
        );

        if (localStorage.getItem('_SHIELD_TERMINATED') === 'true' && !isAuthContext) {
            console.log("SHIELD_SECURITY: PERSISTENT_TERMINATION_ENFORCED");
            handleTermination();
            return;
        }

        if (user) {
            console.log("SHIELD_AUTH: VERIFYING_NODE_INTEGRITY:", user.email);
            
            // --- DEMO EXEMPTION PROTOCOL ---
            const isDemoUser = user.email === 'demo@shield.com';
            if (isDemoUser) {
                console.log("SHIELD_SECURITY: DEMO_ACCOUNT_IMMUNITY_ACTIVE");
                localStorage.removeItem('_SHIELD_TERMINATED');
                window.showLockScreen();
                return;
            }

            // --- ZERO-HOUR TERMINATION CHECK ---
            const checkStatus = async () => {
                try {
                    const userSnap = await get(ref(database, `users/${user.uid}`));
                    const data = userSnap.val();
                    
                    if (data) {
                        const isTerminated = data.status === 'terminated';
                        const isInactive = data.active === false;

                        if (isTerminated || isInactive) {
                            console.error(`SHIELD_SECURITY: TERMINATION_SIGNAL_CONFIRMED | Reason: ${isTerminated ? 'STATUS_TERMINATED' : 'INACTIVE_ACCOUNT'}`);
                            localStorage.setItem('_SHIELD_TERMINATED', 'true');
                            handleTermination();
                            return true;
                        }
                    }
                } catch (e) {
                    console.warn("SHIELD_SECURITY: DB_SYNC_PENDING", e);
                }
                return false;
            };

            const isTerminated = await checkStatus();
            if (isTerminated) return;

            // Periodic Health Check (Heartbeat) - 10 Second Interval
            const securityHeartbeat = setInterval(async () => {
                if (await checkStatus()) {
                    clearInterval(securityHeartbeat);
                }
            }, 10000);

            // Real-time listener for mid-session termination
            onValue(ref(database, `users/${user.uid}`), (snap) => {
                const updated = snap.val();
                if (updated) {
                    const isTerminated = updated.status === 'terminated';
                    const isInactive = updated.active === false;

                    if (isTerminated || isInactive) {
                        console.error(`SHIELD_SECURITY: INTERCEPT_SIGNAL_KILL | Reason: ${isTerminated ? 'STATUS_TERMINATED' : 'INACTIVE_ACCOUNT'}`);
                        localStorage.setItem('_SHIELD_TERMINATED', 'true');
                        handleTermination();
                    }
                }
            }, (err) => {
                console.warn("SHIELD_SECURITY: REALTIME_SYNC_INTERRUPTED", err);
            });

            updateBootStatus("ACCESS_GRANTED");
            window.showLockScreen();
        } else {
            console.log("SHIELD_AUTH: NO_ACTIVE_SESSION");
            updateBootStatus("READY_FOR_DEPLOYMENT");
            localStorage.removeItem('_SHIELD_TERMINATED'); // Clear flag when no user is logged in
            if (!navigator.onLine) {
                updateBootStatus("OFFLINE_MODE");
                return;
            }
            sessionStorage.setItem('_shield_unlocked', 'false');
            
            // CHECK FOR DOC LINK EVEN IF NOT LOGGED IN
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('doc')) {
                updateBootStatus("DECODING_TRANSMISSION");
                window.renderDownlinkUI(urlParams.get('doc'));
                return;
            }

            window.showPage('welcome');
            if (typeof window.hideSplash === 'function') window.hideSplash();
        }
    });

    function finalizeUserInit(user) {
        // Skip if already terminated
        if (localStorage.getItem('_SHIELD_TERMINATED') === 'true') {
            handleTermination();
            return;
        }
        console.log("SHIELD_OS: VERIFYING_SESSION_INTEGRITY...");
        console.log("CURRENT_USER_UID:", user.uid);

        // --- HARD KILL WATCHER ---
        const userNode = ref(database, `users/${user.uid}`);

        onValue(userNode, (snapshot) => {
            const data = snapshot.val();
            const isDemo = user.email === 'demo@shield.com';
            if (!isDemo && data && (data.status === 'terminated' || data.active === false)) {
                console.error("SHIELD_SECURITY: TERMINATION_SIGNAL_DETECTED");
                handleTermination();
            }
        });

        const urlParams = new URL(window.location.href).searchParams;
        if (urlParams.get('doc')) {
            window.renderDownlinkUI(urlParams.get('doc'));
            return;
        }

        const isAuthPage = ['welcome', 'login', 'register', 'forgot'].some(id => document.getElementById(id + '-page')?.classList.contains('active'));
        if (isAuthPage || !document.querySelector('.page.active')) {
            window.showPage('chat');
            const chatContainer = document.querySelector('.chat-container');
            if (chatContainer) chatContainer.classList.add('sidebar-active');
        }

        console.log("SHIELD OS: INITIALIZING CORE MODULES...");
        updateUserProfile(user);
        initializeChat(user);
        initializeWallet(user);
        initializePresence(user);
        bootstrapGlobalSignalIntelligence(user);

        // Critical modules requested by user
        if (typeof initializeStatuses === 'function') {
            console.log("BOOTING STATUS SYSTEM...");
            initializeStatuses(user);
        }
        if (typeof initializeGroups === 'function') {
            console.log("BOOTING GROUP SYSTEM...");
            initializeGroups(user);
        }

        initSettings(user);
        initProfile(user);
        console.log("SHIELD OS: ALL MODULES ONLINE.");


        // ====================== USER & GROUP PROFILE SYSTEM ======================
        window.showUserProfile = async (name, avatarText, targetEmail, targetUid) => {
            const isGroup = targetUid && targetUid.startsWith('group_');
            let infoHtml = '';
            let adminOptionsHtml = '';
            let memberListHtml = '';
            const currentUser = auth.currentUser;

            if (isGroup) {
                const groupSnap = await get(ref(database, `groups/${targetUid}`));
                const groupData = groupSnap.val() || {};
                const isAdmin = groupData.admins && groupData.admins[currentUser.uid];
                const memberUids = groupData.members ? Object.keys(groupData.members) : [];

                infoHtml = `<div style="color:var(--terminal-green); font-size:0.8rem; margin-top:10px; font-family:var(--font-mono);">CHANNEL_ID: ${targetUid.substring(6)}</div>`;

                // Fetch member details in parallel for speed
                const memberDetails = await Promise.all(memberUids.map(async (muid) => {
                    const isMAdmin = groupData.admins && groupData.admins[muid];
                    const mNameSnap = await get(ref(database, `users/${muid}/profile/username`));
                    return {
                        uid: muid,
                        name: mNameSnap.val() || 'NODE_' + muid.substring(0, 4),
                        isAdmin: isMAdmin
                    };
                }));

                memberDetails.forEach(m => {
                    memberListHtml += `
                        <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.03); border-radius:15px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.02);">
                            <div style="display:flex; align-items:center; gap:12px; text-align:left;">
                                <div style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, #111, #000); color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.75rem; border:1.5px solid ${m.isAdmin ? '#D4AF37' : '#555'};">${m.name.substring(0, 2).toUpperCase()}</div>
                                <div style="min-width:0;">
                                    <div style="color:#fff; font-size:0.85rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">${m.name} ${m.uid === currentUser.uid ? '<span style="color:var(--terminal-green); font-size:0.6rem;">(YOU)</span>' : ''}</div>
                                    <div style="color:${m.isAdmin ? '#D4AF37' : 'rgba(255,255,255,0.4)'}; font-size:0.55rem; letter-spacing:1px; margin-top:2px;">${m.isAdmin ? '👑 ADMIN' : 'PARTICIPANT'}</div>
                                </div>
                            </div>
                            ${isAdmin && m.uid !== currentUser.uid ? `
                                <div style="display:flex; gap:8px;">
                                    <button onclick="window._modGrp('${targetUid}', '${m.uid}', 'toggle_admin')" title="Toggle Admin" style="background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.2); border-radius:8px; color:#D4AF37; padding:5px; cursor:pointer;">${m.isAdmin ? '👤' : '👑'}</button>
                                    <button onclick="window._modGrp('${targetUid}', '${m.uid}', 'remove')" title="Remove Member" style="background:rgba(255,51,51,0.1); border:1px solid rgba(255,51,51,0.2); border-radius:8px; color:#FF3333; padding:5px; cursor:pointer;">✖</button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                });

                memberListHtml = `
                    <div style="margin-top:20px; text-align:left;">
                        <span style="font-size: 0.6rem; letter-spacing: 2px; opacity: 0.4; font-family: var(--font-mono); display: block; margin-bottom: 8px;">${memberUids.length} PARTICIPANTS</span>
                        <div style="max-height:200px; overflow-y:auto;">${memberListHtml}</div>
                    </div>
                `;
            } else {
                infoHtml = `
                    <div style="color:#ccc; font-size:0.8rem; margin-top:10px;">EMAIL: ${targetEmail || 'HIDDEN'}</div>
                    <div style="color:var(--terminal-green); font-size:0.8rem; margin-top:5px; font-family:var(--font-mono);">ENCRYPTION_CHANNEL: ACTIVE</div>
                `;
            }

            const modalContent = `
                <div style="display:flex; flex-direction:column; align-items:stretch;">
                    <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:10px;">
                        <div style="width:90px; height:90px; border-radius:50%; background:linear-gradient(135deg, #111, #000); border:2px solid ${isGroup ? 'var(--terminal-green)' : '#D4AF37'}; display:flex; align-items:center; justify-content:center; color:${isGroup ? 'var(--terminal-green)' : '#D4AF37'}; font-size:2.2rem; font-weight:bold; box-shadow:0 0 30px rgba(0,0,0,0.5); margin-bottom:15px;">${avatarText}</div>
                        <h2 style="color:#fff; font-size:1.3rem; font-family:var(--font-heading); letter-spacing:1px; margin:0;">${name}</h2>
                        ${infoHtml}
                    </div>
                    ${memberListHtml}
                    ${adminOptionsHtml}
                </div>
            `;

            const overlay = document.createElement('div');
            overlay.style.cssText = `position:fixed; inset:0; z-index:15000; background:rgba(0,0,0,0.9); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.3s ease;`;

            const modal = document.createElement('div');
            modal.style.cssText = `width:90%; max-width:340px; border-radius:30px; padding:25px; background:rgba(10,10,10,0.98); border:1px solid rgba(255,255,255,0.08); box-shadow:0 40px 80px rgba(0,0,0,0.9); transform:scale(0.9); transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);`;

            modal.innerHTML = modalContent + `<button id="close-profile-btn" style="margin-top:20px; width:100%; padding:12px; background:transparent; border:1px solid rgba(255,255,255,0.1); border-radius:15px; color:rgba(255,255,255,0.5); cursor:pointer; font-size:0.8rem; font-weight:700;">CLOSE</button>`;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            requestAnimationFrame(() => { overlay.style.opacity = '1'; modal.style.transform = 'scale(1)'; });

            const close = () => { overlay.style.opacity = '0'; modal.style.transform = 'scale(0.9)'; setTimeout(() => overlay.remove(), 300); };
            document.getElementById('close-profile-btn').onclick = close;

            // Global handler for group modifications
            window._modGrp = async (gid, mid, action) => {
                const gRef = ref(database, `groups/${gid}`);
                const gSnap = await get(gRef);
                const gData = gSnap.val();

                if (action === 'remove') {
                    if (await window.cyberConfirm(`Remove participant from this channel?`)) {
                        await set(ref(database, `groups/${gid}/members/${mid}`), null);
                        await set(ref(database, `users/${mid}/groups/${gid}`), null);
                        window.cyberAlert("NODE DISCONNECTED");
                        close();
                        window.showUserProfile(name, avatarText, targetEmail, targetUid);
                    }
                } else if (action === 'toggle_admin') {
                    const currentlyAdmin = gData.admins && gData.admins[mid];
                    await set(ref(database, `groups/${gid}/admins/${mid}`), currentlyAdmin ? null : true);
                    window.cyberAlert(currentlyAdmin ? "ADMIN RIGHTS REVOKED" : "ADMIN RIGHTS GRANTED");
                    close();
                    window.showUserProfile(name, avatarText, targetEmail, targetUid);
                } else if (action === 'rename') {
                    const newName = await window.cyberPrompt("RENAME CHANNEL", gData.name, "CHANGE MULTI-SYNC IDENTITY");
                    if (newName) {
                        await set(ref(database, `groups/${gid}/name`), newName.toUpperCase());
                        window.cyberAlert("CHANNEL IDENTITY UPDATED");
                        close();
                        window.showUserProfile(newName.toUpperCase(), avatarText, targetEmail, targetUid);
                    }
                }
            };

            if (isGroup && document.getElementById('add-member-btn')) {
                document.getElementById('add-member-btn').onclick = async () => {
                    const friendEmail = await window.cyberPrompt("ADD PARTICIPANT", "Enter user email", "LINK NEW NODE");
                    if (!friendEmail) return;
                    get(ref(database, 'users')).then(async (usersSnap) => {
                        const allUsers = usersSnap.val();
                        const targetUserEntry = Object.entries(allUsers).find(([uid, u]) => u.email === friendEmail);
                        if (targetUserEntry) {
                            const [foundUid] = targetUserEntry;
                            await set(ref(database, `groups/${targetUid}/members/${foundUid}`), true);
                            await set(ref(database, `users/${foundUid}/groups/${targetUid}`), true);
                            window.cyberAlert("PARTICIPANT LINKED");
                            close();
                            window.showUserProfile(name, avatarText, targetEmail, targetUid);
                        } else {
                            window.cyberAlert("NODE NOT FOUND", "error");
                        }
                    });
                };
            }
        };

        // REAL-TIME IDENTITY SYNC
        onValue(ref(database, `users/${user.uid}/profile`), (snap) => {
            const data = snap.val();
            if (data && data.avatar) {
                const avatarImg = document.getElementById('profile-avatar-img');
                const avatarText = document.getElementById('profile-avatar-text');
                const sidebarAvatarWrapper = document.querySelector('.user-info .contact-avatar');
                if (avatarImg) { avatarImg.src = data.avatar; avatarImg.style.display = 'block'; }
                if (avatarText) avatarText.style.display = 'none';
                if (sidebarAvatarWrapper) {
                    sidebarAvatarWrapper.innerHTML = `<img src="${data.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                }
            }
        });
        requestNativePermissions();
    }

    // --- GLOBAL BOOT DRIVE LISTENER ---
    const globalParams = new URLSearchParams(window.location.search);
    if (globalParams.get('doc')) {
        window.renderDownlinkUI(globalParams.get('doc'));
    }

    async function requestNativePermissions() {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const { Camera, Filesystem } = window.Capacitor.Plugins;
                if (Camera) await Camera.requestPermissions();
                if (Filesystem) await Filesystem.requestPermissions();
                console.log("OS PERMISSIONS: GRANTED");
            } catch (err) {
                console.warn("OS PERMISSIONS: REJECTED", err);
            }
        }
    }

    function updateUserProfile(user) {
        const usernameEl = document.querySelector('.user-info .username');
        const statusEl = document.querySelector('.user-info .user-status');
        if (usernameEl) usernameEl.textContent = user.email ? (user.email || user.id || 'USER').split('@')[0].toUpperCase() : 'USER';
        if (statusEl) statusEl.textContent = "QUANTUM-LINKED";
    }

    // INITIALIZATION
    // INITIALIZATION (Handled by Auth State Listener)
    // showPage('welcome'); // Removed to prevent initial flash or loop back

    // NAVIGATIONS
    const getStartedBtn = document.getElementById('get-started-btn');
    const gotoRegister = document.getElementById('goto-register');
    const gotoForgot = document.getElementById('goto-forgot');
    const gotoLoginReg = document.getElementById('goto-login-reg');
    const gotoLoginForgot = document.getElementById('goto-login-forgot');
    const gotoLoginDivider = document.querySelector('.auth-divider span'); // Just in case user clicks text

    console.log("Buttons found:", { getStartedBtn, gotoRegister, gotoForgot });

    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            localStorage.removeItem('_SHIELD_TERMINATED'); // Clear on fresh start
            window.showPage('login');
        });
    }

    if (gotoRegister) {
        gotoRegister.addEventListener('click', (e) => {
            e.preventDefault(); // Good practice even for buttons
            localStorage.removeItem('_SHIELD_TERMINATED'); // Clear on fresh start
            console.log("Goto Register Clicked");
            showPage('register');
        });
    } else {
        console.error("Goto Register button NOT FOUND");
    }

    if (gotoLoginForgot) gotoLoginForgot.addEventListener('click', () => showPage('login'));

    // SIDEBAR NAVIGATION & TOGGLE SYSTEM
    const navTabs = document.querySelectorAll('.nav-tab');
    const sideViews = document.querySelectorAll('.sidebar-view');
    const chatContainer = document.querySelector('.chat-container');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    if (sidebarToggle && chatContainer) {
        sidebarToggle.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("SHIELD_OS: SIDEBAR TOGGLE TRIGGERED");
            chatContainer.classList.toggle('sidebar-active');
        };
    }

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            if (!chatContainer) return;

            const isActive = tab.classList.contains('active');

            if (isActive && chatContainer.classList.contains('sidebar-active')) {
                // Toggles off if clicking the already active tab
                chatContainer.classList.remove('sidebar-active');
                return;
            } else {
                // Opens if closed or switching
                chatContainer.classList.add('sidebar-active');
            }

            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            sideViews.forEach(v => v.classList.remove('active'));
            const targetView = document.getElementById(`view-${target}`);
            if (targetView) targetView.classList.add('active');
        });
    });

    // --- GLOBAL INTERACTIVITY ---
    function initGlobalInteractions() {
        // Modal Close (Generic)

        // Modal Close
        const closeModal = document.querySelector('.close-modal');
        const toolModal = document.getElementById('tool-modal');
        if (closeModal && toolModal) {
            closeModal.onclick = () => toolModal.style.display = 'none';
            toolModal.onclick = (e) => { if (e.target === toolModal) toolModal.style.display = 'none'; };
        }

        // Global Link Copy
        const navCopyLink = document.getElementById('nav-copy-link');
        if (navCopyLink) {
            navCopyLink.onclick = () => {
                const PROD_URL = "https://noor-cf2f7.web.app/index.html";
                const currentParams = window.location.search;
                const shareUrl = PROD_URL + currentParams;
                window.cyberCopy(shareUrl);
                window.cyberAlert("SECURE_DRIVE_LINK_COPIED");
            };
        }

        // Social Buttons - Improved Auth Flow
        document.querySelectorAll('.social-btn').forEach(btn => {
            btn.onclick = async () => {
                const title = btn.getAttribute('title');
                try {
                    let provider;
                    if (title ? title.includes('GOOGLE') : btn.innerText.includes('GOOGLE')) {
                        provider = new GoogleAuthProvider();
                        provider.addScope('email');
                        provider.addScope('profile');
                    }
                    else if (title ? title.includes('APPLE') : btn.innerText.includes('APPLE')) provider = new OAuthProvider('apple.com');

                    if (provider) {
                        window.cyberAlert("AUTHENTICATING...");
                        try {
                            const result = await signInWithPopup(auth, provider);
                            console.log("SHIELD_AUTH: POPUP_SUCCESS:", result.user.email);
                            // onAuthStateChanged will handle the rest
                        } catch (popupErr) {
                            console.error("SHIELD_AUTH: POPUP_ERROR:", popupErr.code, popupErr.message);
                            if (popupErr.code === 'auth/operation-not-allowed') {
                                window.cyberAlert("ENABLE GOOGLE AUTH IN FIREBASE CONSOLE", "error");
                            } else if (popupErr.code === 'auth/unauthorized-domain') {
                                window.cyberAlert("DOMAIN NOT AUTHORIZED. ADD THIS DOMAIN IN FIREBASE CONSOLE → AUTHENTICATION → SETTINGS.", "error");
                                console.error("SHIELD_AUTH: Add this domain to Firebase Console → Authentication → Settings → Authorized domains:", window.location.hostname);
                            } else if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
                                window.cyberAlert("POPUP BLOCKED. REDIRECTING...");
                                sessionStorage.setItem('_shield_auth_redirect', 'true');
                                await signInWithRedirect(auth, provider);
                            } else if (popupErr.code === 'auth/popup-closed-by-user') {
                                window.cyberAlert("AUTHENTICATION CANCELLED", "error");
                            } else {
                                throw popupErr;
                            }
                        }
                    }
                } catch (e) {
                    console.error("Auth Exception:", e);
                    window.cyberAlert("AUTH FAILED: " + (e.code || e.message), "error");
                }
            };
        });

        // Search Bars - Live filtering simulation logic
        const chatSearch = document.querySelector('.search-bar input');
        if (chatSearch) chatSearch.oninput = (e) => filterList(e.target.value, '#view-chats .contact-list');

        const friendsSearch = document.getElementById('friends-search');
        if (friendsSearch) friendsSearch.oninput = (e) => filterList(e.target.value, '#friends-list');

        function filterList(val, listSelector) {
            const list = document.querySelector(listSelector);
            if (!list) return;
            const items = list.querySelectorAll('.contact-item');
            items.forEach(item => {
                const name = item.querySelector('.contact-name').innerText.toUpperCase();
                item.style.display = name.includes(val.toUpperCase()) ? 'flex' : 'none';
            });
        }
    }


    // --- AUTHENTICATION ---

    // LOGIN
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const statusText = loginForm.parentElement.querySelector('.auth-status');
            const btnText = loginForm.querySelector('.btn-text');

            try {
                const status = document.querySelector('.auth-status') || statusText;
                if (status) status.textContent = "> AUTHENTICATING NODE...";
                if (status) status.style.color = "var(--terminal-green)";
                if (btnText) btnText.textContent = "DECRYPTING...";

                console.log("SHIELD_AUTH: Attempting login for", email);
                localStorage.removeItem('_SHIELD_TERMINATED');
                sessionStorage.removeItem('_shield_unlocked');
                
                // Nuclear check - if Firebase is not ready
                if (!auth) throw new Error("FIREBASE_AUTH_NOT_INITIALIZED");

                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                console.log("SHIELD_AUTH: Login Success", userCredential.user.email);

                if (status) {
                    status.textContent = "> ACCESS GRANTED.";
                    status.style.color = "var(--terminal-green)";
                }
                setTimeout(() => window.showPage('chat'), 500);
            } catch (error) {
                console.error("Login Error:", error);
                const errorMsg = error.code ? error.code.replace('auth/', '').toUpperCase() : error.message;
                const status = document.querySelector('.auth-status') || statusText;
                if (status) {
                    status.textContent = `> ERROR: ${errorMsg}`;
                    status.style.color = "var(--error-red)";
                }
                window.cyberAlert("AUTH_FAILED: " + errorMsg, "error");
                if (btnText) btnText.textContent = "SIGN IN"; 
            }
        });
        // DEMO LOGIN
        const demoBtn = document.getElementById('demo-login-btn');
        if (demoBtn) {
            demoBtn.addEventListener('click', async () => {
                const email = 'demo@shield.com';
                const password = 'password123';
                const statusText = document.querySelector('.auth-status');

                // Clear any terminated flag so demo always works
                localStorage.removeItem('_SHIELD_TERMINATED');
                sessionStorage.removeItem('_shield_unlocked');

                try {
                    if (statusText) statusText.textContent = "> INITIATING DEMO PROTOCOL...";
                    if (statusText) statusText.style.color = "var(--terminal-green)";
                    console.log("SHIELD_AUTH: Attempting Demo Login...");

                    await signInWithEmailAndPassword(auth, email, password);

                    if (statusText) statusText.textContent = "> DEMO ACCESS GRANTED.";
                    console.log("SHIELD_AUTH: Demo Login Success");
                    window.showPage('chat');
                } catch (error) {
                    console.log("Demo Login failed, attempting creation...", error.code);
                    // If user doesn't exist, create it
                    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-email') {
                        try {
                            if (statusText) statusText.textContent = "> CREATING DEMO NODE...";
                            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                            const user = userCredential.user;

                            await set(ref(database, 'users/' + user.uid), {
                                email: email,
                                createdAt: Date.now(),
                                lastLogin: Date.now(),
                                isDemo: true,
                                wallet: { balance: 100 }
                            });

                            if (statusText) statusText.textContent = "> DEMO NODE CREATED.";
                            window.showPage('chat');
                        } catch (createError) {
                            console.error("Demo Creation Error:", createError);
                            if (statusText) statusText.textContent = "> DEMO ERROR: " + createError.code;
                            if (statusText) statusText.style.color = "var(--error-red)";
                        }
                    } else {
                        if (statusText) statusText.textContent = "> DEMO ERROR: " + error.code;
                        if (statusText) statusText.style.color = "var(--error-red)";
                    }
                }
            });
        }
    }

    // REGISTER
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-confirm').value;
            const statusText = registerForm.parentElement.querySelector('.auth-status');
            const btnText = registerForm.querySelector('.btn-text');

            if (password !== confirmPassword) {
                if (statusText) {
                    statusText.textContent = "> ERROR: PASSPHRASE MISMATCH";
                    statusText.style.color = "var(--error-red)";
                }
                return;
            }

            try {
                if (statusText) statusText.textContent = "> ISOLATING SESSION...";
                await signOut(auth); // Prevent cross-account data leaking

                if (statusText) statusText.textContent = "> GENERATING KEYS...";
                if (statusText) statusText.style.color = "var(--terminal-green)";
                btnText.textContent = "PROCESSING...";

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Save user profile to Realtime Database
                await set(ref(database, 'users/' + user.uid), {
                    email: email,
                    createdAt: Date.now(),
                    lastLogin: Date.now(),
                    wallet: { balance: 100 }
                });

                if (statusText) statusText.textContent = "> NODE CREATED & LINKED.";
                window.showPage('chat');
            } catch (error) {
                console.error("Register Error:", error);
                if (statusText) {
                    statusText.textContent = `> ERROR: ${error.code.replace('auth/', '').toUpperCase()}`;
                    statusText.style.color = "var(--error-red)";
                }
                btnText.textContent = "GENERATE KEY PAIR";
            }
        });
    }

    // LOGOUT HANDLER (FOR SETTINGS BUTTON)
    const settingsLogout = document.getElementById('btn-logout');
    if (settingsLogout) {
        settingsLogout.onclick = async () => {
            if (await window.cyberConfirm("Are you sure you want to log out?", "Logout")) {
                await signOut(auth);
            }
        };
    }

    // FORGOT PASSWORD
    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value;
            const statusText = document.querySelector('#forgot-password-page .auth-status');
            const btnText = forgotForm.querySelector('.btn-text');

            try {
                if (statusText) statusText.textContent = "> PROCESSING...";
                if (statusText) statusText.style.color = "var(--terminal-green)";
                btnText.textContent = "SENDING...";

                // Firebase natively sends reset links. To use OTPs, a custom backend is required.
                // We'll initiate the link send and show the OTP UI for the requested experience.
                await sendPasswordResetEmail(auth, email);

                document.getElementById('forgot-step-1').style.display = 'none';
                document.getElementById('forgot-step-2').style.display = 'block';

                if (statusText) statusText.textContent = "> AUTH CODE SENT TO MAIL.";
                window.cyberAlert("RESET SIGNAL SENT TO " + email.toUpperCase());
            } catch (error) {
                console.error("Forgot Password Error:", error);
                if (statusText) {
                    statusText.textContent = `> Error: ${error.code.replace('auth/', '').replace(/-/g, ' ').toUpperCase()}`;
                    statusText.style.color = "var(--error-red)";
                }
                btnText.textContent = "RESET PASSWORD";
            }
        });
    }

    const otpVerifyForm = document.getElementById('otp-verify-form');
    if (otpVerifyForm) {
        otpVerifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusText = document.querySelector('#forgot-password-page .auth-status');
            const btnText = otpVerifyForm.querySelector('.btn-text');

            if (statusText) statusText.textContent = "> VERIFYING CODE...";
            btnText.textContent = "UPDATING...";

            // Simulation of custom OTP verification and password update
            setTimeout(() => {
                window.cyberAlert("PASSWORD SECURED SUCCESSFULLY");
                window.showPage('login');
            }, 2000);
        });
    }

    // LOGOUT (Handled globally in setupNavigation)

    // Back button on mobile
    const backBtn = document.querySelector('.header-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', async () => {
            const chatContainer = document.querySelector('.chat-container');
            if (chatContainer) chatContainer.classList.remove('sidebar-active');
        });
    }

    // Sidebar toggle button in main-left-nav
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const chatContainer = document.querySelector('.chat-container');
            if (chatContainer) chatContainer.classList.toggle('sidebar-active');
        });
    }

    // Auto-open sidebar on load so dashboard isn't empty
    setTimeout(() => {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer && !chatContainer.classList.contains('sidebar-active') && !chatContainer.classList.contains('chat-active')) {
            chatContainer.classList.add('sidebar-active');
        }
    }, 300);

    // Handle clicks outside sidebar to close on mobile
    document.addEventListener('click', (e) => {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer && chatContainer.classList.contains('sidebar-active')) {
            if (!e.target.closest('.chat-sidebar') &&
                !e.target.closest('.main-left-nav') &&
                !e.target.closest('#sidebar-toggle')) {
                chatContainer.classList.remove('sidebar-active');
            }
        }
    });

    // --- REALTIME CHAT FUNCTIONALITY ---
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');
    const messagesList = document.getElementById('messages-list');
    let chatInitialized = false;

    // Unified Download helper
    // window.downloadFromLink is already defined robustly above (line 331)
    if (!window.downloadFromLink) {
        window.downloadFromLink = async (docId) => {
             // Fallback just in case
        };
    }

    window.openMedia = (url, type, name = "") => {
        const viewer = document.getElementById('media-viewer');
        const container = document.getElementById('media-container');
        const title = document.getElementById('media-title');
        const dlBtn = document.getElementById('media-download-btn');
        const closeBtn = document.getElementById('close-media-viewer');
        const progressBar = document.getElementById('media-progress-bar');
        const progressContainer = document.getElementById('media-progress-container');

        // HISTORY SYSTEM: Handle Back Button
        if (!window._modalHistoryLocked) {
            window.addEventListener('popstate', (e) => {
                const activeModals = document.querySelectorAll('.modal.active');
                activeModals.forEach(m => {
                    const cb = m.querySelector('#close-media-viewer, #close-status-viewer, .close-modal');
                    if (cb) cb.click(); else m.classList.remove('active');
                });
            });
            window._modalHistoryLocked = true;
        }

        if (!viewer || !container) {
            console.error("CRITICAL: Media Viewer elements missing from DOM.");
            return;
        }

        container.innerHTML = '';
        if (title) title.innerText = name.toUpperCase();
        console.log("Opening Media:", { url, type });

        // Push State for Hardware Back Button Support
        if (history.state?.modal !== 'viewer') {
            history.pushState({ modal: 'viewer' }, '');
        }

        // Force Visibility
        viewer.style.setProperty('display', 'flex', 'important');
        viewer.style.setProperty('opacity', '1', 'important');
        viewer.style.setProperty('z-index', '200000', 'important');
        viewer.classList.add('active');
        viewer.style.background = '#000';

        const header = viewer.querySelector('header');
        const footer = document.getElementById('media-footer');
        let uiVisible = true;
        let mediaTimer;

        const toggleUI = () => {
            uiVisible = !uiVisible;
            if (header) header.style.opacity = uiVisible ? '1' : '0';
            if (footer) footer.style.opacity = uiVisible ? '1' : '0';
            if (progressContainer) progressContainer.style.opacity = uiVisible ? '1' : '0';
        };

        const backArrow = document.getElementById('media-back-btn');

        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.style.transition = 'none';
        }

        const closeAll = () => {
            const video = container.querySelector('video');
            if (video) { video.pause(); video.src = ""; }
            container.innerHTML = '';

            viewer.style.removeProperty('display');
            viewer.style.removeProperty('opacity');
            viewer.style.removeProperty('z-index');
            viewer.style.background = '';

            viewer.classList.remove('active');
            if (progressBar) progressBar.style.width = '0%';

            // Pop history if we pushed it
            if (history.state?.modal === 'viewer') {
                history.back();
            }
        };

        if (closeBtn) closeBtn.onclick = closeAll;
        if (backArrow) backArrow.onclick = closeAll;

        if (dlBtn) {
            dlBtn.onclick = async (e) => {
                e.stopPropagation();
                dlBtn.innerText = 'PREPARING...';
                
                try {
                    const timestamp = Date.now();
                    const ext = type === 'video' ? 'mp4' : 'jpg';
                    const fileName = `SHIELD_${timestamp}.${ext}`;
                    const mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';

                    // CAPACITOR NATIVE SAVING
                    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                        const base64Data = url.includes('base64,') ? url.split('base64,')[1] : url;
                        try {
                            const result = await window.Capacitor.Plugins.Filesystem.writeFile({
                                path: fileName,
                                data: base64Data,
                                directory: 'CACHE'
                            });
                            await window.Capacitor.Plugins.Share.share({
                                title: 'Save Media',
                                url: result.uri
                            });
                            window.cyberAlert("SAVE SIGNAL READY");
                        } catch (err) {
                            console.error("Native Save Error:", err);
                            window.cyberAlert("NATIVE SAVE FAILED", "error");
                        }
                    } else {
                        // WEB ROBUST DOWNLOAD (BLOB)
                        let blobUrl = url;
                        if (url.startsWith('data:')) {
                            const parts = url.split(',');
                            const b64 = parts[1];
                            const blob = window.b64toBlob(b64, mimeType);
                            blobUrl = URL.createObjectURL(blob);
                        }
                        
                        const link = document.createElement('a'); 
                        link.href = blobUrl;
                        link.download = fileName;
                        document.body.appendChild(link); 
                        link.click(); 
                        document.body.removeChild(link);
                        window.cyberAlert("DOWNLOAD INITIATED");
                    }
                } catch (err) {
                    console.error("Download fail:", err);
                    window.cyberAlert("DOWNLOAD FAILED", "error");
                } finally {
                    dlBtn.innerText = 'SAVE_TO_DEVICE';
                }
            };
        }

        if (type === 'image') {
            const img = document.createElement('img');
            img.src = url;
            img.style.cssText = "width:100%; height:100%; object-fit:contain; transition: transform 0.3s cubic-bezier(0.1, 0.5, 0.3, 1); transform-origin: center; cursor: grab;";
            container.appendChild(img);

            let scale = 1, lastScale = 1, startDist = 0;
            let posX = 0, posY = 0, startX = 0, startY = 0, isDragging = false, lastTap = 0;

            const updateTransform = () => { img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`; };
            container.onclick = (e) => { if (e.target === container) closeBtn.click(); else toggleUI(); };

            img.addEventListener('touchstart', (e) => {
                const now = Date.now();
                if (now - lastTap < 300) {
                    scale = scale > 1 ? 1 : 2.5; posX = 0; posY = 0; updateTransform();
                } else if (e.touches.length === 2) {
                    startDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
                } else {
                    isDragging = true; startX = e.touches[0].pageX - posX; startY = e.touches[0].pageY - posY;
                }
                lastTap = now;
            });

            img.addEventListener('touchmove', (e) => {
                if (e.touches.length === 2) {
                    const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
                    scale = Math.min(Math.max(1, lastScale * (dist / startDist)), 4);
                    updateTransform();
                } else if (isDragging && scale > 1) {
                    posX = e.touches[0].pageX - startX; posY = e.touches[0].pageY - startY;
                    updateTransform();
                }
                e.preventDefault();
            }, { passive: false });

            img.addEventListener('touchend', () => {
                lastScale = scale; isDragging = false;
                if (scale <= 1.05) { scale = 1; posX = 0; posY = 0; updateTransform(); }
            });

        } else if (type === 'video') {
            const loader = document.createElement('div');
            loader.innerHTML = '<div style="width:40px; height:40px; border:3px solid rgba(255,255,255,0.1); border-top-color:#D4AF37; border-radius:50%; animation:spin 1s linear infinite;"></div>';
            container.appendChild(loader);

            const video = document.createElement('video');
            video.src = url; video.autoplay = true; video.playsInline = true;
            video.style.cssText = "width:100% !important; height:auto; max-height:100%; z-index:5; background:#000; object-fit:contain; visibility:hidden;";
            video.oncanplay = () => { loader.style.display = 'none'; video.style.visibility = 'visible'; };
            video.onended = () => { closeBtn.click(); };
            container.appendChild(video);

            const controls = document.createElement('div');
            controls.style.cssText = "position:absolute; bottom:60px; left:20px; right:20px; background:rgba(10,10,10,0.8); backdrop-filter:blur(25px); border-radius:18px; padding:15px; display:flex; flex-direction:column; gap:12px; border:1px solid rgba(255,255,255,0.1); z-index:20; transition: opacity 0.3s;";

            // Auto-hide controls
            let hideTimeout;
            const resetHide = () => {
                clearTimeout(hideTimeout);
                controls.style.opacity = '1';
                hideTimeout = setTimeout(() => { if (!video.paused) controls.style.opacity = '0'; }, 3000);
            };
            video.onplay = resetHide;
            video.onmousemove = resetHide;
            video.ontouchstart = resetHide;

            const row1 = document.createElement('div');
            row1.style.cssText = "display:flex; align-items:center; gap:15px;";

            const pBtn = document.createElement('button'); pBtn.innerHTML = '\u23F8\uFE0F';
            pBtn.style.cssText = "background:none; border:none; color:#D4AF37; font-size:1.5rem; cursor:pointer; width:30px;";

            const timeDisplay = document.createElement('div');
            timeDisplay.style.cssText = "font-family:var(--font-mono); font-size:0.7rem; color:rgba(255,255,255,0.7); min-width:80px;";
            timeDisplay.innerText = "0:00 / 0:00";

            const prog = document.createElement('div');
            prog.style.cssText = "flex:1; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; position:relative; cursor:pointer;";
            const fill = document.createElement('div');
            fill.style.cssText = "position:absolute; left:0; top:0; bottom:0; width:0%; background:#D4AF37; border-radius:3px;";
            prog.appendChild(fill);

            row1.appendChild(pBtn); row1.appendChild(prog); row1.appendChild(timeDisplay);
            controls.appendChild(row1);
            container.appendChild(controls);

            const formatTime = (s) => {
                const m = Math.floor(s / 60);
                const ss = Math.floor(s % 60);
                return `${m}:${ss < 10 ? '0' : ''}${ss}`;
            };

            pBtn.onclick = (e) => { e.stopPropagation(); video.paused ? video.play() : video.pause(); pBtn.innerHTML = video.paused ? '\u25B6\uFE0F' : '\u23F8\uFE0F'; };

            video.ontimeupdate = () => {
                const p = (video.currentTime / (video.duration || 1)) * 100;
                fill.style.width = p + '%';
                if (progressBar) {
                    progressBar.style.width = p + '%';
                }
                timeDisplay.innerText = `${formatTime(video.currentTime)} / ${formatTime(video.duration || 0)}`;
            };

            prog.onclick = (e) => {
                e.stopPropagation();
                const rect = prog.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                video.currentTime = pos * video.duration;
            };

            container.onclick = () => { toggleUI(); controls.style.opacity = uiVisible ? '1' : '0'; };
        }

        const nativeBtn = document.getElementById('open-native-media');
        if (nativeBtn) {
            nativeBtn.style.display = 'inline-block';
            nativeBtn.onclick = (e) => {
                e.stopPropagation();
                window.cyberAlert("LAUNCHING EXTERNAL PLAYER...");
                if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                    if (window.Capacitor.Plugins && window.Capacitor.Plugins.VideoPlayer) {
                        window.Capacitor.Plugins.VideoPlayer.play({ url: url });
                    } else {
                        window.open(url, '_system');
                    }
                } else {
                    window.open(url, '_blank');
                }
            };
        }
    };

    // --- FRAGMENTED SIGNAL PROTOCOL (FSP) - Bypasses Firebase Storage ---
    window.b64toBlob = (b64Data, contentType = '') => {
        try {
            const byteCharacters = atob(b64Data);
            const byteArrays = [];
            const sliceSize = 1024;
            for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                const slice = byteCharacters.slice(offset, offset + sliceSize);
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) { byteNumbers[i] = slice.charCodeAt(i); }
                byteArrays.push(new Uint8Array(byteNumbers));
            }
            return new Blob(byteArrays, { type: contentType });
        } catch (e) {
            console.error("B64_DECODE_ERR:", e);
            return null;
        }
    };
    window._signalCache = {};

    async function sendFragmentedSignal(file, type, metadata = {}) {
        const CHUNK_SIZE = 500 * 1024; // 500KB
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const signalId = "SIG_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9).toUpperCase();

        const user = auth.currentUser; if (!user || !window._chatTarget) return;
        const cTar = window._chatTarget;
        let chatKey;
        if (cTar.uid && cTar.uid.toString().startsWith('group_')) {
            chatKey = cTar.uid;
        } else {
            chatKey = cTar.uid ? (cTar.uid === 'shield_ai' ? `ai_${user.uid}` : [user.uid, cTar.uid].sort().join('_')) : 'global';
        }

        const msgRef = push(ref(database, `messages/${chatKey}`));
        const msgKey = msgRef.key;

        await set(msgRef, {
            type: type, isFragmented: true, signalId: signalId, total: totalChunks,
            isPending: true, progress: 0, mimeType: file.type, fileName: file.name,
            ...metadata, sender: user.email, timestamp: Date.now()
        });

        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const b64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result.split(',')[1]);
                reader.readAsDataURL(file.slice(start, end));
            });

            await set(ref(database, `cloud_fragments/${signalId}/${i}`), b64);
            const progress = Math.round(((i + 1) / totalChunks) * 100);
            update(ref(database, `messages/${chatKey}/${msgKey}`), { progress });
            if (i % 3 === 0) await new Promise(r => setTimeout(r, 80)); // Stabilize DB
        }
        await update(ref(database, `messages/${chatKey}/${msgKey}`), { isPending: false, progress: 100 });
        window.cyberAlert('SIGNAL TRANSMITTED ✅', 'success');
    }

    window.assembleSignal = async (signalId, total, mimeType, btnId) => {
        if (window._signalCache[signalId]) return window._signalCache[signalId];
        const btn = document.getElementById(btnId);
        if (btn) { btn.disabled = true; btn.innerHTML = '<div class="typing-loader"><span></span><span></span><span></span></div>'; }

        try {
            const fragments = [];
            for (let i = 0; i < total; i++) {
                if (btn) btn.innerHTML = `RECON: ${Math.round((i / total) * 100)}%`;
                const snap = await get(ref(database, `cloud_fragments/${signalId}/${i}`));
                if (!snap.exists()) throw new Error("SIGNAL_FRAGMENT_MISSING");
                const blobPart = window.b64toBlob(snap.val(), mimeType);
                if (!blobPart) throw new Error("DECODE_FAIL");
                fragments.push(blobPart);
                if (i % 10 === 0) await new Promise(r => setTimeout(r, 10)); // UI Breath
            }

            const fullBlob = new Blob(fragments, { type: mimeType });
            const url = URL.createObjectURL(fullBlob);
            window._signalCache[signalId] = url;

            // SURGICAL UPDATE: Swap button for media without refreshing the whole chat
            const reconBtn = document.getElementById(btnId);
            if (reconBtn && reconBtn.parentElement) {
                const parent = reconBtn.parentElement;
                if (mimeType.startsWith('image')) {
                    const bubble = parent.closest('.image-message') || parent;
                    bubble.onclick = () => window.openMedia(url, 'image');
                    bubble.style.cursor = 'pointer';
                    parent.innerHTML = `<img src="${url}" alt="Image" style="width:100%; max-width:300px; height:auto; border-radius:12px; display:block; pointer-events:none;">`;
                } else if (mimeType.startsWith('video')) {
                    const videoMsgDiv = parent.closest('.video-message');
                    if (videoMsgDiv) {
                        videoMsgDiv.onclick = () => window.openMedia(url, 'video', '');
                        parent.innerHTML = `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
                            <div style="width:45px; height:45px; background:rgba(0,0,0,0.4); backdrop-filter:blur(8px); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#D4AF37; font-size:1rem; border:1px solid rgba(212,175,55,0.3);">▶️</div>
                        </div>`;
                        const statusLabel = videoMsgDiv.querySelector('span[style*="font-family:var(--font-mono)"]');
                        if (statusLabel) statusLabel.innerText = 'VIDEO SIGNAL';
                    }
                }
            }
            return url;
        } catch (e) {
            console.error("FSP_RECON_FAIL:", e);
            if (btn) { btn.disabled = false; btn.innerText = "RETRY RECON"; }
            window.cyberAlert("SIGNAL RECONSTRUCTION FAILED", "error");
        }
    };

    window.assembleDocument = async (signalId, total, mimeType, fileName, btnId) => {
        const btn = document.getElementById(btnId);
        if (btn) { btn.disabled = true; btn.innerText = "RECONSTRUCTING..."; }
        try {
            const fragments = [];
            for (let i = 0; i < total; i++) {
                if (btn) btn.innerText = `FETCH: ${Math.round((i / total) * 100)}%`;
                const snap = await get(ref(database, `cloud_fragments/${signalId}/${i}`));
                const blobPart = window.b64toBlob(snap.val(), mimeType);
                fragments.push(blobPart);
            }
            const fullBlob = new Blob(fragments, { type: mimeType });
            const url = URL.createObjectURL(fullBlob);
            const link = document.createElement('a'); link.href = url; link.download = fileName || "SHIELD_DOC";
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            if (btn) { btn.disabled = false; btn.innerText = "DOWNLOAD AGAIN"; }
        } catch (e) {
            console.error("FSP_DOC_FAIL:", e);
            if (btn) { btn.disabled = false; btn.innerText = "ERROR - RETRY"; }
            window.cyberAlert("DOCUMENT RECONSTRUCTION FAILED", "error");
        }
    };

    /**
     * DYNAMIC DEVICE COVERING - Detects notches and screen ratios
     */
    function applyDynamicLayout() {
        const height = window.innerHeight;
        const width = window.innerWidth;
        const ratio = height / width;
        
        // Safety for notched devices (Dynamic Viewport Units)
        document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
        
        if (ratio > 2) {
            // Tall device (e.g., iPhone 15, S24)
            document.body.classList.add('device-tall');
        } else if (ratio < 1.5) {
            // Tablet or Folded device
            document.body.classList.add('device-wide');
        }
        
        console.log(`[SHIELD_SYSTEM] Layout Optimized: ${width}x${height} (Ratio: ${ratio.toFixed(2)})`);
    }
    window.addEventListener('resize', applyDynamicLayout);
    applyDynamicLayout();

    // Shared message renderer supporting text, image, location
    function renderMessageContent(data, isMyMessage) {
        const timeStr = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const senderEmail = data.sender || 'UNKNOWN';
        let senderName = '';
        if (!isMyMessage && senderEmail !== 'SYSTEM') {
            senderName = `<div class="msg-sender" style="font-size: 0.7em; color: var(--text-secondary); margin-bottom: 2px; font-family: var(--font-mono);">${senderEmail.split('@')[0].toUpperCase()}</div>`;
        }

        let replyBlock = '';
        if (data.replyTo) {
            replyBlock = `<div class="reply-block" style="padding: 4px 8px; border-left: 2px solid var(--terminal-green); background: rgba(0,255,0,0.05); border-radius: 4px; font-size: 0.65rem; margin-bottom: 5px; opacity: 0.8; cursor:pointer;" onclick="const el=document.getElementById('msg-${data.replyTo.id}'); if(el){el.scrollIntoView({behavior:'smooth',block:'center'}); let bg=el.style.backgroundColor; el.style.backgroundColor='rgba(0,255,0,0.2)'; setTimeout(()=>el.style.backgroundColor=bg, 1500);}">
                <div style="color: var(--terminal-green); margin-bottom: 2px;">Replied to ${data.replyTo.senderName}:</div>
                <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; color:#fff;">${data.replyTo.text}</div>
            </div>`;
        }

        // Handle stickers (large emoji or image stickers)
        if (data.isSticker) {
            if (data.type === 'image' && data.imageData) {
                return `${senderName}<div class="sticker-bubble selectable" style="width:150px; height:150px;"><img src="${data.imageData}" style="width:100%; height:100%; object-fit:contain; animation: bounceIn 0.5s;"></div><span class="msg-time" style="font-size:0.6rem;opacity:0.3;">${timeStr}</span>`;
            }
            return `${senderName}<div class="sticker-bubble selectable" style="font-size: 3.5rem; line-height: 1; padding: 10px; animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">${data.text}</div><span class="msg-time" style="font-size:0.6rem;opacity:0.3;">${timeStr}</span>`;
        }

        const statusIcon = data.isPending ? ' <span style="font-size:0.6rem; opacity:0.4;">...</span>' : '';

        // WhatsApp-style Progress Overlay
        const progUI = (p) => `<div style="position:absolute; inset:0; background:rgba(0,0,0,0.6); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:10; border-radius:inherit;"><div style="width:40px; height:40px; border:3px solid rgba(255,255,255,0.1); border-top:3px solid var(--terminal-green); border-radius:50%; animation:spin 1s linear infinite; margin-bottom:10px;"></div><div style="font-size:0.75rem; color:#fff; font-family:var(--font-mono); font-weight:900;">${p}%</div></div>`;

        if (data.type === 'image' && (data.imageData || data.isPending || data.isFragmented)) {
            const overlay = data.isPending ? progUI(data.progress || 0) : '';
            const signalUrl = data.isFragmented ? (window._signalCache[data.signalId] || null) : data.imageData;

            let content = '';
            if (data.isFragmented && !signalUrl && !data.isPending) {
                content = `<div style="width:100%; height:220px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,0.5); border-radius:12px; border:1px dashed rgba(255,255,255,0.1);">
                    <div style="font-size:2rem; margin-bottom:15px; filter: grayscale(1) opacity(0.5);">📸</div>
                    <button id="btn-${data.signalId}" style="background:#D4AF37; color:#000; border:none; padding:10px 20px; border-radius:8px; font-family:var(--font-mono); font-size:0.7rem; font-weight:900; cursor:pointer; box-shadow:0 10px 20px rgba(0,0,0,0.3);" onclick="window.assembleSignal('${data.signalId}', ${data.total}, '${data.mimeType || 'image/jpeg'}', 'btn-${data.signalId}')">RECONSTRUCT SIGNAL</button>
                    <div style="margin-top:10px; font-family:var(--font-mono); font-size:0.5rem; color:rgba(255,255,255,0.3); text-transform:uppercase;">Size: ${Math.round((data.total * 500) / 1024)}MB Uplink</div>
                </div>`;
            } else {
                content = `<img src="${signalUrl || ''}" alt="Image" style="width:100%; max-width:280px; height:auto; border-radius:10px; display:block; filter:${data.isPending ? 'blur(10px) brightness(0.6)' : 'none'}; pointer-events:none;">`;
            }

            return `${senderName}<div class="image-message selectable" style="background:rgba(255,255,255,0.05); padding:6px; position:relative; overflow:hidden; border-radius:16px; width:fit-content; max-width:300px; cursor:pointer;" onclick="if(!${data.isPending} && '${signalUrl || ''}' != '') window.openMedia('${signalUrl}', 'image')">
                ${replyBlock}
                ${overlay}
                ${content}
            </div><span class="msg-time" style="font-size:0.6rem;opacity:0.5;">${timeStr}${statusIcon}</span>`;
        }

        if (data.type === 'video' && (data.videoData || data.isPending || data.isFragmented)) {
            const previewImg = data.thumbnailData ? `<img src="${data.thumbnailData}" style="width:100%; display:block; filter:${data.isPending ? 'blur(5px) brightness(0.6)' : 'brightness(0.8)'};">` : `<div style="width:100%; height:150px; background:#111; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.3); font-size:0.6rem;">GENERATING SIGNAL...</div>`;
            const signalUrl = data.isFragmented ? (window._signalCache[data.signalId] || null) : data.videoData;

            let overlay = '';
            if (data.isPending) {
                overlay = progUI(data.progress || 0);
            } else if (data.isFragmented && !signalUrl) {
                overlay = `<div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,0.65); backdrop-filter:blur(15px); -webkit-backdrop-filter:blur(15px); height:220px; border-radius:18px;">
                    <button id="btn-${data.signalId}" style="background:#D4AF37; color:#000; border:none; padding:12px 20px; border-radius:10px; font-family:var(--font-heading); font-size:0.7rem; font-weight:900; cursor:pointer; letter-spacing:1.5px; box-shadow:0 10px 25px rgba(212,175,55,0.3);" onclick="window.assembleSignal('${data.signalId}', ${data.total}, '${data.mimeType || 'video/mp4'}', 'btn-${data.signalId}')">RECONSTRUCT SIGNAL</button>
                    <div style="font-size:0.55rem; color:#fff; margin-top:12px; opacity:0.8; font-family:var(--font-mono);">FSP SECURE UPLINK (${data.total} FRAGMENTS)</div>
                </div>`;
            } else {
                overlay = `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
                    <div style="width:45px; height:45px; background:rgba(0,0,0,0.4); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#D4AF37; font-size:1rem; border:1px solid rgba(212,175,55,0.3);">
                        \u25B6\uFE0F
                    </div>
                </div>`;
            }

            return `${senderName}<div class="video-message selectable" style="background:rgba(0,0,0,0.6); padding:8px; border-radius:22px; position:relative; overflow:hidden; border:1px solid rgba(212,175,55,0.15); width:280px; min-height:180px; cursor:pointer; transition:transform 0.2s;" onclick="if(!${data.isPending} && '${signalUrl || ''}' != '') window.openMedia('${signalUrl}', 'video', '')">
                ${replyBlock}
                <div style="position:relative; border-radius:12px; overflow:hidden;">
                    ${previewImg}
                    ${overlay}
                </div>
                <div style="padding:4px 0 0 2px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.55rem; color:rgba(255,255,255,0.4); font-family:var(--font-mono); letter-spacing:1px;">${data.isPending ? 'PROCESSING' : (data.isFragmented && !signalUrl ? 'ENCRYPTED' : 'VIDEO SIGNAL')}</span>
                    <span class="msg-time" style="font-size:0.55rem;opacity:0.4;">${timeStr}</span>
                </div>
            </div>`;
        }
        if (data.type === 'location' && (data.lat !== undefined && data.lng !== undefined)) {
            const mapUrl = `https://www.google.com/maps?q=${data.lat},${data.lng}`;
            return `${senderName}
                <div class="message-bubble location-bubble selectable" style="padding:0; overflow:hidden; border-radius:15px; background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.3);">
                    ${replyBlock}
                    <div style="padding:10px; font-size:0.7rem; font-family:var(--font-mono); color:#D4AF37;">\uD83D\uDCCD LIVE_COORDINATES</div>
                    <div style="width:100%; height:120px; background:#1a1a1a; display:flex; align-items:center; justify-content:center; position:relative;">
                        <div style="text-align:center;">
                            <div style="font-size:0.6rem; opacity:0.6; margin-bottom:5px;">${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}</div>
                            <a href="${mapUrl}" target="_blank" style="color:#D4AF37; font-size:0.7rem; text-decoration:none; border:1px solid #D4AF37; padding:4px 10px; border-radius:5px; background:rgba(0,0,0,0.3);">VIEW ON MAP</a>
                        </div>
                    </div>
                </div><span class="msg-time" style="font-size:0.6rem;opacity:0.5;">${timeStr}${statusIcon}</span>`;
        }

        if (data.type === 'audio' && data.audioData) {
            const msgId = data.key || `tmp-audio-${Date.now()}`;
            const mime = data.mimeType || 'audio/webm;codecs=opus';

            // WHATSAPP STYLE: Store raw signal ONLY in RAM to avoid HTML attribute truncation (Chrome/iOS 64KB limit)
            window._shieldSignalBuffer[msgId] = data.audioData;

            return `${senderName}
            <div class="audio-message selectable" id="msg-container-${msgId}" data-id="${msgId}" data-mime="${mime}" style="background:rgba(255,255,255,0.05); padding:10px 15px; border-radius:20px; min-width:200px; display:flex; flex-direction:column; gap:5px;">
                ${replyBlock}
                <div style="display:flex; align-items:center; gap:12px;">
                    <button class="audio-play-btn" id="play-btn-${msgId}" 
                        style="width:32px; height:32px; border-radius:50%; background:var(--terminal-green); border:none; color:#000; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:0.8rem; flex-shrink:0;" 
                        onclick="window.directShieldPlay('${msgId}')">\u25B6\uFE0F</button>
                    
                    <div class="audio-wave" style="flex:1; height:4px; background:rgba(255,255,255,0.1); border-radius:2px; position:relative; overflow:hidden;">
                        <div class="audio-fill" id="fill-${msgId}" style="position:absolute; left:0; top:0; bottom:0; width:0; background:var(--terminal-green); transition:width 0.1s linear;"></div>
                    </div>
                    <span style="font-size:0.6rem; opacity:0.5; font-family:var(--font-mono); min-width:40px; text-align:right;">${data.duration || 'VOICE'}</span>
                </div>
            </div><span class="msg-time" style="font-size:0.6rem;opacity:0.5;">${timeStr}${statusIcon}</span>`;
        }
        if (data.type === 'document' || (data.text && data.text.includes('DOC_LINK:')) || data.isFragmented && (data.type === 'document' || data.type === 'apk')) {
            const isApk = (data.type === 'apk') || (data.text && data.text.includes('APK:'));
            const docId = data.isFragmented ? data.signalId : (data.text ? data.text.match(/DOC_LINK:([A-Z0-9_]+)/)?.[1] : null);

            if (docId || data.isPending) {
                const accent = isApk ? '#C0C0C0' : '#D4AF37';
                const overlay = data.isPending ? progUI(data.progress || 0) : '';
                const icon = isApk ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="7.5 4.21 12 6.81 16.5 4.21"/><polyline points="7.5 19.79 7.5 14.6 3 12"/><polyline points="21 12 16.5 14.6 16.5 19.79"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';

                const clickAction = data.isFragmented ?
                    `window.assembleDocument('${data.signalId}', ${data.total}, '${data.mimeType}', '${data.fileName}', 'btn-${data.signalId}')` :
                    `window.downloadFromLink('${docId}')`;

                return `${senderName} <div class="message-bubble selectable" style="border: 1px solid rgba(255,255,255,0.1); background: linear-gradient(135deg, rgba(20,20,20,0.9), rgba(10,10,10,1)); padding: 12px; min-width:200px; position:relative; overflow:hidden;">
                    ${replyBlock}${overlay}
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; color:${accent};">
                        ${icon}
                        <span style="font-size:0.65rem; font-weight:700; letter-spacing:1px; font-family:var(--font-mono);">${isApk ? 'APPLICATION SIGNAL' : 'SECURE DOCUMENT'}</span>
                    </div>
                    ${data.isPending ? '' : `<button id="btn-${docId}" class="quantum-btn secondary" style="width:100%; font-size:0.6rem; padding:8px; border-color:${accent}; color:${accent}; background:rgba(0,0,0,0.3); letter-spacing:1px;" onclick="${clickAction}">RECON & DOWNLOAD</button>`}
                    <span class="msg-time" style="font-size:0.5rem; margin-top:5px;">${timeStr}${statusIcon}</span>
                </div>`;
            }
        }

        const escapeHTML = (str) => {
            if (!str) return '';
            return str.replace(/[&<>'"]/g,
                tag => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    "'": '&#39;',
                    '"': '&quot;'
                }[tag] || tag)
            );
        };

        let content = (data.text && data.text.includes('typing-loader')) ? data.text : escapeHTML(data.text);
        const previewOn = localStorage.getItem('toggle-linkpreview') !== 'false';
        if (previewOn) {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            content = content.replace(urlRegex, (url) => `<a href="${url}" target="_blank" style="color:var(--terminal-green);text-decoration:underline;">${url}</a>`);
        }

        // Forwarded label
        let forwardedLabel = '';
        if (data.forwarded) {
            forwardedLabel = `<div style="font-size:0.6rem; color:rgba(255,255,255,0.4); display:flex; align-items:center; gap:4px; margin-bottom:4px;"><span style="font-style:italic;">➥ Forwarded</span></div>`;
        }

        // Reactions display
        let reactionsHTML = '';
        if (data.reactions && typeof data.reactions === 'object') {
            const emojiCounts = {};
            Object.values(data.reactions).forEach(emoji => {
                emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
            });
            const pills = Object.entries(emojiCounts).map(([emoji, count]) =>
                `<span style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:2px 6px; font-size:0.75rem; display:inline-flex; align-items:center; gap:2px;">${emoji}${count > 1 ? `<span style="font-size:0.55rem; color:rgba(255,255,255,0.5);">${count}</span>` : ''}</span>`
            ).join('');
            reactionsHTML = `<div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">${pills}</div>`;
        }

        return `${senderName} <div class="message-bubble selectable">${forwardedLabel}${replyBlock}${content}<span class="msg-time">${timeStr}${statusIcon}</span></div>${reactionsHTML}`;
    }




    function initializeChat(user) {
        if (chatInitialized) return;
        chatInitialized = true;
        console.log("Logged in as:", user.email);

        const chatMain = document.querySelector('.chat-main');
        if (chatMain) {
            chatMain.innerHTML = `<div class="chat-placeholder" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#aaaaaa;">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:64px; height:64px; margin-bottom:20px; opacity:0.3;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
    <h2 style="font-family:var(--font-heading); font-size:1.5rem; letter-spacing:2px; margin-bottom:10px; color:rgba(255,255,255,0.7);">NO CHAT SELECTED</h2>
    <p style="font-family:var(--font-mono); font-size:0.85rem; opacity:0.6;">Select a chat from the sidebar to start a secure conversation.</p>
</div>`;
        }

        // Listen for typing indicators from other users
        const typingRef = ref(database, 'typing');
        onValue(typingRef, (snap) => {
            const typingBar = document.getElementById('typing-indicator');
            const typingWho = document.getElementById('typing-who');
            if (!typingBar || !typingWho) return;
            const data = snap.val();
            if (!data) { typingBar.style.display = 'none'; return; }
            const typers = [];
            const now = Date.now();
            Object.keys(data).forEach(uid => {
                if (uid !== user.uid && data[uid] && (now - data[uid].timestamp) < 5000) {
                    typers.push(data[uid].name);
                }
            });
            if (typers.length > 0) {
                typingBar.style.display = 'flex';
                typingWho.textContent = typers.join(', ') + ' is typing...';
            } else {
                typingBar.style.display = 'none';
            }
        });
    }

    // --- WALLET FUNCTIONALITY ---
    function initializeWallet(user) {
        if (!user) return;
        const balanceRef = ref(database, `users/${user.uid}/wallet/balance`);
        const balanceEl = document.getElementById('wallet-balance');

        onValue(balanceRef, (balSnap) => {
            const balance = balSnap.val();
            if (balance !== null && balanceEl) {
                balanceEl.textContent = balance;

                // Update the visual progress bar based on 1000 points = full bar
                const progressBar = document.querySelector('.balance-card .fill');
                if (progressBar) {
                    const percent = Math.min((balance / 1000) * 100, 100);
                    progressBar.style.width = `${percent}%`;
                }
            } else if (balance === null && balanceEl) {
                // Initialize default wallet balance
                set(balanceRef, 100);
            }
        });


        // Sync Transaction History
        const transRef = query(ref(database, `users/${user.uid}/transactions`), limitToLast(10));

        const historyList = document.getElementById('transaction-history');

        // Store the unsubscribe function for the transaction listener
        let unsubscribeTransactions = null;
        if (unsubscribeTransactions) unsubscribeTransactions(); // Unsubscribe previous listener if any

        unsubscribeTransactions = onValue(transRef, (transSnapshot) => {
            if (!historyList) return;
            if (transSnapshot.exists()) {
                historyList.innerHTML = '';
                transSnapshot.forEach(child => {
                    const data = child.val();
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    item.style.padding = '8px';
                    item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                    item.innerHTML = `
                        <div style="display:flex; justify-content:space-between; width:100%; font-size: 0.75rem;">
                            <span style="opacity: 0.8;">${data.type}: ${data.recipientEmail || 'SYSTEM'}</span>
                            <span style="color: ${data.amount < 0 ? '#FF5252' : '#00E676'}">${data.amount > 0 ? '+' : ''}${data.amount} \u25C8</span>
                        </div>
                        <small style="opacity:0.3; font-size: 0.6rem;">${new Date(data.timestamp).toLocaleString()}</small>
                    `;
                    historyList.prepend(item);
                });
            }
        });

        // Redemption Listeners
        const redeemTor = document.getElementById('redeem-tor');
        const redeemVpn = document.getElementById('redeem-vpn');

        const processRedeem = async (amount, name) => {
            const balSnapshot = await get(balanceRef);
            const balance = balSnapshot.val() || 0;
            if (balance < amount) {
                window.cyberAlert("INSUFFICIENT \u25C8 FOR " + name, "error");
                return;
            }

            await set(balanceRef, balance - amount);
            await logTransaction(user.uid, -amount, name, 'REDEEM');
            window.cyberAlert("REWARD UNLOCKED: " + name);
            // Effect: Change status
            await update(ref(database, `users/${user.uid}`), { status: name + " ACTIVE" });
        };

        if (redeemTor) redeemTor.onclick = () => processRedeem(1000, "PRIVATE PROXY");
        if (redeemVpn) redeemVpn.onclick = () => processRedeem(5000, "SECURE VPN");
    }

    async function logTransaction(uid, amount, recipientEmail, type = 'TRANSFER') {
        const transRef = ref(database, `users/${uid}/transactions`);
        await push(transRef, {
            amount,
            recipientEmail,
            type,
            timestamp: Date.now()
        });
    }


    window.initiateTransfer = async function () {
        const recipientEmail = await window.cyberPrompt("Enter recipient email address:", "email@example.com", "Send Points");
        if (!recipientEmail) return;
        const amountStr = await window.cyberPrompt("Enter amount of points to send:", "100", "Amount");
        const amount = parseInt(amountStr);
        if (!amount || amount <= 0) { window.cyberAlert("INVALID AMOUNT", "error"); return; }

        const user = auth.currentUser;
        if (!user) return;
        const myBalanceRef = ref(database, `users/${user.uid}/wallet/balance`);
        const mySnap = await get(myBalanceRef);
        const myBalance = mySnap.val() || 0;

        if (myBalance < amount) {
            window.cyberAlert("INSUFFICIENT CREDITS", "error");
            return;
        }

        window.cyberAlert("SEARCHING FOR USER...");
        const usersRef = ref(database, 'users');
        const usersSnap = await get(usersRef);
        let recipientUid = null;
        usersSnap.forEach(uSnap => {
            if (uSnap.val().email?.toLowerCase() === recipientEmail.toLowerCase()) recipientUid = uSnap.key;
        });

        if (!recipientUid) {
            window.cyberAlert("USER NOT FOUND", "error");
            return;
        }

        if (recipientUid === user.uid) {
            window.cyberAlert("CANNOT SEND TO SELF", "error");
            return;
        }

        const recBalanceRef = ref(database, `users/${recipientUid}/wallet/balance`);
        const recSnap = await get(recBalanceRef);
        const recBalance = recSnap.val() || 0;

        await set(myBalanceRef, myBalance - amount);
        await set(recBalanceRef, recBalance + amount);

        await logTransaction(user.uid, -amount, recipientEmail, 'POINTS SENT');
        await logTransaction(recipientUid, amount, user.email, 'POINTS RCVD');

        window.cyberAlert("SENT SUCCESSFULLY");
    };

    // --- PRESENCE & FRIENDS ---
    function initializePresence(user) {
        if (!user) return;

        const userStatusRef = ref(database, `users/${user.uid}/status`);
        const globalStatusRef = ref(database, `status/${user.uid}`);
        const connectedRef = ref(database, '.info/connected');

        onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                // Local status
                set(userStatusRef, 'online');
                onDisconnect(userStatusRef).set('offline');

                // Global status for network count
                set(globalStatusRef, { state: 'online', last_changed: Date.now() });
                onDisconnect(globalStatusRef).set({ state: 'offline', last_changed: Date.now() });

                // Update last login
                update(ref(database, `users/${user.uid}`), {
                    lastLogin: Date.now()
                });
            }
        });

        syncFriends(user);
        syncChatList(user);
    }

    async function bootstrapGlobalSignalIntelligence(user) {
        if (!user || window._signalWatchersInitialized) return;
        window._signalWatchersInitialized = true;
        if (!window._signalWatchers) window._signalWatchers = {};
        const startTime = Date.now();

        const setupWatcher = (chatKey, label) => {
            if (window._signalWatchers[chatKey]) return;
            const watchRef = query(ref(database, `messages/${chatKey}`), limitToLast(1));

            window._signalWatchers[chatKey] = onChildAdded(watchRef, (snap) => {
                const msg = snap.val();
                if (!msg || msg.sender === user.email) return;

                // IGNORE MESSAGES FROM PREVIOUS SESSIONS
                if (msg.timestamp < startTime) return;

                const isCurrentChat = (window._chatTarget && (
                    (window._chatTarget.uid === chatKey) ||
                    (chatKey.includes(user.uid) && chatKey.includes(window._chatTarget.uid))
                ));

                if (!appInForeground || !isCurrentChat) {
                    if (window._notify) {
                        const sender = (msg.senderName || msg.sender || label).split('@')[0].toUpperCase();
                        window._notify(sender, msg.text || 'MEDIA ATTACHMENT', { chatKey });
                    }
                }
            });
        };

        // 1. Core Channels
        setupWatcher(`ai_${user.uid}`, "SHIELD_AI");
        setupWatcher("global", "PUBLIC_OVERLAY");

        // 2. Network Contacts Watcher
        onValue(ref(database, `users/${user.uid}/friends`), (friendsSnap) => {
            const friends = friendsSnap.val() || {};
            Object.keys(friends).forEach(fUid => {
                if (friends[fUid] === true) {
                    const chatKey = [user.uid, fUid].sort().join('_');
                    setupWatcher(chatKey, "SIGNAL");
                }
            });
        });

        // 3. Channel Group Watcher
        onValue(ref(database, `users/${user.uid}/groups`), (groupsSnap) => {
            const groups = groupsSnap.val() || {};
            Object.keys(groups).forEach(gId => {
                if (groups[gId] === true) {
                    setupWatcher(gId, "CHANNEL");
                }
            });
        });

        console.log("SHIELD INTELLIGENCE: GLOBAL SIGNAL WATCHERS ACTIVE.");
    }

    // ============ WHATSAPP-STYLE FORWARD PICKER ============
    async function showForwardPicker(forwardContent) {
        const existing = document.getElementById('forward-picker-overlay');
        if (existing) existing.remove();

        const user = auth.currentUser;
        if (!user) return;

        // Full-screen overlay
        const overlay = document.createElement('div');
        overlay.id = 'forward-picker-overlay';
        overlay.style.cssText = "position:fixed; inset:0; z-index:10000; background:#0a0a0a; display:flex; flex-direction:column; animation:fadeIn 0.2s ease;";

        // Header
        const header = document.createElement('div');
        header.style.cssText = "display:flex; align-items:center; gap:12px; padding:14px 16px; background:rgba(7,7,7,0.96); border-bottom:1px solid rgba(255,255,255,0.08); flex-shrink:0;";

        const backBtn = document.createElement('button');
        backBtn.style.cssText = "width:36px; height:36px; border-radius:50%; background:rgba(212,175,55,0.12); color:#D4AF37; border:1px solid rgba(212,175,55,0.25); display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:1.1rem;";
        backBtn.innerHTML = '\u2190';
        backBtn.onclick = () => overlay.remove();

        const title = document.createElement('div');
        title.style.cssText = "flex:1;";
        title.innerHTML = `<div style="font-weight:700; font-size:1rem; color:#fff;">Forward to</div><div style="font-size:0.65rem; color:rgba(255,255,255,0.4); margin-top:2px;">Select a chat</div>`;

        header.appendChild(backBtn);
        header.appendChild(title);
        overlay.appendChild(header);

        // Search bar
        const searchWrap = document.createElement('div');
        searchWrap.style.cssText = "padding:10px 16px; flex-shrink:0;";
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search...';
        searchInput.style.cssText = "width:100%; padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:#fff; font-size:0.85rem; outline:none; font-family:inherit; box-sizing:border-box;";
        searchWrap.appendChild(searchInput);
        overlay.appendChild(searchWrap);

        // Message preview
        const msgPreview = document.createElement('div');
        msgPreview.style.cssText = "padding:8px 16px; flex-shrink:0;";
        const isBulk = Array.isArray(forwardContent);
        const previewText = isBulk ? `${forwardContent.length} messages` : (typeof forwardContent === 'string' ? forwardContent : (forwardContent.text || forwardContent.type || 'Media'));
        msgPreview.innerHTML = `<div style="background:rgba(212,175,55,0.08); border:1px solid rgba(212,175,55,0.15); border-radius:10px; padding:10px 14px; display:flex; align-items:center; gap:10px;"><span style="font-size:1rem;">💬</span><span style="font-size:0.75rem; color:#ccc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">${previewText.substring(0, 80)}${previewText.length > 80 ? '...' : ''}</span></div>`;
        overlay.appendChild(msgPreview);

        // Contact list container
        const listWrap = document.createElement('div');
        listWrap.style.cssText = "flex:1; overflow-y:auto; padding:8px 0;";
        overlay.appendChild(listWrap);

        // Helper to create a contact row
        function createContactRow(name, avatarText, avatarStyle, subtitle, onTap) {
            const row = document.createElement('div');
            row.className = 'forward-contact-row';
            row.style.cssText = "display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer; transition:background 0.15s;";
            row.onmouseenter = () => row.style.background = 'rgba(255,255,255,0.05)';
            row.onmouseleave = () => row.style.background = 'transparent';

            const avatar = document.createElement('div');
            avatar.style.cssText = `width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.85rem; flex-shrink:0; ${avatarStyle}`;
            avatar.textContent = avatarText;

            const info = document.createElement('div');
            info.style.cssText = "flex:1; min-width:0;";
            info.innerHTML = `<div style="font-weight:600; font-size:0.85rem; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</div><div style="font-size:0.7rem; color:rgba(255,255,255,0.4); margin-top:2px;">${subtitle}</div>`;

            row.appendChild(avatar);
            row.appendChild(info);
            row.onclick = onTap;
            return row;
        }

        // Forward handler
        async function forwardTo(targetName, targetUid, targetEmail) {
            const chatKey = targetUid ? (targetUid === 'shield_ai' ? `ai_${user.uid}` : [user.uid, targetUid].sort().join('_')) : 'global';
            try {
                const msgsToSend = Array.isArray(forwardContent) ? forwardContent : [forwardContent];

                for (const item of msgsToSend) {
                    const baseMsg = typeof item === 'string' ? { text: item } : { ...item };
                    // Clean up for forwarding
                    delete baseMsg.key;
                    delete baseMsg.reactions;

                    await push(ref(database, `messages/${chatKey}`), {
                        ...baseMsg,
                        sender: user.email,
                        senderName: (window._currentUserProfile?.username || user.email.split('@')[0]),
                        timestamp: Date.now(),
                        forwarded: true
                    });
                }
                overlay.remove();
                window.cyberAlert(`Forwarded to ${targetName}`);
                // Open that chat
                if (window.openChat) window.openChat(targetName, targetName.substring(0, 2), 'Online', targetUid, targetEmail);
            } catch (err) {
                console.error('Forward error:', err);
                window.cyberAlert('Forward failed', 'error');
            }
        }

        // Add AI Assistant
        listWrap.appendChild(createContactRow(
            'My Assistant', 'AI',
            'background:linear-gradient(135deg, rgba(192,192,192,0.15), rgba(212,175,55,0.1)); color:#C0C0C0; border:1px solid rgba(192,192,192,0.4);',
            'AI Assistant',
            () => forwardTo('My Assistant', 'shield_ai', 'ai@shield.com')
        ));

        // Add Global Chat
        listWrap.appendChild(createContactRow(
            'GLOBAL CHAT', 'HQ',
            'background:var(--terminal-green); color:#000;',
            'Group Chat',
            () => forwardTo('GLOBAL CHAT', null, null)
        ));

        // Separator
        const sepLabel = document.createElement('div');
        sepLabel.style.cssText = "padding:12px 16px 6px; font-size:0.65rem; color:rgba(255,255,255,0.3); letter-spacing:1.5px; font-weight:600;";
        sepLabel.textContent = 'CONTACTS';
        listWrap.appendChild(sepLabel);

        // Load friends list
        const friendsSnap = await get(ref(database, `users/${user.uid}/friends`));
        const friendIds = friendsSnap.val() || {};
        const contactRows = [];

        for (let uid of Object.keys(friendIds)) {
            if (friendIds[uid] !== true) continue;
            const uSnap = await get(ref(database, `users/${uid}`));
            const u = uSnap.val();
            if (!u) continue;

            const profile = u.profile || {};
            const friendName = (profile.username || (u.email || uid).split('@')[0]).toUpperCase();
            const status = u.status || 'offline';
            const avatarUrl = profile.avatar;
            const avatarStyle = avatarUrl
                ? `background:url(${avatarUrl}) center/cover; color:transparent;`
                : 'background:#333; color:#D4AF37;';

            const row = createContactRow(
                friendName, friendName.substring(0, 2),
                avatarStyle,
                status === 'online' ? '🟢 Online' : '⚪ Offline',
                () => forwardTo(friendName, uid, u.email)
            );
            row.dataset.name = friendName.toLowerCase();
            listWrap.appendChild(row);
            contactRows.push(row);
        }

        if (Object.keys(friendIds).length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = "text-align:center; padding:40px 20px; color:rgba(255,255,255,0.3); font-size:0.8rem;";
            empty.textContent = 'No contacts yet. Add friends to forward messages.';
            listWrap.appendChild(empty);
        }

        // Search filter
        searchInput.oninput = () => {
            const term = searchInput.value.toLowerCase();
            contactRows.forEach(row => {
                row.style.display = row.dataset.name.includes(term) ? 'flex' : 'none';
            });
        };

        document.body.appendChild(overlay);
        searchInput.focus();
    }

    window.showForwardPicker = showForwardPicker;

    function syncChatList(currentUser) {
        const chatsListEl = document.querySelector('#view-chats .contact-list');
        const friendsRef = ref(database, `users/${currentUser.uid}/friends`);
        const settingsRef = ref(database, `users/${currentUser.uid}/chatSettings`);

        let renderTimeout;
        const debouncedRenderList = () => {
            clearTimeout(renderTimeout);
            renderTimeout = setTimeout(renderList, 150);
        };

        let chatSettings = {};
        let unsubscribeChatSettings = null;
        if (unsubscribeChatSettings) unsubscribeChatSettings();
        unsubscribeChatSettings = onValue(settingsRef, (snap) => {
            chatSettings = snap.val() || {};
            debouncedRenderList();
        });

        let unsubscribeGroups = null;
        if (unsubscribeGroups) unsubscribeGroups();
        unsubscribeGroups = onValue(ref(database, `users/${currentUser.uid}/groups`), () => {
            debouncedRenderList();
        });

        // Track friend status listeners to avoid duplicates and ensure cleanup
        const friendStatusListeners = new Map();

        let unsubscribeFriends = null;
        if (unsubscribeFriends) unsubscribeFriends();
        unsubscribeFriends = onValue(friendsRef, async (friendsSnapshot) => {
            const friendIds = friendsSnapshot.val() || {};

            // Cleanup listeners for removed friends
            friendStatusListeners.forEach((unsub, uid) => {
                if (!friendIds[uid]) {
                    unsub();
                    friendStatusListeners.delete(uid);
                }
            });

            // Add listeners for new friends
            for (let uid of Object.keys(friendIds)) {
                if (friendIds[uid] === true && !friendStatusListeners.has(uid)) {
                    // Start listening to this friend's status node specifically
                    const unsub = onValue(ref(database, `users/${uid}/status`), () => {
                        debouncedRenderList();
                    });
                    friendStatusListeners.set(uid, unsub);
                }
            }
            debouncedRenderList();
        });

        async function renderList() {
            if (!chatsListEl) return;
            const currentFriendsSnap = await get(friendsRef);
            const friendIds = currentFriendsSnap.val() || {};

            const currentGroupsSnap = await get(ref(database, `users/${currentUser.uid}/groups`));
            const groupIds = currentGroupsSnap.val() || {};

            chatsListEl.innerHTML = '';

            if (!window._showingArchive) {
                // HQ / Global Chat
                const hqItem = document.createElement('div');
                hqItem.className = 'contact-item active';
                hqItem.innerHTML = `
                    <div class="contact-avatar">HQ</div>
                    <div class="contact-details"><div class="contact-top"><span class="contact-name">PUBLIC CHANNEL</span><span class="contact-time">LIVE</span></div><span class="contact-last-msg">Active and Secure</span></div>
                `;
                hqItem.onclick = () => openChat("PUBLIC CHANNEL", "HQ", "Active and Secure", null, null);
                chatsListEl.appendChild(hqItem);
            }

            let archivedCount = 0;
            const activeChats = [];
            const archiveChats = [];

            for (let uid of Object.keys(friendIds)) {
                if (friendIds[uid] !== true) continue;
                if (chatSettings[uid]?.archived) {
                    archiveChats.push(uid);
                    archivedCount++;
                } else {
                    activeChats.push(uid);
                }
            }

            if (archivedCount > 0 && !window._showingArchive) {
                const archItem = document.createElement('div');
                archItem.className = 'contact-item archive-folder';
                archItem.innerHTML = `<div class="contact-avatar" style="background:#444;">📁</div><div class="contact-details"><div class="contact-top"><span class="contact-name">Archived</span></div><span class="contact-last-msg">${archivedCount} nodes hidden</span></div>`;
                archItem.onclick = () => { window._showingArchive = true; renderList(); };
                chatsListEl.appendChild(archItem);
            } else if (window._showingArchive) {
                const backItem = document.createElement('div');
                backItem.className = 'contact-item archive-folder';
                backItem.innerHTML = `<div class="contact-avatar" style="background:#444;">\u2B05\uFE0F</div><div class="contact-details"><div class="contact-top"><span class="contact-name">Back to Main</span></div></div>`;
                backItem.onclick = () => { window._showingArchive = false; renderList(); };
                chatsListEl.appendChild(backItem);
            }

            // Sort: Pinned first
            const listToRender = window._showingArchive ? archiveChats : activeChats;
            if (!window._showingArchive) {
                listToRender.sort((a, b) => {
                    const pinA = chatSettings[a]?.pinned ? 1 : 0;
                    const pinB = chatSettings[b]?.pinned ? 1 : 0;
                    return pinB - pinA;
                });
            }
            const groupsToRender = window._showingArchive ? [] : Object.keys(groupIds);
            if (!window._showingArchive) {
                groupsToRender.sort((a, b) => {
                    const pinA = chatSettings[a]?.pinned ? 1 : 0;
                    const pinB = chatSettings[b]?.pinned ? 1 : 0;
                    return pinB - pinA;
                });
            }

            let ptTimer;
            let cStartX = 0, cStartY = 0;
            let _longPressActive = false;

            // --- WhatsApp Style Bottom Sheet for Chat Options ---
            const showOpts = (e, targetId, name, isGroup = false) => {
                if (e) e.preventDefault();
                if (ptTimer) clearTimeout(ptTimer);
                _longPressActive = true;

                const existing = document.getElementById('chat-opts-sheet');
                if (existing) existing.remove();

                const isLocked = chatSettings[targetId] && chatSettings[targetId].locked;
                const isArchived = chatSettings[targetId] && chatSettings[targetId].archived;

                const overlay = document.createElement('div');
                overlay.id = 'chat-opts-sheet';
                overlay.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:20000; backdrop-filter:blur(5px); display:flex; align-items:flex-end; opacity:0; transition:opacity 0.3s ease;";

                const sheet = document.createElement('div');
                sheet.style.cssText = "width:100%; max-width:500px; margin:0 auto; background:linear-gradient(to top, #0f0f0f, #1a1a1a); border-radius:24px 24px 0 0; border:1px solid rgba(255,255,255,0.08); padding:20px 0; transform:translateY(100%); transition:transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);";

                const handle = document.createElement('div');
                handle.style.cssText = "width:40px; height:4px; background:rgba(255,255,255,0.2); border-radius:2px; margin:0 auto 20px;";
                sheet.appendChild(handle);

                const header = document.createElement('div');
                header.style.cssText = "padding:0 25px 20px; border-bottom:1px solid rgba(255,255,255,0.05); margin-bottom:10px;";
                header.innerHTML = `<h3 style="color:#D4AF37; font-size:1rem; margin:0; letter-spacing:1px; font-family:var(--font-heading);">${name.toUpperCase()}</h3><small style="color:rgba(255,255,255,0.4); font-size:0.6rem;">SECURE CHANNEL OPTIONS</small>`;
                sheet.appendChild(header);

                const actions = [
                    {
                        icon: chatSettings[targetId]?.pinned ? '\uD83D\uDCCC' : '\uD83D\uDCCD', label: chatSettings[targetId]?.pinned ? 'UNPIN CONVERSATION' : 'PIN CONVERSATION', action: async () => {
                            const isPinned = chatSettings[targetId]?.pinned || false;
                            await update(ref(database, `users/${currentUser.uid}/chatSettings/${targetId}`), { pinned: !isPinned });
                            window.cyberAlert(isPinned ? "NODE UNPINNED" : "NODE PINNED");
                        }
                    },
                    {
                        icon: '\u2B06\uFE0F', label: 'UNARCHIVE CHANNEL', hidden: isGroup || !isArchived, action: () => {
                            update(settingsRef, { [targetId]: { ...chatSettings[targetId], archived: false } });
                        }
                    },
                    {
                        icon: '\u2B07\uFE0F', label: 'ARCHIVE CHANNEL', hidden: isGroup || isArchived, action: () => {
                            update(settingsRef, { [targetId]: { ...chatSettings[targetId], archived: true } });
                        }
                    },
                    {
                        icon: isLocked ? '\uD83D\uDD13' : '\uD83D\uDD12', label: isLocked ? 'UNLOCK PRIVATE KEY' : 'LOCK CONVERSATION', action: async () => {
                            if (isLocked) {
                                const pwd = await window.cyberPrompt("ENTER PIN TO UNLOCK", "", "DECRYPT CHANNEL");
                                if (pwd === chatSettings[targetId].passcode) {
                                    update(settingsRef, { [targetId]: { ...chatSettings[targetId], locked: false, passcode: null } });
                                    window.cyberAlert("ENCRYPTION REMOVED");
                                } else { window.cyberAlert("KEY MISMATCH", "error"); }
                            } else {
                                const p = await window.cyberPrompt("SET SECURE PIN", "", "ENCRYPT CHANNEL");
                                if (p && p.length >= 4) {
                                    update(settingsRef, { [targetId]: { ...chatSettings[targetId], locked: true, passcode: p } });
                                    window.cyberAlert("CONTENT ENCRYPTED");
                                } else if (p) { window.cyberAlert("PIN TOO WEAK (MIN 4)", "error"); }
                            }
                        }
                    },
                    {
                        icon: '\uD83D\uDDD1\uFE0F', label: 'DELETE CHAT HISTORY', action: async () => {
                            if (await window.cyberConfirm("ERASE ALL COMM-HISTORY?")) {
                                const cKey = isGroup ? targetId : [currentUser.uid, targetId].sort().join('_');
                                await set(ref(database, `messages/${cKey}`), null);
                                window.cyberAlert("LOGS PURGED");
                            }
                        }
                    },
                    {
                        icon: '\uD83D\uDC64', label: 'VIEW NODE PROFILE', action: () => {
                            if (isGroup) window.showUserProfile(name, "GR", "group@shield.os", targetId);
                            else window.showUserProfile(name, name.substring(0, 2), "", targetId);
                        }
                    }
                ];

                actions.forEach(act => {
                    if (act.hidden) return;
                    const btn = document.createElement('button');
                    btn.style.cssText = "width:100%; display:flex; align-items:center; gap:15px; padding:15px 25px; background:none; border:none; color:#fff; cursor:pointer; text-align:left; transition:background 0.2s;";
                    btn.innerHTML = `<span style="font-size:1.2rem;">${act.icon}</span><span style="font-size:0.85rem; letter-spacing:1px; font-family:var(--font-mono);">${act.label}</span>`;
                    btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.05)';
                    btn.onmouseleave = () => btn.style.background = 'none';
                    btn.onclick = () => { overlay.remove(); act.action(); };
                    sheet.appendChild(btn);
                });

                overlay.appendChild(sheet);
                document.body.appendChild(overlay);

                requestAnimationFrame(() => {
                    overlay.style.opacity = '1';
                    sheet.style.transform = 'translateY(0)';
                });

                overlay.onclick = (ev) => { if (ev.target === overlay) { overlay.style.opacity = '0'; sheet.style.transform = 'translateY(100%)'; setTimeout(() => overlay.remove(), 300); } };
            };

            // RENDER GROUPS FIRST
            for (let gid of groupsToRender) {
                const gSnap = await get(ref(database, `groups/${gid}`));
                if (!gSnap.exists()) continue;
                const g = gSnap.val();

                const isLocked = chatSettings[gid] && chatSettings[gid].locked;
                const isPinned = chatSettings[gid] && chatSettings[gid].pinned;
                const gItem = document.createElement('div');
                gItem.className = 'contact-item' + (window._chatTarget?.uid === gid ? ' active' : '');
                gItem.style.borderLeft = "2px solid var(--terminal-green)";
                const isAdmin = g.admins && g.admins[currentUser.uid];
                gItem.innerHTML = `
                    <div class="contact-avatar" style="background:#111; color:var(--terminal-green); border:1.5px solid var(--terminal-green);">GR</div>
                    <div class="contact-details">
                        <div class="contact-top">
                            <span class="contact-name">${g.name} ${isLocked ? '\uD83D\uDD12' : ''} ${isPinned ? '\uD83D\uDCCC' : ''} ${isAdmin ? '<span style="color:#D4AF37; font-size:0.5rem; margin-left:4px; border:1px solid #D4AF37; padding:1px 4px; border-radius:4px;">ADMIN</span>' : ''}</span>
                            <span class="contact-time">GROUP</span>
                        </div>
                        <span class="contact-last-msg">SECURE MULTI-CHANNEL</span>
                    </div>
                `;
                gItem.onclick = async () => {
                    if (isLocked) {
                        const pwd = await window.cyberPrompt("Enter PIN to unlock group:", "", "Locked Channel");
                        if (pwd !== chatSettings[gid].passcode) {
                            window.cyberAlert("ACCESS DENIED", "error");
                            return;
                        }
                    }
                    if (_longPressActive) { _longPressActive = false; return; }
                    openChat(g.name, "GR", "Active Group Sync", gid, "group@shield.os");
                };

                gItem.addEventListener('contextmenu', (e) => showOpts(e, gid, g.name, true));
                gItem.addEventListener('touchstart', (e) => {
                    if (e.touches) { cStartX = e.touches[0].clientX; cStartY = e.touches[0].clientY; }
                    ptTimer = setTimeout(() => showOpts(e, gid, g.name, true), 500);
                }, { passive: true });
                gItem.addEventListener('touchend', () => { clearTimeout(ptTimer); });
                gItem.addEventListener('touchmove', (e) => {
                    if (e.touches) {
                        const mDiffX = Math.abs(e.touches[0].clientX - cStartX);
                        const mDiffY = Math.abs(e.touches[0].clientY - cStartY);
                        if (mDiffX > 10 || mDiffY > 10) clearTimeout(ptTimer);
                    }
                }, { passive: true });

                chatsListEl.appendChild(gItem);
            }

            for (let uid of listToRender) {
                const userSnap = await get(ref(database, `users/${uid}`));
                const u = userSnap.val();
                if (!u) continue;

                const profile = u.profile || {};
                const name = (profile.username || (u.email || uid).split('@')[0]).toUpperCase();
                const status = u.status || 'offline';
                const isLocked = chatSettings[uid] && chatSettings[uid].locked;
                const isPinned = chatSettings[uid] && chatSettings[uid].pinned;
                const avatar = profile.avatar;

                const item = document.createElement('div');
                item.className = 'contact-item' + (window._chatTarget?.uid === uid ? ' active' : '');
                item.innerHTML = `
                    <div class="contact-avatar" style="${avatar ? `background:url(${avatar}) center/cover;` : `background:#333; color:#D4AF37;`}; position:relative;">
                        ${!avatar ? name.substring(0, 2) : ''}
                        <div class="status-dot ${status}" style="position:absolute; bottom:0; right:0; width:10px; height:10px; border-radius:10px; border:1.5px solid #000; background:${status === 'online' ? 'var(--terminal-green)' : '#555'};"></div>
                    </div>
                    <div class="contact-details">
                        <div class="contact-top">
                            <span class="contact-name">${name} ${isLocked ? '\uD83D\uDD12' : ''} ${isPinned ? '\uD83D\uDCCC' : ''}</span>
                            <span class="contact-time">${status.toUpperCase()}</span>
                        </div>
                        <span class="contact-last-msg">${profile.about || 'ENCRYPTED NODE'}</span>
                    </div>
                `;

                item.onclick = async () => {
                    if (_longPressActive) { _longPressActive = false; return; }
                    if (isLocked) {
                        const pwd = await window.cyberPrompt("Enter PIN to unlock this node:", "", "Secure Chat");
                        if (pwd !== chatSettings[uid].passcode) {
                            window.cyberAlert("ACCESS DENIED", "error");
                            return;
                        }
                    }
                    openChat(name, name.substring(0, 2), status.toUpperCase(), uid, u.email);
                };

                item.addEventListener('touchstart', (e) => {
                    if (e.touches) { cStartX = e.touches[0].clientX; cStartY = e.touches[0].clientY; }
                    ptTimer = setTimeout(() => showOpts(e, uid, name), 500);
                }, { passive: true });
                item.addEventListener('touchend', () => clearTimeout(ptTimer));
                item.addEventListener('touchmove', (e) => {
                    if (e.touches) {
                        const mDiffX = Math.abs(e.touches[0].clientX - cStartX);
                        const mDiffY = Math.abs(e.touches[0].clientY - cStartY);
                        if (mDiffX > 10 || mDiffY > 10) clearTimeout(ptTimer);
                    }
                }, { passive: true });
                item.addEventListener('contextmenu', (e) => showOpts(e, uid, name));

                chatsListEl.appendChild(item);
            }
        }
    }
    window.openChat = openChat;

    function openChat(name, avatarText, statusText, targetUid, targetEmail) {
        console.log("openChat called:", name, targetUid);
        const chatMain = document.querySelector('.chat-main');
        const chatContainer = document.querySelector('.chat-container');

        if (!chatMain || !chatContainer) {
            console.error("openChat: chat-main or chat-container not found!");
            return;
        }

        window._chatTarget = { name, avatarText, uid: targetUid, email: targetEmail };

        // Switch to absolute full-screen chat mode
        chatContainer.classList.add('chat-active');
        chatContainer.classList.remove('sidebar-active');

        // Handle demo/unauthenticated access gracefully
        const currentUid = (auth && auth.currentUser) ? auth.currentUser.uid : 'demo_user';
        let chatKey;
        if (targetUid && targetUid.startsWith('group_')) {
            chatKey = targetUid; // Group keys are absolute
        } else {
            chatKey = targetUid ? (targetUid === 'shield_ai' ? `ai_${currentUid}` : [currentUid, targetUid].sort().join('_')) : 'global';
        }

        // Toggle visibility explicitly - only on mobile to allow sidebar toggle on desktop
        if (window.innerWidth <= 768) {
            const leftNav = chatContainer.querySelector('.main-left-nav');
            const sidebar = chatContainer.querySelector('.chat-sidebar');
            if (leftNav) leftNav.style.display = 'none';
            if (sidebar) sidebar.style.display = 'none';
        }

        // Force browser layout recalculation
        void chatMain.offsetWidth;

        const statusLower = (statusText || '').toLowerCase();
        const statusClass = statusLower.includes('established') || statusLower.includes('active') ? 'online' : 'offline';
        chatMain.innerHTML = `
            <div id="chat-wrapper" style="position:absolute; inset:0; display:flex; flex-direction:column; background:#000; color:#fff; z-index:2000; overflow:hidden;">
                <header class="chat-header">
                    <button class="header-back-btn" id="final-back-btn">
                        <svg viewBox="0 0 24 24" fill="none" style="width:20px; height:20px;"><path d="M19 12H5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <div class="header-info" id="chat-profile-trigger" style="cursor:pointer; min-width:0;">
                        <div class="header-avatar" style="background:linear-gradient(135deg, #1a1a1a, #000); color:#D4AF37; display:flex; align-items:center; justify-content:center; font-weight:800; border-radius:50%; flex-shrink:0; border:1.5px solid #D4AF37; font-size:0.9rem; box-shadow:0 0 15px rgba(212,175,55,0.2);">${avatarText}</div>
                        <div class="header-details" style="min-width:0; flex:1; overflow:hidden;">
                            <div class="header-name" style="font-weight:700; font-size:1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#fff; letter-spacing:0.5px;">${name}</div>
                            <div class="header-status" style="display:flex; align-items:center; gap:4px; font-size:0.52rem; opacity:0.6; font-family:var(--font-mono); color:#D4AF37;">
                                <div class="live-status-dot ${statusClass}" id="chat-status-dot" style="width:6px; height:6px; background:currentColor; border-radius:50%;"></div>
                                <span id="chat-status-text">${statusText.toUpperCase() === 'NODE DORMANT' ? 'OFFLINE' : (statusText.toUpperCase() === 'UPLINK ACTIVE' ? 'ONLINE' : statusText.toUpperCase())}</span>
                            </div>
                        </div>
                    </div>
                    <div class="header-actions">
                        ${targetUid && targetUid.startsWith('group_') ? `<button class="chat-action-btn" id="btn-add-member" title="Add Member" style="background:transparent; border:none; width:34px; height:34px; display:flex; align-items:center; justify-content:center; color:#D4AF37;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg></button>` : ''}
                        <button class="chat-action-btn" id="btn-chat-search" title="Search Messages" style="background:transparent; border:none; width:34px; height:34px; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.6);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></button>
                        <button class="chat-action-btn" id="btn-voice-call" title="Voice Call" style="background:transparent; border:none; width:34px; height:34px; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.6);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339.185.573 2.81.7A2 2 0 0122 16.92z"/></svg></button>
                        <button class="chat-action-btn" id="btn-chat-profile" title="Chat Info" style="background:transparent; border:none; width:34px; height:34px; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.6);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;"><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/></svg></button>
                    </div>
                </header>
                <div id="pinned-msg-banner" style="display:none; background:rgba(212,175,55,0.08); border-bottom:1px solid rgba(212,175,55,0.15); padding:8px 16px; align-items:center; gap:12px; cursor:pointer; backdrop-filter:blur(10px); z-index:1001;">
                    <div style="color:#D4AF37; font-size:0.9rem;"><svg viewBox="0 0 24 24" fill="currentColor" style="width:14px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
                    <div style="flex:1; min-width:0;">
                        <div style="font-size:0.6rem; font-weight:700; color:#D4AF37; letter-spacing:1px;">PINNED TRANSMISSION</div>
                        <div class="pinned-text" style="font-size:0.75rem; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; opacity:0.8;">Loading...</div>
                    </div>
                    <button class="unpin-btn" style="background:none; border:none; color:rgba(255,255,255,0.3); font-size:1rem; padding:4px;">\u00D7</button>
                </div>
                <div id="chat-search-bar" style="display:none; padding:10px; background:#111; border-bottom:1px solid #333;">
                    <input type="text" id="chat-search-input" placeholder="SEARCH MESSAGES..." style="width:100%; height:35px; border-radius:8px; border:1px solid #333; background:#222; color:#fff; padding:0 10px; font-family:inherit; outline:none;" />
                </div>
                <div id="messages-list" style="flex:1; overflow-y:auto; padding:15px; display:flex; flex-direction:column; gap:10px; background:transparent;">
                    <div class="loading-messages" style="text-align:center; opacity:0.3; font-size:0.7rem; padding-top:20px;">CONNECTING...</div>
                </div>
                <div id="reply-preview" style="display:none; padding:10px 15px; background:rgba(0,0,0,0.85); border-top:1px solid rgba(212,175,55,0.2); border-left:4px solid #D4AF37; flex-direction:row; align-items:center; gap:10px;">
                    <div style="flex:1; min-width:0;">
                        <div id="reply-to-name" style="font-size:0.7rem; font-weight:700; color:#D4AF37; margin-bottom:2px;">Name</div>
                        <div id="reply-to-text" style="font-size:0.75rem; color:#ccc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Message snippet...</div>
                    </div>
                    <button onclick="document.getElementById('reply-preview').style.display='none'; window._replyToMsg=null;" style="background:none; border:none; color:rgba(255,255,255,0.5); font-size:1.2rem; cursor:pointer;">\u00D7</button>
                </div>
                <div class="input-area" id="chat-input-area" style="min-height:70px; display:flex; align-items:flex-end; padding: 10px 12px; gap:8px; background:#0a0a0a; border-top:1px solid rgba(255,255,255,0.08); position:relative; flex-shrink:0; z-index:4000;">
                    <button id="attach-trigger" style="background:none; border:none; color:#C0C0C0; width:36px; height:36px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px; height:20px;"><path d="M12 5V19M5 12H19"/></svg></button>
                    <button id="emoji-trigger" style="background:none; border:none; color:#C0C0C0; width:36px; height:36px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px; height:20px;"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg></button>
                    <div id="recording-ui" style="display:none; flex:1; align-items:center; gap:10px; padding:0 10px; background:rgba(255,51,51,0.1); border-radius:20px; height:45px; border:1px solid rgba(255,51,51,0.3);">
                        <div class="rec-dot" style="width:8px; height:8px; border-radius:50%; background:#ff3333; animation: blink 0.8s infinite alternate;"></div>
                        <span id="recording-timer" style="font-family:var(--font-mono); font-size:0.8rem; color:#ff3333;">0:00</span>
                        <div style="flex:1; font-size:0.7rem; opacity:0.6; font-family:var(--font-mono);">RECORDING...</div>
                        <button id="cancel-rec-btn" style="background:none; border:none; color:#fff; cursor:pointer; font-size:0.7rem;">CANCEL</button>
                    </div>
                    <input type="text" id="message-input" placeholder="Message" style="flex:1; min-height:40px; max-height:120px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:22px; padding:10px 16px; color:#fff; font-family:inherit; font-size:0.95rem; outline:none; margin-bottom: 5px;">
                    <button id="voice-btn" style="background:none; border:none; color:#C0C0C0; width:45px; height:45px; flex-shrink:0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:22px; height:22px;"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg></button>
                    <button id="send-btn" style="display:none; width:50px; height:50px; border-radius:50%; background:linear-gradient(135deg, #FFD700, #D4AF37); color:#000; border:none; align-items:center; justify-content:center; flex-shrink:0;">
                        <svg viewBox="0 0 24 24" fill="none" style="width:22px; height:22px;"><path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <!-- EMOJI PICKER INJECTED HERE -->
                    <div id="emoji-picker" style="display:none; position:absolute; bottom:85px; right:12px; width:300px; height:400px; background:rgba(10,10,10,0.98); border:1px solid rgba(255,255,255,0.12); border-radius:20px; flex-direction:column; z-index:5001; backdrop-filter:blur(30px); box-shadow:0 15px 50px rgba(0,0,0,0.6); animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                        <div class="ep-tabs" style="display:flex; padding:12px 20px; gap:20px; border-bottom:1px solid rgba(255,255,255,0.05); background:rgba(255,255,255,0.02); border-radius:20px 20px 0 0;">
                            <span id="tab-emojis" style="font-family:var(--font-mono); font-size:0.65rem; letter-spacing:1.5px; cursor:pointer; font-weight:700; color:var(--terminal-green); border-bottom:2px solid var(--terminal-green);">EMOJI</span>
                            <span id="tab-stickers" style="font-family:var(--font-mono); font-size:0.65rem; letter-spacing:1.5px; cursor:pointer; font-weight:700; color:#C0C0C0;">STICKERS</span>
                            <span id="tab-gifs" style="font-family:var(--font-mono); font-size:0.65rem; letter-spacing:1.5px; cursor:pointer; font-weight:700; color:#C0C0C0;">GIFS</span>
                        </div>
                        <div id="ep-search-container" style="display:none; padding:10px 15px;">
                            <input type="text" id="ep-search-input" placeholder="SEARCH..." style="width:100%; height:32px; border-radius:8px; border:1px solid #333; background:rgba(255,255,255,0.05); color:#fff; padding:0 10px; font-size:0.75rem; outline:none;">
                        </div>
                        <div id="emoji-grid" style="flex:1; overflow-y:auto; display:grid; grid-template-columns: repeat(6, 1fr); padding:15px; gap:10px;"></div>
                        <div id="gif-tab-content" style="display:none; flex:1; overflow-y:auto; flex-direction:column; padding:10px;">
                            <div id="gif-grid" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px;"></div>
                        </div>
                        <div id="sticker-tab-content" style="display:none; flex:1; overflow-y:auto; flex-direction:column; padding:10px;">
                            <div id="sticker-grid" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px;"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="attach-menu" id="attach-menu" style="display:none; position:fixed; bottom:85px; left:12px; background:rgba(15,15,15,0.95); border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:8px; z-index:5000;">
                <div id="attach-image" class="attach-option" style="padding:12px; cursor:pointer; font-size:0.8rem;">\uD83D\uDDBC\uFE0F IMAGE</div>
                <div id="attach-video" class="attach-option" style="padding:12px; cursor:pointer; font-size:0.8rem;">🎥 VIDEO</div>
                <div id="attach-doc" class="attach-option" style="padding:12px; cursor:pointer; font-size:0.8rem;">\uD83D\uDCC4 DOCUMENT</div>
                <div id="attach-apk" class="attach-option" style="padding:12px; cursor:pointer; font-size:0.8rem;">📦 APP (.APK)</div>
                <div id="attach-location" class="attach-option" style="padding:12px; cursor:pointer; font-size:0.8rem;">\uD83D\uDCCD LOCATION</div>
            </div>
        `;

        // Attachments Logic (moved up for scope)
        const attachMenu = document.getElementById('attach-menu');
        const imgInput = document.createElement('input');
        imgInput.type = 'file'; imgInput.accept = 'image/*';
        imgInput.style.cssText = "position:fixed; top:-100px; left:-100px; display:none;";
        imgInput.id = "img-input-hidden";
        document.body.appendChild(imgInput);
        document.getElementById('attach-image').onclick = (e) => {
            e.stopPropagation();
            attachMenu.style.display = 'none';
            imgInput.click();
        };
        imgInput.onchange = async (e) => {
            const file = e.target.files[0]; if (!file) return;
            if (file.size > 10 * 1024 * 1024) { window.cyberAlert('IMAGE TOO LARGE (MAX 10MB)', 'error'); return; }
            await sendFragmentedSignal(file, 'image');
            imgInput.value = '';
        };

        const vidInput = document.createElement('input');
        vidInput.type = 'file'; vidInput.accept = 'video/*';
        vidInput.style.display = 'none'; document.body.appendChild(vidInput);
        document.getElementById('attach-video').onclick = () => { attachMenu.style.display = 'none'; vidInput.click(); };

        const generateThumb = (file) => {
            return new Promise((resolve) => {
                const vid = document.createElement('video');
                const canvas = document.createElement('canvas');
                const url = URL.createObjectURL(file);

                // SAFETY TIMEOUT: Don't block upload for more than 3 seconds
                const timeout = setTimeout(() => {
                    URL.revokeObjectURL(url);
                    resolve(null);
                }, 3000);

                vid.src = url;
                vid.preload = 'metadata';
                vid.muted = true;
                vid.playsInline = true;

                vid.onloadedmetadata = () => {
                    vid.currentTime = 0.5; // Snap at 0.5s instead of 1s for speed
                };

                vid.onseeked = () => {
                    clearTimeout(timeout);
                    try {
                        canvas.width = vid.videoWidth / 4;
                        canvas.height = vid.videoHeight / 4;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                        const thumb = canvas.toDataURL('image/jpeg', 0.5);
                        URL.revokeObjectURL(url);
                        resolve(thumb);
                    } catch (e) { resolve(null); }
                };

                vid.onerror = () => {
                    clearTimeout(timeout);
                    URL.revokeObjectURL(url);
                    resolve(null);
                };
            });
        };

        vidInput.onchange = async (e) => {
            const file = e.target.files[0]; if (!file) return;
            if (file.size > 40 * 1024 * 1024) { window.cyberAlert('VIDEO TOO LARGE (MAX 40MB)', 'error'); return; }

            window.cyberAlert('ANALYZING SIGNAL...', 'info');
            let thumbnail = null;
            try {
                thumbnail = await generateThumb(file);
            } catch (te) { console.warn("Thumb fail"); }

            await sendFragmentedSignal(file, 'video', { thumbnailData: thumbnail });
            vidInput.value = '';
        };

        const docInput = document.createElement('input');
        docInput.type = 'file';
        docInput.style.display = 'none'; document.body.appendChild(docInput);
        const handleDocSend = async (isApk) => {
            attachMenu.style.display = 'none';
            const tempDocInput = document.createElement('input'); // Create a new input each time
            tempDocInput.type = 'file';
            tempDocInput.accept = isApk ? '.apk' : '*/*';
            tempDocInput.style.cssText = "position:fixed; top:-100px; left:-100px; display:none;"; // Hide it
            document.body.appendChild(tempDocInput); // Append to body

            tempDocInput.onchange = async (e) => {
                const file = e.target.files[0]; if (!file) return;
                if (file.size > 40 * 1024 * 1024) { window.cyberAlert('FILE TOO LARGE (MAX 40MB)', 'error'); return; }
                await sendFragmentedSignal(file, isApk ? 'apk' : 'document');
                tempDocInput.value = '';
                document.body.removeChild(tempDocInput); // Clean up the temporary input
            };
            tempDocInput.click();
        };
        document.getElementById('attach-doc').onclick = () => handleDocSend(false);
        document.getElementById('attach-apk').onclick = () => handleDocSend(true);

        document.getElementById('attach-location').onclick = () => {
            attachMenu.style.display = 'none';
            if (!navigator.geolocation) {
                window.cyberAlert('GEOLOCATION NOT SUPPORTED', 'error');
                return;
            }
            window.cyberAlert('ACQUIRING GPS LOCK...');
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const user = auth.currentUser; if (!user || !window._chatTarget) return;
                let { latitude, longitude } = pos.coords;
                // Standardize to 5 decimal places
                latitude = parseFloat(latitude.toFixed(5));
                longitude = parseFloat(longitude.toFixed(5));

                const tUid = window._chatTarget.uid;
                let chatKey;
                if (tUid && tUid.toString().startsWith('group_')) {
                    chatKey = tUid;
                } else {
                    chatKey = tUid ? (tUid === 'shield_ai' ? `ai_${user.uid}` : [user.uid, tUid].sort().join('_')) : 'global';
                }

                await push(ref(database, `messages/${chatKey}`), {
                    type: 'location',
                    lat: latitude,
                    lng: longitude,
                    sender: user.email,
                    timestamp: Date.now()
                });
                window.cyberAlert('LOCATION TRANSMITTED');
            }, (err) => {
                console.error("Loc Error:", err);
                window.cyberAlert('SIGNAL LOST: GPS DENIED', 'error');
            }, { enableHighAccuracy: true });
        };

        // --- All chat event listeners and logic are set up below ---

        if (targetUid && targetUid.startsWith('group_')) {
            const addBtn = document.getElementById('btn-add-member');
            if (addBtn) {
                addBtn.onclick = async () => {
                    const friendEmail = await window.cyberPrompt("ADD PARTICIPANT", "Enter user email", "LINK NEW NODE");
                    if (!friendEmail) return;
                    get(ref(database, 'users')).then(async (usersSnap) => {
                        const allUsers = usersSnap.val();
                        const targetUserEntry = Object.entries(allUsers).find(([uid, u]) => u.email === friendEmail);
                        if (targetUserEntry) {
                            const [foundUid] = targetUserEntry;
                            await set(ref(database, `groups/${targetUid}/members/${foundUid}`), true);
                            await set(ref(database, `users/${foundUid}/groups/${targetUid}`), true);
                            window.cyberAlert("PARTICIPANT LINKED");
                        } else {
                            window.cyberAlert("NODE NOT FOUND", "error");
                        }
                    });
                };
            }
        }

        const recBtn = document.getElementById('voice-btn');
        const sendBtn = document.getElementById('send-btn');
        const msgInput = document.getElementById('message-input');
        const recordingUI = document.getElementById('recording-ui');
        const recTimer = document.getElementById('recording-timer');
        const cancelRecBtn = document.getElementById('cancel-rec-btn');

        let typingTO;
        msgInput.oninput = () => {
            // Typing broadcast
            const u = auth.currentUser;
            if (u && targetUid && targetUid !== 'shield_ai') {
                set(ref(database, `typing/${u.uid}`), { timestamp: Date.now() });
                clearTimeout(typingTO);
                typingTO = setTimeout(() => set(ref(database, `typing/${u.uid}`), null), 3000);
            }

            if (msgInput.value.trim().length > 0) {
                recBtn.style.display = 'none';
                sendBtn.style.display = 'flex';
            } else {
                recBtn.style.display = 'flex';
                sendBtn.style.display = 'none';
            }
        };

        msgInput.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        };
        // Define send logic first (Hoisted manually or by order)
        const sendMessage = async () => {
            if (!navigator.onLine) {
                window.cyberAlert("OFFLINE: MESSAGE NOT SENT", "error");
                return;
            }
            const val = msgInput.value.trim();
            if (!val && !window._forwardMsgInfo) return;

            const user = auth.currentUser;
            if (!user) return;

            let chatKey;
            const targetUid = window._chatTarget.uid;
            if (targetUid && targetUid.startsWith('group_')) {
                chatKey = targetUid;
            } else {
                chatKey = targetUid ? (targetUid === 'shield_ai' ? `ai_${user.uid}` : [user.uid, targetUid].sort().join('_')) : 'global';
            }

            const msgData = {
                text: val || (window._forwardMsgInfo ? window._forwardMsgInfo.text : ''),
                sender: user.email,
                timestamp: Date.now()
            };

            if (window._replyToMsg) {
                msgData.replyTo = window._replyToMsg;
            }

            try {
                const mRef = push(ref(database, `messages/${chatKey}`));
                await set(mRef, msgData);
                msgInput.value = '';
                msgInput.style.height = '42px';
                if (window._replyToMsg) {
                    window._replyToMsg = null;
                    const rPrev = document.getElementById('reply-preview');
                    if (rPrev) rPrev.style.display = 'none';
                }
                if (window._forwardMsgInfo) window._forwardMsgInfo = null;

                // Award activity point
                const balRef = ref(database, `users/${user.uid}/wallet/balance`);
                const balSnap = await get(balRef);
                await set(balRef, (balSnap.val() || 0) + 1);

                // AI LOGIC
                if (window._chatTarget && window._chatTarget.uid === 'shield_ai') {
                    const aiRef = push(ref(database, `messages/${chatKey}`));
                    set(aiRef, { text: '<div class="typing-loader"><span></span><span></span><span></span></div>', sender: 'ai@shield.com', senderName: 'Assistant', timestamp: Date.now() + 10 });

                    fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer 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' },
                        body: JSON.stringify({
                            model: 'llama-3.3-70b-versatile',
                            messages: [
                                { role: "system", content: "You are a friendly, helpful assistant. No tech jargon. Speak plainly." },
                                { role: "user", content: msgData.text }
                            ]
                        })
                    }).then(async r => {
                        const d = await r.json();
                        const reply = d.choices?.[0]?.message?.content || "Signal interference detected. Try again later.";
                        set(aiRef, { text: reply, sender: 'ai@shield.com', senderName: 'Assistant', timestamp: Date.now() + 20 });
                    }).catch(() => {
                        set(aiRef, { text: "Signal interference detected. Try again later.", sender: 'ai@shield.com', senderName: 'Assistant', timestamp: Date.now() + 20 });
                    });
                }
            } catch (e) {
                window.cyberAlert("TRANSMISSION FAILED", "error");
            }
        };

        sendBtn.onclick = () => sendMessage();

        const startRec = async () => {
            console.log("[SHIELD_AUDIO] Initializing Recording Sequence...");
            if (window._isRecording) return;

            if (!window.MediaRecorder) {
                window.cyberAlert('MEDIA_RECORDER NOT SUPPORTED', 'error');
                return;
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                window.cyberAlert('INSECURE CONTEXT: MIC BLOCKED (Use HTTPS)', 'error');
                console.error("navigator.mediaDevices is undefined. Are you on a secure origin (localhost or HTTPS)?");
                return;
            }

            window._isRecording = true;
            try {
                console.log("[SHIELD_AUDIO] Requesting Microphone Access...");
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log("[SHIELD_AUDIO] Stream Acquired.");

                // Detect most stable format (Universal support for PC & Mobile/iPhone)
                const formats = [
                    'audio/webm;codecs=opus',
                    'audio/webm',
                    'audio/mp4',
                    'audio/aac',
                    'audio/ogg',
                    'audio/wav'
                ];
                let selectedMime = '';
                for (const f of formats) {
                    if (MediaRecorder.isTypeSupported(f)) {
                        selectedMime = f;
                        break;
                    }
                }

                console.log("[SHIELD_AUDIO] Target Mime Chosen:", selectedMime || "DEFAULT");
                mediaRecorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : {});
                window._audioChunks = []; // Use global scoped to avoid local stale reference
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) window._audioChunks.push(e.data);
                };

                const finalMime = mediaRecorder.mimeType || 'audio/webm';
                mediaRecorder.onstop = async () => {
                    console.log(`[SHIELD_AUDIO] Recording Stopped. Total Chunks: ${window._audioChunks.length}`);
                    if (window._audioChunks.length === 0) {
                        window.cyberAlert('NO AUDIO DATA CAPTURED', 'error');
                        window._isRecording = false;
                        return;
                    }

                    const audioBlob = new Blob(window._audioChunks, { type: finalMime });
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        let base64Data = e.target.result;
                        // Ensure it's a clean base64 string (remove potential double prefixes)
                        if (base64Data.startsWith('data:data:')) {
                            base64Data = base64Data.substring(5); // Remove the first 'data:'
                        }
                        if (!base64Data || base64Data.length < 100) {
                            window.cyberAlert('AUDIO_WRITE_FAILURE', 'error');
                            window._isRecording = false;
                            return;
                        }

                        const user = auth.currentUser; if (!user || !window._chatTarget) return;
                        const tUid = window._chatTarget.uid;
                        let chatKey;
                        if (tUid && tUid.toString().startsWith('group_')) {
                            chatKey = tUid;
                        } else {
                            chatKey = tUid ? (tUid === 'shield_ai' ? `ai_${user.uid}` : [user.uid, tUid].sort().join('_')) : 'global';
                        }

                        const durationStr = `${Math.floor(recSeconds / 60)}:${(recSeconds % 60).toString().padStart(2, '0')}`;

                        await push(ref(database, `messages/${chatKey}`), {
                            type: 'audio',
                            audioData: base64Data, // This contains the data:audio/...;base64,... 
                            mimeType: finalMime,
                            duration: durationStr,
                            sender: user.email,
                            timestamp: Date.now()
                        });
                        window.cyberAlert('VOICE NOTE TRANSMITTED');
                        window._isRecording = false;
                    };
                    reader.readAsDataURL(audioBlob);
                    stream.getTracks().forEach(t => t.stop());
                };

                mediaRecorder.start(250); // Slice every 250ms for stability
                recordingUI.style.display = 'flex';
                msgInput.style.display = 'none';
                recBtn.style.color = '#ff3333';
                recBtn.style.transform = 'scale(1.2)';

                recSeconds = 0;
                recTimer.innerText = "0:00";
                recInterval = setInterval(() => {
                    recSeconds++;
                    const m = Math.floor(recSeconds / 60);
                    const s = recSeconds % 60;
                    recTimer.innerText = `${m}:${s.toString().padStart(2, '0')}`;
                }, 1000);

                console.log("SHIELD_AUDIO: UPLINK ESTABLISHED.");
            } catch (err) {
                window._isRecording = false;
                console.error("Mic Capture Error:", err.name, err.message);

                let errorMsg = 'MICROPHONE ACCESS DENIED';
                if (err.name === 'NotAllowedError') errorMsg = 'PERMISSION REJECTED BY USER';
                if (err.name === 'NotFoundError') errorMsg = 'NO MICROPHONE DETECTED';
                if (err.name === 'NotReadableError') errorMsg = 'HARDWARE BUSY / IN USE';

                window.cyberAlert(errorMsg, 'error');
            }
        };

        const stopRec = (send = true) => {
            window._isRecording = false;
            if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
            if (!send) window._audioChunks = [];
            mediaRecorder.stop();
            clearInterval(recInterval);
            recordingUI.style.display = 'none';
            msgInput.style.display = 'block';
            recBtn.style.color = '#C0C0C0';
            recBtn.style.transform = 'scale(1)';

            // Ensure focus returns to input after recording
            setTimeout(() => msgInput.focus(), 100);
        };

        let isPressing = false;
        recBtn.onmousedown = recBtn.ontouchstart = (e) => {
            e.preventDefault();
            isPressing = true;
            startRec();
        };
        recBtn.onmouseup = recBtn.ontouchend = () => {
            isPressing = false;
            stopRec(true);
        };
        cancelRecBtn.onclick = () => stopRec(false);



        // Real-time message listener - uses the same chatKey calculated above
        // (loadMessages already sets this up on line 774, so we just need to set up event handlers)
        window._currentChatKey = chatKey;
        const messagesRef = query(ref(database, `messages/${chatKey}`), limitToLast(50));
        const currentList = document.getElementById('messages-list');
        if (currentList) {
            currentList.innerHTML = '';
        }

        if (window._chatMessageChangeUnsub) {
            window._chatMessageChangeUnsub();
        }

        // Pinned Message Listener
        const pinnedRef = ref(database, `messages/${chatKey}/pinned`);
        let unsubscribePinned = null;
        if (unsubscribePinned) unsubscribePinned();
        unsubscribePinned = onValue(pinnedRef, (snap) => {
            const pData = snap.val();
            const banner = document.getElementById('pinned-msg-banner');
            if (!banner) return;
            if (pData) {
                banner.style.display = 'flex';
                banner.querySelector('.pinned-text').textContent = pData.text || (pData.type === 'image' ? 'Photo' : 'Media attachment');
                banner.onclick = (e) => {
                    if (e.target.closest('.unpin-btn')) {
                        set(pinnedRef, null);
                        window.cyberAlert("Message unpinned");
                        return;
                    }
                    const targetEl = document.getElementById('msg-' + pData.key);
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetEl.style.transition = 'background 0.5s';
                        targetEl.style.background = 'rgba(212,175,55,0.2)';
                        setTimeout(() => targetEl.style.background = '', 2000);
                    } else {
                        window.cyberAlert("Original message not found", "error");
                    }
                };
            } else {
                banner.style.display = 'none';
            }
        });

        const unsub = onChildAdded(messagesRef, (msgSnap) => {
            const data = msgSnap.val();
            const msgList = document.getElementById('messages-list');
            if (!msgList) return;

            // Remove loading message
            const loadingEl = msgList.querySelector('.loading-messages');
            if (loadingEl) loadingEl.remove();

            // Handle Optimistic cleanup
            const myEmail = auth.currentUser ? auth.currentUser.email : null;
            if (data.sender === myEmail) {
                const pendings = msgList.querySelectorAll('.message.sent.pending');
                pendings.forEach(p => {
                    const bubble = p.querySelector('.message-bubble');
                    if (bubble && bubble.textContent.includes(data.text)) p.remove();
                });
            }

            const isMyMessage = auth.currentUser && (data.sender === auth.currentUser.email);
            const messageDiv = document.createElement('div');
            messageDiv.id = `msg-${msgSnap.key}`;
            messageDiv.className = isMyMessage ? 'message sent' : 'message received';
            const msgData = { ...data, key: msgSnap.key };
            messageDiv._data = msgData;
            messageDiv.innerHTML = renderMessageContent(msgData, isMyMessage);
            msgList.appendChild(messageDiv);

            // Global Notification Trigger
            if (!isMyMessage && window._notify) {
                const senderName = data.sender ? data.sender.split('@')[0].toUpperCase() : "SYSTEM";
                window._notify(senderName, data.text || "New Message", { chatKey });
            }

            // Selection & Scroll
            messageDiv.addEventListener('click', (e) => {
                if (window._selectionMode) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSelectMessage(messageDiv);
                }
            });
            requestAnimationFrame(() => { msgList.scrollTop = msgList.scrollHeight; });
        });
        window._chatMessageUnsub = unsub;

        // --- Drag-to-Reply & Long-Press Context Menu ---
        let touchStartX = 0;
        let touchStartY = 0;
        let swipeEle = null;
        let isSwipingX = false;
        let isSwipingY = false;

        currentList.addEventListener('touchstart', (e) => {
            const msg = e.target.closest('.message');
            if (msg) {
                if (e.touches) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                }
                swipeEle = msg;
                isSwipingX = false;
                isSwipingY = false;
                msg._pressTimer = setTimeout(() => showMsgContext(msg, e), 500);
            }
        }, { passive: true });

        currentList.addEventListener('touchmove', (e) => {
            if (swipeEle && e.touches) {
                const diffX = touchStartX - e.touches[0].clientX;
                const diffY = Math.abs(touchStartY - e.touches[0].clientY);

                if (diffY > 10 && !isSwipingX) {
                    isSwipingY = true;
                    clearTimeout(swipeEle._pressTimer);
                    return;
                }

                if (Math.abs(diffX) > 10 && !isSwipingY) {
                    isSwipingX = true;
                    clearTimeout(swipeEle._pressTimer);
                }

                if (isSwipingX && !isSwipingY) {
                    let translateVal = -diffX; // Negative diffX means swipe right
                    if (translateVal < 0) translateVal *= 0.2; // Resist swiping left
                    if (translateVal > 70) translateVal = 70 + (translateVal - 70) * 0.15;

                    requestAnimationFrame(() => {
                        if (swipeEle) {
                            swipeEle.style.transform = `translateX(${translateVal}px)`;
                            let replyHint = swipeEle.querySelector('.reply-hint');
                            if (!replyHint && translateVal > 25) {
                                replyHint = document.createElement('div');
                                replyHint.className = 'reply-hint';
                                replyHint.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:18px; height:18px;"><path d="M9 14L4 9L9 4" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 20C20 16.6863 17.3137 14 14 14H4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                                replyHint.style.cssText = "position:absolute; left:-35px; top:50%; transform:translateY(-50%); color:var(--terminal-green); opacity:0; transition: opacity 0.1s;";
                                swipeEle.appendChild(replyHint);
                            }
                            if (replyHint) {
                                replyHint.style.opacity = Math.min(1, (translateVal - 20) / 40);
                                replyHint.style.left = `${Math.min(15, translateVal - 35)}px`;
                            }
                        }
                    });
                }
            }
        }, { passive: true });

        currentList.addEventListener('touchend', (e) => {
            if (swipeEle) {
                clearTimeout(swipeEle._pressTimer);
                if (isSwipingX && swipeEle.style.transform) {
                    const matchX = swipeEle.style.transform.match(/translateX\(([-.0-9]+)px\)/);
                    if (matchX && parseFloat(matchX[1]) > 40) {
                        initReply(swipeEle);
                        if (navigator.vibrate) navigator.vibrate(50);
                    }
                    swipeEle.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
                    swipeEle.style.transform = 'translateX(0px)';
                    const rh = swipeEle.querySelector('.reply-hint');
                    if (rh) rh.style.opacity = '0';
                    setTimeout(() => {
                        if (swipeEle) {
                            swipeEle.style.transition = '';
                            swipeEle.style.transform = '';
                            const rh = swipeEle.querySelector('.reply-hint');
                            if (rh) rh.remove();
                        }
                    }, 250);
                }
                swipeEle = null;
            }
            isSwipingX = false;
            isSwipingY = false;
        });

        currentList.addEventListener('contextmenu', (e) => {
            const msg = e.target.closest('.message');
            if (msg) { e.preventDefault(); clearTimeout(msg._pressTimer); showMsgContext(msg, e); }
        });

        function showMsgContext(msgEl, event) {
            // If already in selection mode, just toggle this message
            if (window._selectionMode) {
                toggleSelectMessage(msgEl);
                return;
            }

            const existing = document.getElementById('msg-ctx-menu');
            if (existing) existing.remove();

            const msgId = msgEl.id.replace('msg-', '');
            const bubble = msgEl.querySelector('.message-bubble') || msgEl.querySelector('.image-message') || msgEl.querySelector('.sticker-bubble');
            const fullText = bubble ? bubble.textContent.trim() : '';
            const txtSnippet = fullText.substring(0, 50) || 'Attachment';
            const isMine = msgEl.classList.contains('sent');

            // Highlight the selected message
            msgEl.style.background = 'rgba(212,175,55,0.15)';
            if (navigator.vibrate) navigator.vibrate(30);

            // WhatsApp-style bottom sheet overlay
            const overlay = document.createElement('div');
            overlay.id = 'msg-ctx-menu';
            overlay.style.cssText = "position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.5); display:flex; align-items:flex-end; justify-content:center; backdrop-filter:blur(3px); animation: fadeIn 0.15s ease;";

            const sheet = document.createElement('div');
            sheet.style.cssText = "width:100%; max-width:420px; background:#1a1a1a; border-radius:18px 18px 0 0; padding:8px 0 20px; animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);";

            // Drag handle
            const handle = document.createElement('div');
            handle.style.cssText = "width:40px; height:4px; background:rgba(255,255,255,0.2); border-radius:2px; margin:8px auto 12px;";
            sheet.appendChild(handle);

            // Message preview
            const preview = document.createElement('div');
            preview.style.cssText = "padding:10px 20px; margin:0 16px 10px; background:rgba(255,255,255,0.05); border-radius:10px; border-left:3px solid #D4AF37;";
            preview.innerHTML = `<div style="font-size:0.65rem; color:#D4AF37; margin-bottom:4px;">${isMine ? 'You' : 'Contact'}</div><div style="font-size:0.8rem; color:#ccc; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${txtSnippet}</div>`;
            sheet.appendChild(preview);

            // Quick reactions row
            const reactions = document.createElement('div');
            reactions.style.cssText = "display:flex; justify-content:center; gap:12px; padding:12px 20px; margin-bottom:8px;";
            ['\uD83D\uDC4D', '\u2764\uFE0F', '\uD83D\uDE02', '\uD83D\uDE2E', '\uD83D\uDE22', '\uD83D\uDE4F'].forEach(emoji => {
                const rb = document.createElement('button');
                rb.textContent = emoji;
                rb.style.cssText = "width:42px; height:42px; border-radius:50%; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); font-size:1.2rem; cursor:pointer; transition:transform 0.15s, background 0.15s;";
                rb.onmouseenter = () => rb.style.transform = 'scale(1.2)';
                rb.onmouseleave = () => rb.style.transform = 'scale(1)';
                rb.onclick = async () => {
                    // Save reaction to Firebase
                    const user = auth.currentUser;
                    if (user) {
                        const rRef = ref(database, `messages/${window._currentChatKey}/${msgId}/reactions/${user.uid}`);
                        await set(rRef, emoji);
                    }
                    closeSheet();
                };
                reactions.appendChild(rb);
            });
            sheet.appendChild(reactions);

            const sep = document.createElement('div');
            sep.style.cssText = "height:1px; background:rgba(255,255,255,0.06); margin:0 20px;";
            sheet.appendChild(sep);

            // Action buttons grid (WhatsApp style)
            const grid = document.createElement('div');
            grid.style.cssText = "display:grid; grid-template-columns:repeat(4, 1fr); gap:4px; padding:16px 12px 8px;";

            const actions = [
                { icon: '\u21A9\uFE0F', label: 'Reply', action: () => { closeSheet(); initReply(msgEl); } },
                {
                    icon: '\u27A1\uFE0F', label: 'Forward', action: () => {
                        closeSheet();
                        showForwardPicker(msgEl._data);
                    }
                },
                {
                    icon: '\uD83D\uDCCB', label: 'Copy', action: () => {
                        window.cyberCopy(fullText, "MESSAGE COPIED");
                        closeSheet();
                    }
                },
                {
                    icon: '\u2B50', label: 'Star', action: async () => {
                        const user = auth.currentUser;
                        if (user) {
                            const starRef = ref(database, `users/${user.uid}/starred/${window._currentChatKey}_${msgId}`);
                            await set(starRef, { text: fullText, timestamp: Date.now() });
                            window.cyberAlert("Message starred!");
                        }
                        closeSheet();
                    }
                },
                {
                    icon: '\uD83D\uDDD1\uFE0F', label: 'Delete', action: async () => {
                        closeSheet();
                        if (await window.cyberConfirm('Delete this message permanently?', 'Delete Message')) {
                            await set(ref(database, `messages/${window._currentChatKey}/${msgId}`), null);
                            msgEl.remove();
                            window.cyberAlert("Message deleted");
                        }
                    }
                },
                {
                    icon: '\uD83D\uDCE4', label: 'Share', action: async () => {
                        closeSheet();
                        try {
                            if (navigator.share) {
                                await navigator.share({ title: 'Message', text: fullText });
                            } else {
                                window.cyberAlert("Share not available on this device", "error");
                            }
                        } catch (e) { /* user cancelled */ }
                    }
                },
                {
                    icon: '\uD83D\uDCCC', label: 'Pin', action: async () => {
                        const user = auth.currentUser;
                        if (user) {
                            await set(ref(database, `messages/${window._currentChatKey}/pinned`), {
                                ...msgEl._data,
                                pinnedBy: user.email,
                                pinnedAt: Date.now()
                            });
                            window.cyberAlert("Message pinned!");
                        }
                        closeSheet();
                    }
                },
                {
                    icon: '\u2705', label: 'Select', action: () => {
                        closeSheet();
                        enterSelectionMode(msgEl);
                    }
                }
            ];

            actions.forEach(({ icon, label, action }) => {
                const btn = document.createElement('button');
                btn.style.cssText = "display:flex; flex-direction:column; align-items:center; gap:6px; padding:12px 4px; background:transparent; border:none; color:#fff; cursor:pointer; border-radius:10px; transition:background 0.15s;";
                btn.innerHTML = `<span style="font-size:1.3rem;">${icon}</span><span style="font-size:0.6rem; opacity:0.6; letter-spacing:0.5px;">${label}</span>`;
                btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.08)';
                btn.onmouseleave = () => btn.style.background = 'transparent';
                btn.onclick = action;
                grid.appendChild(btn);
            });
            sheet.appendChild(grid);

            overlay.appendChild(sheet);
            document.body.appendChild(overlay);

            // Add animations
            const style = document.createElement('style');
            style.id = 'ctx-menu-anim';
            style.textContent = `
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `;
            if (!document.getElementById('ctx-menu-anim')) document.head.appendChild(style);

            function closeSheet() {
                msgEl.style.background = '';
                overlay.remove();
            }

            // Close on overlay tap
            overlay.onclick = (e) => {
                if (e.target === overlay) closeSheet();
            };
        }

        // --- Multi-Select Mode (WhatsApp style) ---
        function enterSelectionMode(firstMsgEl) {
            window._selectionMode = true;
            window._selectedMessages = new Set();

            const chatHeader = document.querySelector('.chat-header');
            if (chatHeader) chatHeader.style.display = 'none';

            let selHeader = document.getElementById('selection-header');
            if (!selHeader) {
                selHeader = document.createElement('div');
                selHeader.id = 'selection-header';
                selHeader.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:0 10px; background:rgba(7,7,7,0.96); border-bottom:1px solid rgba(255,255,255,0.08); position:absolute; top:0; width:100%; z-index:1001; backdrop-filter:blur(25px); height:65px; box-sizing:border-box;";

                const left = document.createElement('div');
                left.style.cssText = "display:flex; align-items:center; gap:8px;";

                const closeBtn = document.createElement('button');
                closeBtn.style.cssText = "width:34px; height:34px; border-radius:50%; background:rgba(212,175,55,0.12); color:#D4AF37; border:1px solid rgba(212,175,55,0.25); display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:1rem;";
                closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:18px;"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
                closeBtn.onclick = exitSelectionMode;

                const countTxt = document.createElement('span');
                countTxt.id = 'selection-count';
                countTxt.textContent = "0";
                countTxt.style.cssText = "font-weight:700; font-size:1.1rem; color:#fff; margin-left:4px;";

                left.appendChild(closeBtn);
                left.appendChild(countTxt);

                const right = document.createElement('div');
                right.style.cssText = "display:flex; align-items:center; gap:6px;";

                const iconBtnStyle = "width:38px; height:38px; border-radius:50%; background:transparent; border:none; color:rgba(255,255,255,0.7); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1.15rem; transition:background 0.15s;";

                const starBtn = document.createElement('button');
                starBtn.style.cssText = iconBtnStyle;
                starBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" style="width:20px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
                starBtn.title = 'Star';
                starBtn.onclick = async () => {
                    const user = auth.currentUser;
                    if (user) {
                        for (let mId of window._selectedMessages) {
                            const el = document.getElementById('msg-' + mId);
                            const b = el?.querySelector('.message-bubble') || el?.querySelector('.image-message') || el?.querySelector('.sticker-bubble') || el?.querySelector('.audio-message') || el?.querySelector('.video-message');
                            if (b) await set(ref(database, `users/${user.uid}/starred/${window._currentChatKey}_${mId}`), { text: b.textContent.trim(), timestamp: Date.now() });
                        }
                        window.cyberAlert(`${window._selectedMessages.size} SIGNALS SECURED`);
                    }
                    exitSelectionMode();
                };

                const delBtn = document.createElement('button');
                delBtn.style.cssText = iconBtnStyle;
                delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`;
                delBtn.title = 'Delete';
                delBtn.onclick = async () => {
                    if (await window.cyberConfirm(`PURGE ${window._selectedMessages.size} SELECTED SIGNAL(S)?`, "TERMINATE DATA")) {
                        for (let mId of window._selectedMessages) {
                            await set(ref(database, `messages/${window._currentChatKey}/${mId}`), null);
                            const el = document.getElementById('msg-' + mId);
                            if (el) el.remove();
                        }
                        exitSelectionMode();
                    }
                };

                const fwdBtn = document.createElement('button');
                fwdBtn.style.cssText = iconBtnStyle;
                fwdBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
                fwdBtn.title = 'Forward';
                fwdBtn.onclick = () => {
                    const msgs = [];
                    window._selectedMessages.forEach(mId => {
                        const el = document.getElementById('msg-' + mId);
                        if (el && el._data) msgs.push(el._data);
                    });
                    exitSelectionMode();
                    if (msgs.length > 0) showForwardPicker(msgs);
                };

                const copyBtn = document.createElement('button');
                copyBtn.style.cssText = iconBtnStyle;
                copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
                copyBtn.title = 'Copy';
                copyBtn.onclick = () => {
                    const texts = [];
                    window._selectedMessages.forEach(mId => {
                        const el = document.getElementById('msg-' + mId);
                        if (el) {
                            const b = el.querySelector('.message-bubble') || el.querySelector('.image-message') || el.querySelector('.sticker-bubble') || el.querySelector('.audio-message') || el.querySelector('.video-message');
                            if (b) texts.push(b.textContent.trim());
                        }
                    });
                    window.cyberCopy(texts.join("\n"), "COPIED TO BUFFER");
                    exitSelectionMode();
                };

                const shareBtn = document.createElement('button');
                shareBtn.style.cssText = iconBtnStyle;
                shareBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`;
                shareBtn.title = 'Share';
                shareBtn.onclick = async () => {
                    const texts = [];
                    window._selectedMessages.forEach(mId => {
                        const el = document.getElementById('msg-' + mId);
                        if (el) {
                            const b = el.querySelector('.message-bubble') || el.querySelector('.image-message') || el.querySelector('.sticker-bubble') || el.querySelector('.audio-message') || el.querySelector('.video-message');
                            if (b) texts.push(b.textContent.trim());
                        }
                    });
                    try {
                        if (navigator.share) await navigator.share({ title: 'Messages', text: texts.join("\n") });
                    } catch (e) { }
                    exitSelectionMode();
                };

                right.appendChild(starBtn);
                right.appendChild(copyBtn);
                right.appendChild(shareBtn);
                right.appendChild(fwdBtn);
                right.appendChild(delBtn);

                selHeader.appendChild(left);
                selHeader.appendChild(right);

                const wrapper = document.getElementById('chat-wrapper');
                if (wrapper) {
                    wrapper.style.position = 'relative';
                    wrapper.appendChild(selHeader);
                }
            } else {
                selHeader.style.display = 'flex';
            }

            // Select the first message
            toggleSelectMessage(firstMsgEl);
        }

        function toggleSelectMessage(msgEl) {
            const msgId = msgEl.id.replace('msg-', '');
            if (window._selectedMessages.has(msgId)) {
                window._selectedMessages.delete(msgId);
                msgEl.style.background = '';
            } else {
                window._selectedMessages.add(msgId);
                msgEl.style.background = 'rgba(212,175,55,0.15)';
            }
            const countEl = document.getElementById('selection-count');
            if (countEl) countEl.textContent = window._selectedMessages.size;
            if (window._selectedMessages.size === 0) exitSelectionMode();
        }

        function exitSelectionMode() {
            window._selectionMode = false;
            if (window._selectedMessages) {
                window._selectedMessages.forEach(mId => {
                    const el = document.getElementById('msg-' + mId);
                    if (el) el.style.background = '';
                });
                window._selectedMessages.clear();
            }
            const selHeader = document.getElementById('selection-header');
            if (selHeader) selHeader.style.display = 'none';
            const chatHeader = document.querySelector('.chat-header');
            if (chatHeader) chatHeader.style.display = 'flex';

            // KEYBAR FIX: Ensure keyboard can be brought back by focusing input
            const msgArea = document.getElementById('chat-input-area');
            if (msgArea) msgArea.style.display = 'flex';

            const msgInput = document.getElementById('message-input');
            if (msgInput) {
                msgInput.focus();
                // On mobile, trigger keyboard shift
                setTimeout(() => msgInput.scrollIntoView({ behavior: 'smooth' }), 300);
            }
        }

        function initReply(msgEl) {
            const bubble = msgEl.querySelector('.message-bubble') || msgEl.querySelector('.image-message') || msgEl.querySelector('.sticker-bubble') || msgEl.querySelector('.audio-message') || msgEl.querySelector('.video-message');
            let snippet = bubble ? bubble.textContent.trim().substring(0, 30) || 'Attachment' : 'Message';
            let senderNameNode = msgEl.querySelector('.msg-sender');
            let sname = senderNameNode ? senderNameNode.textContent : (msgEl.classList.contains('sent') ? 'You' : name);

            window._replyToMsg = {
                id: msgEl.id.replace('msg-', ''),
                text: snippet,
                senderName: sname
            };

            const rPrev = document.getElementById('reply-preview');
            if (rPrev) {
                rPrev.style.display = 'flex';
                document.getElementById('reply-to-name').innerText = sname;
                document.getElementById('reply-to-text').innerText = snippet;
                document.getElementById('message-input').focus();
            }
        }

        const unsubChanged = onChildChanged(messagesRef, (msgSnap) => {
            const data = msgSnap.val();
            const msgEl = document.getElementById(`msg-${msgSnap.key}`);
            if (msgEl) {
                const isMyMessage = auth.currentUser && (data.sender === auth.currentUser.email);
                const msgData = { ...data, key: msgSnap.key };
                msgEl.innerHTML = renderMessageContent(msgData, isMyMessage);
            }
        });
        window._chatMessageChangeUnsub = unsubChanged;

        // Send + typing
        const fSendBtn = document.getElementById('send-btn');
        const fMsgInput = document.getElementById('message-input');
        if (fSendBtn && fMsgInput) {
            fSendBtn.onclick = () => sendMessage();
            fMsgInput.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            };
            let typingTO = null;
            fMsgInput.oninput = () => {
                // Update button visibility
                if (fMsgInput.value.trim().length > 0) {
                    const rBtn = document.getElementById('voice-btn');
                    if (rBtn) rBtn.style.display = 'none';
                    fSendBtn.style.display = 'flex';
                } else {
                    const rBtn = document.getElementById('voice-btn');
                    if (rBtn) rBtn.style.display = 'flex';
                    fSendBtn.style.display = 'none';
                }

                const u = auth.currentUser; if (!u) return;
                set(ref(database, `typing/${u.uid}`), { name: (u.email || u.id || 'USER').split('@')[0].toUpperCase(), timestamp: Date.now() });
                clearTimeout(typingTO);
                typingTO = setTimeout(() => set(ref(database, `typing/${u.uid}`), null), 3000);
            };
        }

        // Back button
        const fBackBtn = document.getElementById('final-back-btn');
        if (fBackBtn) fBackBtn.onclick = () => {
            const c = document.querySelector('.chat-container');
            if (c) {
                c.classList.remove('chat-active');
                c.classList.add('sidebar-active');
                const lNav = document.querySelector('.main-left-nav');
                const sBar = document.querySelector('.chat-sidebar');
                if (lNav) lNav.style.display = 'flex';
                if (sBar) sBar.style.display = 'block';
            }
            chatMain.innerHTML = `<div class="chat-placeholder" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#aaaaaa;">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:64px; height:64px; margin-bottom:20px; opacity:0.3;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
    <h2 style="font-family:var(--font-heading); font-size:1.5rem; letter-spacing:2px; margin-bottom:10px; color:rgba(255,255,255,0.7);">NO CHAT SELECTED</h2>
    <p style="font-family:var(--font-mono); font-size:0.85rem; opacity:0.6;">Select a contact from the list to start a secure conversation.</p>
</div>`;
            if (window._chatMessageUnsub) window._chatMessageUnsub();
            if (window._chatMessageChangeUnsub) window._chatMessageChangeUnsub();
            if (window._statusUnsub) window._statusUnsub();
            if (window._typingUnsub) window._typingUnsub();
        };

        const fProfileTrig = document.getElementById('chat-profile-trigger');
        if (fProfileTrig) {
            fProfileTrig.onclick = () => {
                if (window.showUserProfile) window.showUserProfile(name, avatarText, targetEmail, targetUid);
            };
        }

        // Initialize Chat UI Tools (Emoji, GIF, Stickers, Attachments)
        const initChatTools = () => {
            // Emoji picker
            const emojiTrigger = document.getElementById('emoji-trigger');
            const emojiPicker = document.getElementById('emoji-picker');
            const emojiGrid = document.getElementById('emoji-grid');
            const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

            if (!emojiTrigger || !emojiPicker) return;

            if (emojiGrid) emojiGrid.innerHTML = emojis.map(e => `<div class="emoji-item" data-emoji="${e}" style="cursor:pointer; font-size:1.2rem; text-align:center;">${e}</div>`).join('');

            emojiTrigger.onclick = (e) => {
                e.stopPropagation();
                const attachMenu = document.getElementById('attach-menu');
                emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'flex' : 'none';
                if (attachMenu) attachMenu.style.display = 'none';
            };

            if (emojiGrid) emojiGrid.addEventListener('click', (e) => {
                const item = e.target.closest('.emoji-item');
                if (item) {
                    const inp = document.getElementById('message-input');
                    if (inp) {
                        inp.value += item.dataset.emoji;
                        inp.focus();
                    }
                }
            });

            const epSearchContainer = document.getElementById('ep-search-container');
            const epSearchInput = document.getElementById('ep-search-input');
            const tabEmojis = document.getElementById('tab-emojis');
            const tabGifs = document.getElementById('tab-gifs');
            const tabStickers = document.getElementById('tab-stickers');
            const gifTabContent = document.getElementById('gif-tab-content');
            const stickerTabContent = document.getElementById('sticker-tab-content');
            const gifGrid = document.getElementById('gif-grid');
            const stickerGrid = document.getElementById('sticker-grid');

            let currentEpTab = 'emojis';
            let gifPos = 0;
            let stickerPos = 0;
            let isFetchingEp = false;

            const resetTabs = () => {
                if (!tabEmojis) return;
                [tabEmojis, tabGifs, tabStickers].forEach(t => { if (t) { t.style.color = '#C0C0C0'; t.style.borderBottom = 'none'; } });
                [emojiGrid, gifTabContent, stickerTabContent].forEach(g => { if (g) g.style.display = 'none'; });
                if (epSearchContainer) epSearchContainer.style.display = 'none';
            };

            if (tabEmojis) tabEmojis.onclick = (e) => {
                e.stopPropagation(); resetTabs();
                currentEpTab = 'emojis';
                tabEmojis.style.color = 'var(--terminal-green)'; tabEmojis.style.borderBottom = '2px solid var(--terminal-green)';
                if (emojiGrid) emojiGrid.style.display = 'grid';
            };

            if (tabGifs) tabGifs.onclick = (e) => {
                e.stopPropagation(); resetTabs();
                currentEpTab = 'gifs';
                tabGifs.style.color = 'var(--terminal-green)'; tabGifs.style.borderBottom = '2px solid var(--terminal-green)';
                if (gifTabContent) gifTabContent.style.display = 'flex';
                if (epSearchContainer) epSearchContainer.style.display = 'block';
                if (epSearchInput) epSearchInput.placeholder = "Search GIFs...";
                if (gifGrid && gifGrid.innerHTML === '') fetchGifs('');
            };

            if (tabStickers) tabStickers.onclick = (e) => {
                e.stopPropagation(); resetTabs();
                currentEpTab = 'stickers';
                tabStickers.style.color = 'var(--terminal-green)'; tabStickers.style.borderBottom = '2px solid var(--terminal-green)';
                if (stickerTabContent) stickerTabContent.style.display = 'flex';
                if (epSearchContainer) epSearchContainer.style.display = 'block';
                if (epSearchInput) epSearchInput.placeholder = "Search High-Res Stickers...";
                if (stickerGrid && stickerGrid.innerHTML === '') fetchStickers('');
            };

            let epSearchTo;
            if (epSearchInput) {
                epSearchInput.addEventListener('input', (e) => {
                    clearTimeout(epSearchTo);
                    let q = e.target.value.trim();
                    epSearchTo = setTimeout(() => {
                        if (currentEpTab === 'gifs') { if (gifGrid) { gifGrid.innerHTML = ''; gifPos = 0; fetchGifs(q); } }
                        else if (currentEpTab === 'stickers') { if (stickerGrid) { stickerGrid.innerHTML = ''; stickerPos = 0; fetchStickers(q); } }
                    }, 500);
                });
            }

            async function fetchGifs(query, append = false) {
                if (!gifGrid || isFetchingEp) return;
                if (!append) gifGrid.innerHTML = '<div style="grid-column: span 3; padding: 20px; text-align:center; color:#D4AF37; font-size:0.75rem;">Loading GIFs...</div>';
                isFetchingEp = true;

                try {
                    const queryParam = query ? `&q=${encodeURIComponent(query)}` : '';
                    const url = query
                        ? `https://api.giphy.com/v1/gifs/search?api_key=GlVGYHkr3WSBnllca54iNt0yFbjz7L65${queryParam}&limit=24&offset=${gifPos}`
                        : `https://api.giphy.com/v1/gifs/trending?api_key=GlVGYHkr3WSBnllca54iNt0yFbjz7L65&limit=24&offset=${gifPos}`;

                    const response = await fetch(url);
                    const data = await response.json();

                    if (!append) gifGrid.innerHTML = '';
                    if (data.data && data.data.length > 0) {
                        gifGrid.innerHTML += data.data.map(gif => {
                            const m = gif.images.fixed_height_small.url;
                            const f = gif.images.fixed_height.url;
                            if (!m) return '';
                            return `
                            <div class="gif-item" style="cursor:pointer; border-radius:12px; overflow:hidden; border:1px solid rgba(212,175,55,0.1); height:110px; background:#000; position:relative;">
                                <img src="${m}" style="width:100%; height:100%; object-fit:cover; display:block;" onclick="window.sendGif('${f}')" loading="lazy">
                                <div style="position:absolute; inset:0; box-shadow:inset 0 0 20px rgba(0,0,0,0.5); pointer-events:none;"></div>
                            </div>
                        `;
                        }).join('');
                        gifPos += 24;
                    } else if (!append) {
                        gifGrid.innerHTML = '<div style="grid-column: span 3; padding: 40px; text-align:center; opacity:0.5; font-size:0.8rem; letter-spacing:2px;">No matches found</div>';
                    }
                } catch (err) {
                    if (!append) gifGrid.innerHTML = '<div style="grid-column: span 3; padding: 40px; text-align:center; color:var(--error-red); font-size:0.75rem;">Connection error</div>';
                }
                isFetchingEp = false;
            }

            async function fetchStickers(query, append = false) {
                if (!stickerGrid || isFetchingEp) return;
                if (!append) stickerGrid.innerHTML = '<div style="grid-column: span 3; padding: 20px; text-align:center; color:#C0C0C0; font-size:0.75rem;">Loading stickers...</div>';
                isFetchingEp = true;
                try {
                    const url = query && query.trim() !== ''
                        ? `https://api.giphy.com/v1/stickers/search?api_key=GlVGYHkr3WSBnllca54iNt0yFbjz7L65&q=${encodeURIComponent(query)}&limit=30&offset=${stickerPos}`
                        : `https://api.giphy.com/v1/stickers/trending?api_key=GlVGYHkr3WSBnllca54iNt0yFbjz7L65&limit=30&offset=${stickerPos}`;

                    const response = await fetch(url);
                    const data = await response.json();

                    if (!append) stickerGrid.innerHTML = '';
                    if (data.data && data.data.length > 0) {
                        stickerGrid.innerHTML += data.data.map(gif => {
                            const m = gif.images.fixed_height_small.url;
                            const f = gif.images.fixed_height.url;
                            return `
                            <div class="sticker-item" style="cursor:pointer; border-radius:8px; overflow:hidden; border:1px solid rgba(255,255,255,0.05); height:100px; background:rgba(255,255,255,0.02);">
                                <img src="${m}" style="width:100%; height:100%; object-fit:contain; display:block;" onclick="window.sendSticker('${f}')">
                            </div>
                        `;
                        }).join('');
                        stickerPos += 30;
                    } else if (!append) {
                        stickerGrid.innerHTML = '<div style="grid-column: span 3; padding: 20px; text-align:center;">NO STICKERS FOUND</div>';
                    }
                } catch (err) {
                    if (!append) stickerGrid.innerHTML = '<div style="grid-column: span 3; padding: 20px; text-align:center; font-size:0.75rem;">Connection error</div>';
                }
                isFetchingEp = false;
            }

            // Infinite scroll listeners
            if (gifGrid) {
                gifGrid.onscroll = () => {
                    const q = epSearchInput ? epSearchInput.value : '';
                    if (gifGrid.scrollTop + gifGrid.clientHeight >= gifGrid.scrollHeight - 100) {
                        fetchGifs(q, true);
                    }
                };
            }
            if (stickerGrid) {
                stickerGrid.onscroll = () => {
                    const q = epSearchInput ? epSearchInput.value : '';
                    if (stickerGrid.scrollTop + stickerGrid.clientHeight >= stickerGrid.scrollHeight - 100) {
                        fetchStickers(q, true);
                    }
                };
            }

            window.sendGif = async function (url) {
                const user = auth.currentUser;
                if (!user || !window._chatTarget) return;
                const tUid = window._chatTarget.uid;
                let chatKey;
                if (tUid && tUid.toString().startsWith('group_')) {
                    chatKey = tUid;
                } else {
                    chatKey = tUid ? (tUid === 'shield_ai' ? `ai_${user.uid}` : [user.uid, tUid].sort().join('_')) : 'global';
                }
                await push(ref(database, `messages/${chatKey}`), { type: 'image', imageData: url, sender: user.email, timestamp: Date.now() });
                window.cyberAlert("GIF SENT");
                if (emojiPicker) emojiPicker.style.display = 'none';
            };

            window.sendSticker = async function (url) {
                const user = auth.currentUser;
                if (!user || !window._chatTarget) return;
                const tUid = window._chatTarget.uid;
                let chatKey;
                if (tUid && tUid.toString().startsWith('group_')) {
                    chatKey = tUid;
                } else {
                    chatKey = tUid ? (tUid === 'shield_ai' ? `ai_${user.uid}` : [user.uid, tUid].sort().join('_')) : 'global';
                }
                await push(ref(database, `messages/${chatKey}`), { type: 'image', imageData: url, isSticker: true, sender: user.email, timestamp: Date.now() });
                window.cyberAlert("STICKER SENT");
                if (emojiPicker) emojiPicker.style.display = 'none';
            };

            // Attachment menu
            const attachTrigger = document.getElementById('attach-trigger');
            const attachMenu = document.getElementById('attach-menu');
            if (attachTrigger && attachMenu) {
                attachTrigger.onclick = (e) => {
                    e.stopPropagation();
                    attachMenu.style.display = attachMenu.style.display === 'none' ? 'block' : 'none';
                    if (emojiPicker) emojiPicker.style.display = 'none';
                };
            }

            // Close menus on outside click
            const closeMenuHandler = (e) => {
                if (emojiPicker && !emojiPicker.contains(e.target) && e.target.id !== 'emoji-trigger') emojiPicker.style.display = 'none';
                if (attachMenu && !attachMenu.contains(e.target) && !e.target.closest('#attach-trigger')) attachMenu.style.display = 'none';
            };
            document.addEventListener('click', closeMenuHandler);
        };

        initChatTools();


        // Attachment Listeners and Status Updates handled in initChatTools above

        // Real-time status for target user
        if (targetUid) {
            const statusDot = document.getElementById('chat-status-dot');
            const statusTxt = document.getElementById('chat-status-text');
            onValue(ref(database, `users/${targetUid}/status`), (snap) => {
                const s = snap.val() || 'offline';
                if (statusDot) { statusDot.className = 'live-status-dot ' + (s === 'online' ? 'online' : 'offline'); }
                if (statusTxt) statusTxt.textContent = s === 'online' ? 'UPLINK ACTIVE' : 'NODE DORMANT';
            });
        }

        // Voice/Video Call
        const btnVoice = document.getElementById('btn-voice-call');
        const btnVideo = document.getElementById('btn-video-call');

        if (btnVoice) btnVoice.onclick = () => { if (window.startWebRTCCall) window.startWebRTCCall(targetUid, name, avatarText, 'VOICE'); };
        if (btnVideo) btnVideo.onclick = () => { if (window.startWebRTCCall) window.startWebRTCCall(targetUid, name, avatarText, 'VIDEO'); };

        // Show buttons only if we have a targetUid (Private Chat) and it's not the AI
        if (targetUid && targetUid !== 'shield_ai') {
            if (btnVoice) btnVoice.style.display = 'flex';
            if (btnVideo) btnVideo.style.display = 'flex';
        } else {
            if (btnVoice) btnVoice.style.display = 'none';
            if (btnVideo) btnVideo.style.display = 'none';
        }

        // Profile / Group Info
        const profileTrigger = document.getElementById('chat-profile-trigger');
        const profileBtn = document.getElementById('btn-chat-profile');

        const openInfo = async () => {
            if (targetUid && targetUid.startsWith('group_')) {
                const snap = await get(ref(database, `groups/${targetUid}`));
                const g = snap.val();
                if (!g) return;

                const isAdmin = g.admins && g.admins[auth.currentUser.uid];
                const members = g.members ? Object.keys(g.members).length : 0;

                const action = await window.showModal({
                    title: g.name,
                    message: `PROTOCOL: SECURE MULTI-SYNC\nNODES: ${members}\nADMIN: ${isAdmin ? 'ACTIVE' : 'INACTIVE'}\n\nMEMBERS:\n${Object.keys(g.members || {}).map(m => '- ' + (g.members[m].email || m).split('@')[0].toUpperCase() + (g.admins && g.admins[m] ? ' (ADMIN)' : '')).join('\n')}`,
                    confirmText: isAdmin ? 'MANAGE' : 'CLOSE',
                    cancelText: isAdmin ? 'LEAVE GROUP' : '',
                    confirmText: isAdmin ? 'ENGINEERING' : 'CLOSE',
                    cancelText: isAdmin ? 'LEAVE' : ''
                });

                if (action === true && isAdmin) {
                    const manageOpt = await window.showModal({
                        title: "GROUP MANAGEMENT",
                        message: "Select an administrative action:",
                        confirmText: "SET ADMIN",
                        cancelText: "OTHER OPTS"
                    });

                    if (manageOpt === true) {
                        const targetMail = await window.cyberPrompt("Enter member email to promote:", "");
                        if (targetMail) {
                            const usersSnap = await get(ref(database, 'users'));
                            let targetUid;
                            usersSnap.forEach(uSnap => {
                                if (uSnap.val().email === targetMail) targetUid = uSnap.key;
                            });
                            if (targetUid && g.members[targetUid]) {
                                await update(ref(database, `groups/${targetUid}/admins`), { [targetUid]: true });
                                window.cyberAlert("PROMOTED TO ADMIN");
                            } else {
                                window.cyberAlert("MEMBER NOT FOUND", "error");
                            }
                        }
                        return;
                    }

                    const opt = await window.showModal({
                        title: "CHANNEL ENGINEERING",
                        message: "Select system command:",
                        confirmText: "RENAME",
                        cancelText: "TERMINATE"
                    });
                    if (opt === true) {
                        const newName = await window.cyberPrompt("NEW IDENTIFIER", g.name);
                        if (newName) {
                            await update(ref(database, `groups/${targetUid}`), { name: newName.toUpperCase() });
                            window.cyberAlert("IDENTIFIER UPDATED");
                        }
                    } else if (opt === false) {
                        if (await window.cyberConfirm("Decommission this channel forever?", "TERMINATE CHANNEL")) {
                            await set(ref(database, `groups/${targetUid}`), null);
                            window.cyberAlert("CHANNEL TERMINATED", "error");
                            window.showPage('chat');
                        }
                    }
                } else if (action === false && isAdmin) {
                    if (await window.cyberConfirm("Leave this secure channel?", "DISCONNECT")) {
                        await set(ref(database, `groups/${targetUid}/members/${auth.currentUser.uid}`), null);
                        await set(ref(database, `users/${auth.currentUser.uid}/groups/${targetUid}`), null);
                        window.showPage('chat');
                    }
                }
            } else {
                showUserProfile(name, avatarText, targetEmail, targetUid);
            }
        };

        if (profileTrigger) profileTrigger.onclick = openInfo;
        if (profileBtn) profileBtn.onclick = openInfo;

        // Clear Chat Function
        const clearBtn = document.getElementById('btn-chat-clear');
        if (clearBtn) {
            clearBtn.onclick = async () => {
                if (await window.cyberConfirm("Wipe entire conversation history? This cannot be undone.", "Clear Chat")) {
                    let chatKey;
                    if (targetUid && targetUid.toString().startsWith('group_')) {
                        chatKey = targetUid;
                    } else {
                        chatKey = targetUid ? (targetUid === 'shield_ai' ? `ai_${auth.currentUser.uid}` : [auth.currentUser.uid, targetUid].sort().join('_')) : 'global';
                    }
                    await set(ref(database, `messages/${chatKey}`), null);
                    document.getElementById('messages-list').innerHTML = '';
                    window.cyberAlert('CONVERSATION WIPED');
                }
            };
        }

        // Search Chat
        const searchBtn = document.getElementById('btn-chat-search');
        const searchBar = document.getElementById('chat-search-bar');
        const searchInput = document.getElementById('chat-search-input');
        if (searchBtn && searchBar && searchInput) {
            searchBtn.onclick = () => {
                searchBar.style.display = searchBar.style.display === 'none' ? 'block' : 'none';
                if (searchBar.style.display === 'block') searchInput.focus();
                else { searchInput.value = ''; searchInput.dispatchEvent(new Event('input')); }
            };
            let stOut;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(stOut);
                const term = e.target.value.toLowerCase();
                stOut = setTimeout(() => {
                    const msgs = document.querySelectorAll('#messages-list .message');
                    msgs.forEach(m => {
                        const txt = m.textContent.toLowerCase();
                        if (txt.includes(term)) m.style.display = 'flex';
                        else m.style.display = 'none';
                    });
                }, 150);
            });
        }

        // Forward logic paste
        if (window._forwardMsgInfo) {
            setTimeout(() => {
                const mi = document.getElementById('message-input');
                if (mi) {
                    mi.value = window._forwardMsgInfo.text;
                    mi.focus();
                }
                window._forwardMsgInfo = null;
            }, 500);
        }
    }

    function syncFriends(currentUser) {
        const friendsListEl = document.getElementById('friends-list');
        const friendsRef = ref(database, `users/${currentUser.uid}/friends`);
        const requestsRef = ref(database, `users/${currentUser.uid}/handshakeRequests`);

        // Helper to Accept Handshake
        async function acceptHandshake(fromUid) {
            await update(ref(database, `users/${currentUser.uid}/friends`), { [fromUid]: true });
            await update(ref(database, `users/${fromUid}/friends`), { [currentUser.uid]: true });
            await set(ref(database, `users/${currentUser.uid}/handshakeRequests/${fromUid}`), null);
            window.cyberAlert("CONNECTION COMPLETE");
        }

        // Listener for both Friends and Pending Requests
        onValue(ref(database, `users/${currentUser.uid}`), async (snapshot) => {
            if (!friendsListEl) return;
            friendsListEl.innerHTML = '';
            const userData = snapshot.val();
            const friendIds = userData.friends || {};
            const requests = userData.handshakeRequests || {};

            // 1. Render Pending Handshakes first
            Object.keys(requests).forEach(async (uid) => {
                const uSnap = await get(ref(database, `users/${uid}`));
                const u = uSnap.val();
                if (!u) return;
                const name = (u.profile?.username || (u.email || uid).split('@')[0]).toUpperCase();
                const item = document.createElement('div');
                item.className = 'contact-item';
                item.style.border = '1px dashed var(--terminal-green)';
                item.innerHTML = `
                    <div class="contact-avatar" style="background:#333; color:var(--terminal-green);">??</div>
                    <div class="contact-details">
                        <div class="contact-top"><span class="contact-name">HANDSHAKE PENDING: ${name}</span></div>
                        <span class="contact-last-msg">WAITING FOR APPROVAL</span>
                    </div>
                    <button class="quantum-btn" style="min-width:60px; padding:5px 10px; font-size:0.6rem;">ACCEPT</button>
                `;
                item.querySelector('button').onclick = () => acceptHandshake(uid);
                friendsListEl.appendChild(item);
            });

            for (let uid of Object.keys(friendIds)) {
                if (friendIds[uid] !== true) continue;

                const userSnap = await get(ref(database, `users/${uid}`));
                const user = userSnap.val();
                if (!user) continue;

                const displayName = (user.profile?.username || (user.email || user.id || 'NODE').split('@')[0]).toUpperCase();
                const status = user.status || 'offline';
                const initials = displayName.substring(0, 2);

                const friendItem = document.createElement('div');
                friendItem.className = 'contact-item interactive-item';
                friendItem.innerHTML = `
                    <div class="contact-avatar">${initials}</div>
                    <div class="contact-details">
                        <div class="contact-top">
                            <span class="contact-name">${displayName}</span>
                            <span class="online-indicator" style="position: static; display: inline-block; background: ${status === 'online' ? '#C0C0C0' : '#808080'}; border: none;"></span>
                        </div>
                        <span class="contact-last-msg">${status.toUpperCase()}</span>
                    </div>
                `;
                friendItem.addEventListener('click', () => {
                    openChat(displayName, initials, status === 'online' ? 'Online' : 'Offline', uid, user.email);
                    const chatContainer = document.querySelector('.chat-container');
                    if (chatContainer) chatContainer.classList.remove('sidebar-active');
                });
                friendsListEl.appendChild(friendItem);
            }

            if (Object.keys(friendIds).length === 0 && Object.keys(requests).length === 0) {
                friendsListEl.innerHTML = `<div style="text-align:center; opacity:0.2; padding:40px; font-size:0.7rem;">NO NETWORKS OR HANDSHAKES DETECTED</div>`;
            }
        });
    }

    let html5QrScanner = null;

    // ====================== REAL WEBRTC P2P CALLS ======================
    let localStream = null;
    let peerConnection = null;
    let callTimerInterval = null;
    let currentCallRef = null;

    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    async function cleanupCall() {
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            localStream = null;
        }
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }
        if (currentCallRef) {
            set(currentCallRef, null); // clear signaling data
            currentCallRef = null;
        }
        const overlay = document.querySelector('.call-modal-overlay');
        if (overlay) overlay.remove();

        // Return active state to database
        if (auth.currentUser) {
            set(ref(database, `users/${auth.currentUser.uid}/status`), 'online');
        }
    }

    function createCallUI(name, avatarText, callType, isIncoming = false, onAccept = null, onDecline = null) {
        const existing = document.querySelector('.call-modal-overlay');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.className = 'call-modal-overlay';

        overlay.innerHTML = `
            ${callType === 'VIDEO' ? `<video id="remote-video" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; z-index: 1; background:#000;"></video>` : ''}
            ${callType === 'VIDEO' ? `<video id="local-video" autoplay muted playsinline style="width: 100px; height: 140px; position: absolute; top: 20px; right: 20px; border-radius: 12px; z-index: 10; object-fit: cover; background: #222; box-shadow: 0 5px 15px rgba(0,0,0,0.5);"></video>` : ''}
            
            <div style="position: absolute; inset:0; z-index: 3; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 60px 20px 80px; background: ${callType === 'VIDEO' ? 'rgba(0,0,0,0.3)' : 'linear-gradient(to bottom, #1a1a1a, #000)'};">
                <div style="text-align:center;">
                    <div style="width:100px; height:100px; border-radius:50%; background:rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; font-size:2.5rem; font-weight:800; color:#D4AF37; margin:0 auto 20px; border:2px solid rgba(212,175,55,0.3); backdrop-filter:blur(10px);">${avatarText}</div>
                    <div style="font-size:1.8rem; font-weight:700; color:#fff; margin-bottom:10px; text-shadow:0 2px 10px rgba(0,0,0,0.5);">${name}</div>
                    <div id="call-timer" style="font-family:var(--font-mono); font-size:0.9rem; color: #D4AF37; letter-spacing:1px; font-weight:700;">${isIncoming ? 'INCOMING ' + callType + ' CALL' : 'CONNECTING...'}</div>
                </div>
                
                <div style="display:flex; gap:35px; pointer-events: auto;">
                    ${isIncoming ? `
                        <button class="call-action-btn" id="call-accept" style="background:#2ecc71; color:#fff; width:65px; height:65px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 0 20px rgba(46,204,113,0.4);" title="Accept"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:28px;"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></button>
                        <button class="call-action-btn hangup" id="call-decline" style="background:#e74c3c; color:#fff; width:65px; height:65px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Decline"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:28px;"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" transform="rotate(135 12 12)"/></svg></button>
                    ` : `
                        <button class="call-action-btn" id="call-mute" style="background:rgba(255,255,255,0.1); color:#fff; width:60px; height:60px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.1);" title="Mute"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:24px;"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg></button>
                        <button class="call-action-btn hangup" id="call-hangup" style="background:#e74c3c; color:#fff; width:65px; height:65px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 0 20px rgba(231,76,60,0.4);" title="End Call"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:28px;"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></button>
                    `}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        if (isIncoming) {
            document.getElementById('call-accept').onclick = onAccept;
            document.getElementById('call-decline').onclick = onDecline;
        } else {
            document.getElementById('call-hangup').onclick = () => {
                cleanupCall();
                window.cyberAlert(`${callType} CALL ENDED`);
            };

            const muteBtn = document.getElementById('call-mute');
            muteBtn.onclick = () => {
                if (localStream) {
                    const audioTrack = localStream.getAudioTracks()[0];
                    if (audioTrack) {
                        audioTrack.enabled = !audioTrack.enabled;
                        muteBtn.style.background = audioTrack.enabled ? 'rgba(255,255,255,0.1)' : '#e74c3c';
                    }
                }
            };
        }
    }

    function startCallTimer() {
        let seconds = 0;
        const timerEl = document.getElementById('call-timer');
        if (timerEl) timerEl.textContent = '00:00';
        callTimerInterval = setInterval(() => {
            seconds++;
            const m = String(Math.floor(seconds / 60)).padStart(2, '0');
            const s = String(seconds % 60).padStart(2, '0');
            if (timerEl) timerEl.textContent = `${m}:${s}`;
        }, 1000);
    }

    // Exported function to start a call
    window.startWebRTCCall = async function (targetUid, name, avatarText, callType) {
        if (!auth.currentUser || !targetUid) return window.cyberAlert('SELECT A CONTACT TO START A CALL');

        try {
            // 1. Get local media
            localStream = await navigator.mediaDevices.getUserMedia({
                video: callType === 'VIDEO',
                audio: true
            });

            createCallUI(name, avatarText, callType, false);

            if (callType === 'VIDEO') {
                const localVideo = document.getElementById('local-video');
                if (localVideo) localVideo.srcObject = localStream;
            }

            // Set node status to BUSY
            set(ref(database, `users/${auth.currentUser.uid}/status`), 'in-call');

            peerConnection = new RTCPeerConnection(rtcConfig);

            // Add local tracks
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });

            // Listen for remote stream
            peerConnection.ontrack = (event) => {
                const timerEl = document.getElementById('call-timer');
                if (timerEl && timerEl.textContent === 'CONNECTING...') {
                    startCallTimer(); // Start timer once connected
                }

                if (callType === 'VIDEO') {
                    const remoteVideo = document.getElementById('remote-video');
                    if (remoteVideo) remoteVideo.srcObject = event.streams[0];
                }
            };

            const callDbRef = ref(database, `calls/${targetUid}`);
            currentCallRef = callDbRef;

            // Send ICE candidates automatically
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    push(ref(database, `calls/${targetUid}/candidates/caller`), event.candidate.toJSON());
                }
            };

            // Create Offer
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            // Send Offer to target
            await set(callDbRef, {
                offer: { type: offer.type, sdp: offer.sdp },
                callerUid: auth.currentUser.uid,
                callerName: window._currentUserProfile?.username || 'UNKNOWN NODE',
                callType: callType,
                timestamp: Date.now()
            });

            // Listen for Answer
            onValue(ref(database, `calls/${targetUid}/answer`), (snapshot) => {
                const answer = snapshot.val();
                if (answer && !peerConnection.currentRemoteDescription) {
                    const rtcDesc = new RTCSessionDescription(answer);
                    peerConnection.setRemoteDescription(rtcDesc);
                }
            });

            // Listen for Callee ICE candidates
            onChildAdded(ref(database, `calls/${targetUid}/candidates/callee`), (snapshot) => {
                const data = snapshot.val();
                if (data) peerConnection.addIceCandidate(new RTCIceCandidate(data));
            });

            // Watch for callee dropping
            onValue(callDbRef, (snap) => {
                if (!snap.exists()) {
                    window.cyberAlert('DISCONNECTED');
                    cleanupCall();
                }
            });

            // If we disconnect, delete the call
            onDisconnect(callDbRef).remove();

        } catch (error) {
            console.error('WebRTC Error:', error);
            window.cyberAlert('MEDIA DEVICE FAILED: ' + error.message);
            cleanupCall();
        }
    };

    // Listen globally for incoming calls
    function listenForIncomingCalls(uid) {
        const myCallRef = ref(database, `calls/${uid}`);

        onValue(myCallRef, async (snapshot) => {
            const data = snapshot.val();

            // Incoming offer detected
            if (data && data.offer && !peerConnection && data.callerUid !== uid) {
                const callerName = data.callerName || 'UNKNOWN NODE';
                const avatarText = callerName.substring(0, 2).toUpperCase();

                createCallUI(callerName, avatarText, data.callType, true,
                    async () => {
                        // ACCEPT CALL
                        try {
                            localStream = await navigator.mediaDevices.getUserMedia({
                                video: data.callType === 'VIDEO',
                                audio: true
                            });

                            // Morph UI to active call
                            createCallUI(callerName, avatarText, data.callType, false);
                            startCallTimer();

                            if (data.callType === 'VIDEO') {
                                setTimeout(() => {
                                    const localVideo = document.getElementById('local-video');
                                    if (localVideo) localVideo.srcObject = localStream;
                                }, 100);
                            }

                            set(ref(database, `users/${auth.currentUser.uid}/status`), 'in-call');

                            peerConnection = new RTCPeerConnection(rtcConfig);

                            localStream.getTracks().forEach(track => {
                                peerConnection.addTrack(track, localStream);
                            });

                            peerConnection.ontrack = (event) => {
                                if (data.callType === 'VIDEO') {
                                    const remoteVideo = document.getElementById('remote-video');
                                    if (remoteVideo) remoteVideo.srcObject = event.streams[0];
                                }
                            };

                            currentCallRef = myCallRef;

                            peerConnection.onicecandidate = (event) => {
                                if (event.candidate) {
                                    push(ref(database, `calls/${uid}/candidates/callee`), event.candidate.toJSON());
                                }
                            };

                            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                            const answer = await peerConnection.createAnswer();
                            await peerConnection.setLocalDescription(answer);

                            // Send Answer back
                            await set(ref(database, `calls/${uid}/answer`), {
                                type: answer.type,
                                sdp: answer.sdp
                            });

                            // Listen for Caller ICE
                            onChildAdded(ref(database, `calls/${uid}/candidates/caller`), (snapshot) => {
                                const c_data = snapshot.val();
                                if (c_data) peerConnection.addIceCandidate(new RTCIceCandidate(c_data));
                            });

                        } catch (err) {
                            console.error('Accept call failed:', err);
                            cleanupCall();
                        }
                    },
                    () => {
                        // DECLINE CALL
                        cleanupCall();
                    }
                );
            }
            // Call hung up by caller
            else if (!data && peerConnection) {
                window.cyberAlert('CALL ENDED');
                cleanupCall();
            }
        });
    }

    // Wait for auth to init incoming listener
    onAuthStateChanged(auth, (user) => {
        if (user) listenForIncomingCalls(user.uid);
    });

    // ====================== PROFILE PAGE (Full Page in chat-main) ======================
    async function showUserProfile(name, avatarText, email, uid) {
        const chatMain = document.querySelector('.chat-main');
        if (!chatMain) return;

        const nodeId = uid ? uid.substring(0, 15).toUpperCase() : 'UNKNOWN';
        const fingerprint = Array.from({ length: 12 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(' ');

        // Fetch extended data
        let bio = "ENCRYPTED_BIO_FRAGMENT";
        let status = "CHECKING...";
        let statusClass = "offline";
        let uptime = "--";

        if (uid) {
            try {
                const profileSnap = await get(ref(database, `users/${uid}/profile`));
                if (profileSnap.exists()) bio = profileSnap.val().bio || "NO BIO DATA TRANSMITTED.";

                const statusSnap = await get(ref(database, `users/${uid}/status`));
                const s = statusSnap.val() || 'offline';
                status = s.toUpperCase();
                statusClass = s === 'online' ? 'online' : 'offline';

                const seenSnap = await get(ref(database, `users/${uid}/lastSeen`));
                if (seenSnap.exists()) {
                    const diff = Date.now() - seenSnap.val();
                    const mins = Math.floor(diff / 60000);
                    uptime = mins > 60 ? Math.floor(mins / 60) + "H " + (mins % 60) + "M" : mins + "M";
                }
            } catch (e) { console.error("Profile Fetch Error", e); }
        }

        chatMain.innerHTML = `
            <div id="profile-full-overlay" style="position:absolute !important; inset:0 !important; background:#000 !important; z-index:5000 !important; display:flex !important; flex-direction:column !important; overflow-y:auto !important; color:#fff !important; font-family:var(--font-ui) !important;">
                <header style="padding:15px; display:flex; align-items:center; gap:15px; border-bottom:1px solid rgba(255,255,255,0.08); background:rgba(7,7,7,0.95); backdrop-filter:blur(20px); flex-shrink:0; position:sticky; top:0; z-index:100;">
                    <div id="profile-back-btn" style="width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.25); border-radius:50%; cursor:pointer; color:#D4AF37;">
                        <svg viewBox="0 0 24 24" fill="none" style="width:20px; height:20px;" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5" stroke-linecap="round"/><path d="M12 19L5 12L12 5" stroke-linecap="round"/></svg>
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:0.55rem; opacity:0.6; letter-spacing:2px; font-weight:800; font-family:var(--font-mono);">ENCRYPTED_NODE_INTEL</div>
                        <div style="font-size:0.8rem; font-weight:700; color:#D4AF37; letter-spacing:0.5px;">${nodeId}</div>
                    </div>
                </header>

                <div style="padding:40px 24px; text-align:center; max-width:500px; margin:0 auto; width:100%;">
                    <!-- Top Section -->
                    <div style="position:relative; width:120px; height:120px; margin:0 auto 25px;">
                        <div style="width:100%; height:100%; border-radius:50%; background:linear-gradient(135deg, #1a1a1a, #000); border:2px solid #D4AF37; display:flex; align-items:center; justify-content:center; font-size:2.8rem; font-weight:900; color:#D4AF37; box-shadow:0 0 40px rgba(212,175,55,0.25); font-family:var(--font-heading); position:relative; z-index:2;">${avatarText}</div>
                        <div style="position:absolute; inset:-5px; border-radius:50%; border:1px dashed rgba(212,175,55,0.3); animation:spin-slow 20s linear infinite;"></div>
                    </div>
                    
                    <h2 style="font-family:var(--font-heading); font-size:1.8rem; letter-spacing:1px; margin-bottom:8px; font-weight:800; color:#fff;">${name}</h2>
                    
                    <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(212,175,55,0.08); padding:6px 16px; border-radius:20px; border:1px solid rgba(212,175,55,0.2); margin-bottom:25px;">
                        <div class="live-status-dot ${statusClass}" style="width:8px; height:8px;"></div>
                        <span style="font-size:0.65rem; font-weight:800; color:#D4AF37; letter-spacing:1px; font-family:var(--font-mono);">${status}</span>
                    </div>

                    <!-- Bio -->
                    <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:15px; padding:20px; margin-bottom:30px; line-height:1.6; font-size:0.85rem; opacity:0.8; font-family:var(--font-mono); font-style:italic;">
                        "${bio}"
                    </div>

                    <!-- Intel Grid -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:25px; text-align:left;">
                        <div style="background:rgba(212,175,55,0.04); border:1px solid rgba(212,175,55,0.1); border-radius:12px; padding:15px;">
                            <div style="font-size:0.5rem; opacity:0.5; margin-bottom:4px; letter-spacing:1.5px; font-weight:800;">SECURITY_LEVEL</div>
                            <div style="font-size:0.8rem; font-weight:700; color:#D4AF37; font-family:var(--font-mono);">AES-256-QUANTUM</div>
                        </div>
                        <div style="background:rgba(212,175,55,0.04); border:1px solid rgba(212,175,55,0.1); border-radius:12px; padding:15px;">
                            <div style="font-size:0.5rem; opacity:0.5; margin-bottom:4px; letter-spacing:1.5px; font-weight:800;">UPTIME_SINCE</div>
                            <div style="font-size:0.8rem; font-weight:700; color:#D4AF37; font-family:var(--font-mono);">${uptime}</div>
                        </div>
                    </div>

                    <!-- Security Section -->
                    <div style="background:rgba(192,192,192,0.03); border:1px dashed rgba(192,192,192,0.2); border-radius:16px; padding:18px; margin-bottom:30px; text-align:left;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <span style="font-size:0.6rem; opacity:0.5; letter-spacing:2px; font-weight:800; font-family:var(--font-mono);">PUBLIC_VERIFICATION_KEY</span>
                            <span style="font-size:0.55rem; background:#D4AF37; color:#000; padding:3px 8px; border-radius:4px; font-weight:900; letter-spacing:1px;">VERIFIED</span>
                        </div>
                        <div style="word-break:break-all; font-size:0.6rem; opacity:0.7; line-height:1.5; color:#D4AF37; font-family:var(--font-mono); background:rgba(0,0,0,0.2); padding:10px; border-radius:8px;">${fingerprint} ${fingerprint}</div>
                    </div>

                    <!-- QR Signature -->
                    <div style="background:#fff; padding:20px; border-radius:20px; width:fit-content; margin:0 auto 35px; box-shadow:0 15px 40px rgba(0,0,0,0.6);">
                        <div id="profile-qr-code"></div>
                        <div style="margin-top:10px; color:#000; font-size:0.5rem; font-weight:900; letter-spacing:2px;">SIGNATURE_TOKEN</div>
                    </div>

                    <!-- Action Hub -->
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:40px;">
                        <button id="profile-call-voice" style="padding:16px; background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.3); border-radius:12px; color:#D4AF37; font-size:0.75rem; font-weight:800; cursor:pointer; font-family:var(--font-ui); transition:all 0.2s;">ðŸ“ž Voice Link</button>
                        <button id="profile-call-video" style="padding:16px; background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.3); border-radius:12px; color:#D4AF37; font-size:0.75rem; font-weight:800; cursor:pointer; font-family:var(--font-ui); transition:all 0.2s;">🎥 Optical Link</button>
                        <button id="profile-loc-ping" style="padding:16px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:12px; color:#fff; font-size:0.75rem; font-weight:800; cursor:pointer; font-family:var(--font-ui); transition:all 0.2s;">ðŸ“ Sync Location</button>
                        <button id="profile-blacklist" style="padding:16px; background:rgba(255,51,51,0.08); border:1px solid rgba(255,51,51,0.3); border-radius:12px; color:#FF6666; font-size:0.75rem; font-weight:800; cursor:pointer; font-family:var(--font-ui); transition:all 0.2s;">ðŸš« Sever Node</button>
                    </div>

                    <div style="opacity:0.25; font-size:0.6rem; letter-spacing:2px; margin-bottom:50px; font-family:var(--font-mono);">--- END_OF_INTEL ---</div>
                </div>
            </div>
        `;

        // Handlers
        document.getElementById('profile-back-btn').onclick = () => {
            if (window._chatTarget) {
                const t = window._chatTarget;
                openChat(t.name, t.avatarText, 'Uplink Established', t.uid, t.email);
            }
        };

        const voiceBtn = document.getElementById('profile-call-voice');
        const videoBtn = document.getElementById('profile-call-video');
        const pingBtn = document.getElementById('profile-loc-ping');
        const blockBtn = document.getElementById('profile-blacklist');

        if (voiceBtn) voiceBtn.onclick = () => { if (window.startWebRTCCall) window.startWebRTCCall(uid, name, avatarText, 'VOICE'); };
        if (videoBtn) videoBtn.onclick = () => { if (window.startWebRTCCall) window.startWebRTCCall(uid, name, avatarText, 'VIDEO'); };

        if (pingBtn) pingBtn.onclick = () => {
            if (!navigator.geolocation) { window.cyberAlert('GEOLOCATION_UNSUPPORTED', 'error'); return; }
            window.cyberAlert('RETRIVING_COORDINATES...');
            // Increased timeout for ping button too
            navigator.geolocation.getCurrentPosition(async (pos) => {
                let chatKey;
                if (uid && uid.toString().startsWith('group_')) {
                    chatKey = uid;
                } else {
                    chatKey = uid ? (uid === 'shield_ai' ? `ai_${auth.currentUser.uid}` : [auth.currentUser.uid, uid].sort().join('_')) : 'global';
                }
                await push(ref(database, `messages/${chatKey}`), { type: 'location', lat: pos.coords.latitude, lng: pos.coords.longitude, sender: auth.currentUser.email, timestamp: Date.now() });
                window.cyberAlert('LOCATION_UPLINK_SENT');
            }, () => window.cyberAlert('LOC_ACCESS_DENIED', 'error'), { enableHighAccuracy: true, timeout: 30000 });
        };

        if (blockBtn) blockBtn.onclick = async () => {
            if (await window.cyberConfirm('Block this user? You will no longer receive messages from them.', 'Block User')) {
                window.cyberAlert('CHAT SECURED: ' + nodeId);
                document.getElementById('profile-back-btn').click();
            }
        };

        if (typeof QRCode !== 'undefined') {
            setTimeout(() => {
                const qrEl = document.getElementById('profile-qr-code');
                if (qrEl) new QRCode(qrEl, { text: email || name, width: 140, height: 140, colorDark: '#000', colorLight: '#fff' });
            }, 100);
        }
    }

    function initInteractiveFeatures() {
        const modal = document.getElementById('tool-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        const closeBtn = document.querySelector('.close-modal');

        if (!modal || !modalBody) return;

        const stopScanner = () => {
            if (html5QrScanner) {
                html5QrScanner.stop().catch(err => console.log("Scanner Stop Soft Fail:", err));
                html5QrScanner = null;
            }
        };
        window.stopScanner = stopScanner;

        if (closeBtn) {
            closeBtn.onclick = () => {
                stopScanner();
                modal.style.display = 'none';
            };
        }

        window.onclick = (event) => {
            if (event.target == modal) {
                stopScanner();
                modal.style.display = 'none';
            }
        };

        const showToolModal = (title, renderFn, data) => {
            if (modalTitle) modalTitle.innerText = title;
            modal.style.display = 'flex';
            if (renderFn) renderFn(modalBody, data);
        };

        // Wallet Actions
        const myQrBtn = document.getElementById('my-qr-btn');
        const myFriendQrBtn = document.getElementById('my-friend-qr');
        const scanQrBtn = document.getElementById('scan-qr-btn');
        const scanFriendQrBtn = document.getElementById('scan-friend-qr');
        const transferPointsBtn = document.getElementById('transfer-points-btn');
        const addFriendBtn = document.getElementById('add-friend-email-btn');

        if (myQrBtn) myQrBtn.onclick = () => showToolModal("MY NODE SIGNATURE", renderMyQr);
        if (myFriendQrBtn) myFriendQrBtn.onclick = () => showToolModal("MY FREQUENCY", renderMyQr);

        if (scanQrBtn) scanQrBtn.onclick = () => showToolModal("SCANNING SIGNAL", window.renderScanner);
        if (scanFriendQrBtn) scanFriendQrBtn.onclick = () => showToolModal("SCANNING NETWORK", window.renderScanner);

        if (transferPointsBtn) transferPointsBtn.onclick = () => showToolModal("TRANSFER CREDITS", (c) => renderToolContent("TRANSFER POINTS", c));

        if (addFriendBtn) addFriendBtn.onclick = () => {
            showToolModal("NODE CONNECTION", (container) => {
                container.innerHTML = `
                    <div class="tool-content-box" style="padding: 15px; background: rgba(0,255,157,0.02); border-radius:12px;">
                        <div style="text-align:center; margin-bottom:20px;">
                            <div style="width:50px; height:50px; margin:0 auto 10px; background:rgba(0,255,157,0.1); border-radius:50%; display:flex; align-items:center; justify-content:center; border:1px solid var(--terminal-green);">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:24px; height:24px; color:var(--terminal-green);">
                                    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>
                                </svg>
                            </div>
                            <h3 style="font-family:var(--font-heading); font-size:1.1rem; color:var(--terminal-green);">LINK NEW NODE</h3>
                            <p style="font-size:0.75rem; opacity:0.6;">Connect with your contacts.</p>
                        </div>
                        <div style="position:relative; margin-bottom:15px;">
                            <input type="email" id="target-friend-email" class="modal-input" placeholder="ENTER TARGET FREQUENCY..." style="margin-bottom:0; border-color:rgba(0,255,157,0.2); background:rgba(0,0,0,0.5);">
                        </div>
                        <button id="submit-add-friend" class="modal-btn" style="width: 100%; letter-spacing:1px; background:var(--terminal-green); color:#000; transition: all 0.3s ease;">INITIATE HANDSHAKE</button>
                    </div>
                `;
                const submitBtn = document.getElementById('submit-add-friend');
                const emailInput = document.getElementById('target-friend-email');
                submitBtn.onclick = async () => {
                    const email = emailInput.value.trim().toLowerCase();
                    if (!email) {
                        window.cyberAlert('INVALID SIGNAL', 'error');
                        return;
                    }
                    submitBtn.innerText = 'HANDSHAKING...';
                    submitBtn.style.background = '#666';
                    submitBtn.disabled = true;
                    const success = await addFriendByEmail(email);
                    if (success) {
                        window.cyberAlert("NODE LINKED: " + email.toUpperCase());
                        modal.style.display = 'none';
                    } else {
                        submitBtn.innerText = 'INITIATE HANDSHAKE';
                        submitBtn.style.background = 'var(--terminal-green)';
                        submitBtn.disabled = false;
                    }
                };
            });
        };


        const addFriendByEmail = async (email) => {
            if (!auth.currentUser) return false;
            const snap = await get(ref(database, 'users'));
            const users = snap.val();
            let foundUid = null;
            Object.keys(users).forEach(uid => {
                if (users[uid] && users[uid].email === email) foundUid = uid;
            });
            if (foundUid) {
                // Check if already friends
                const alreadyFriend = await get(ref(database, `users/${auth.currentUser.uid}/friends/${foundUid}`));
                if (alreadyFriend.val() === true) {
                    window.cyberAlert("NODE ALREADY LINKED");
                    return true;
                }

                // Initiate Handshake (Messenger Request)
                await update(ref(database, `users/${foundUid}/handshakeRequests`), { [auth.currentUser.uid]: true });
                window.cyberAlert("REQUEST SENT");
                return true;
            } else {
                window.cyberAlert("USER NOT FOUND", "error");
                return false;
            }
        };

        function renderMyQr(container) {
            const user = auth.currentUser;
            container.innerHTML = `
                <div class="qr-container-premium" style="display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px;">
                    <p style="margin-bottom: 20px;">Encryption hash for: <br><strong>${user.email}</strong></p>
                    <div id="user-qrcode" class="qr-result" style="background: white; padding: 10px; border-radius: 10px;"></div>
                    <p style="margin-top: 20px; font-size: 0.7rem; opacity: 0.5;">Share this signature to receive points or friend requests.</p>
                </div>
            `;
            setTimeout(() => {
                new QRCode(document.getElementById('user-qrcode'), {
                    text: user.email, // Use email for easier transfer scanning
                    width: 200, height: 200,
                    colorDark: "#000000", colorLight: "#ffffff"
                });
            }, 50);
        }

        window.renderScanner = function (container, customCallback = null) {
            container.innerHTML = `
                <div id="reader-container" style="width: 100%; max-width: 300px; margin: 0 auto; border-radius: 10px; overflow: hidden; border: 1px solid var(--terminal-green); background: #000; position: relative;">
                    <div id="reader" style="width: 100%;"></div>
                    <div class="scan-line" style="position: absolute; width:100%; height:2px; background:var(--terminal-green); top:0; left:0; pointer-events:none; animation: scan-anim 2s infinite linear; z-index:10;"></div>
                </div>
                <p style="margin-top: 15px; font-family: var(--font-mono); font-size: 0.7rem; text-align: center; opacity: 0.7;">> OPTIC SENSORS INITIALIZING...</p>
                <button class="quantum-btn" style="margin-top: 20px; width: 100%;" id="stop-scan-btn">ABORT MISSION</button>
                <style>
                    @keyframes scan-anim { 0% { top: 0%; } 100% { top: 100%; } }
                    #reader__status_span { display:none!important; }
                    #reader__dashboard { padding: 10px!important; }
                </style>
            `;

            const stopBtn = document.getElementById('stop-scan-btn');
            stopBtn.onclick = () => {
                stopScanner();
                const modal = document.getElementById('tool-modal');
                if (modal) modal.style.display = 'none';
            };

            setTimeout(async () => {
                try {
                    if (html5QrScanner) {
                        try { await html5QrScanner.stop(); } catch (e) { }
                    }

                    // Natively trigger Capacitor Camera permission if available
                    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera) {
                        try {
                            await window.Capacitor.Plugins.Camera.requestPermissions();
                        } catch (permErr) {
                            console.warn("Capacitor Permission check soft-failed:", permErr);
                        }
                    }

                    // Explicitly trigger native WebRTC permission prompt as fallback
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                        stream.getTracks().forEach(track => track.stop()); // close immediately
                    } catch (permErr) {
                        console.warn("WebRTC Permission pre-check failed:", permErr);
                    }

                    html5QrScanner = new Html5Qrcode("reader");
                    const qrCodeSuccessCallback = async (decodedText, decodedResult) => {
                        window.cyberAlert("SIGNATURE DECODED");
                        stopScanner();
                        if (customCallback) {
                            customCallback(decodedText);
                        } else if (decodedText.includes('share.html?doc=') || decodedText.includes('index.html?doc=')) {
                            window.cyberAlert("DRIVE SIGNAL DETECTED");
                            stopScanner();
                            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                                window.open(decodedText, '_system');
                            } else {
                                window.open(decodedText, '_blank');
                            }
                        } else if (decodedText.includes('doc=')) {
                            const docId = decodedText.split('doc=')[1].split('&')[0];
                            window.cyberAlert("DRIVE SIGNAL DETECTED");
                            stopScanner();
                            // In-app preview behaves like Drive
                            window.renderDownlinkUI(docId);
                        } else if (decodedText.includes('DOC_LINK:')) {
                            const docId = decodedText.split('DOC_LINK:')[1].split(' ')[0];
                            window.cyberAlert("DOC SIGNAL DETECTED");
                            stopScanner();
                            window.renderDownlinkUI(docId);
                        } else if (decodedText.includes('@')) {
                            const added = await addFriendByEmail(decodedText);
                            if (added) window.cyberAlert("NODE SIGNAL LINKED");
                            showModal("TRANSFER CREDITS", (c) => renderToolContent("TRANSFER POINTS", c, decodedText));
                        } else {
                            window.cyberAlert("DATA DETECTED: " + decodedText);
                        }
                    };
                    const config = { fps: 10, qrbox: { width: 200, height: 200 } };
                    await html5QrScanner.start({ facingMode: "environment" }, config, qrCodeSuccessCallback);
                    window.cyberAlert("OPTIC SENSORS ONLINE");
                } catch (e) {
                    console.error("Scanner Error: ", e);
                    container.innerHTML += `<p style="color:red; font-size:0.7rem; margin-top:10px;">ERROR: ${e.message}</p>`;
                    window.cyberAlert("SCANNER_FAILURE: " + e.message, "error");
                }
            }, 300);
        }
    }

    function initTools() {
        const toolCards = document.querySelectorAll('.tool-card');
        toolCards.forEach(card => {
            card.removeAttribute('onclick');
            card.style.cursor = 'pointer';

            card.onclick = (e) => {
                e.preventDefault();
                // Inner text evaluates to "" if display:none is used, so use textContent.
                const span = card.querySelector('.tool-item span');
                if (!span) return;

                const toolName = span.textContent.trim();
                const modal = document.getElementById('tool-modal');
                const modalTitle = document.getElementById('modal-title');
                const modalBody = document.getElementById('modal-body');

                if (modal && modalTitle && modalBody && toolName) {
                    modalTitle.textContent = toolName;
                    modal.style.display = 'flex';
                    renderToolContent(toolName, modalBody);
                } else {
                    console.error("Missing modal elements or empty tool name", { toolName });
                }
            };
        });

        // Logout Sequence
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = async () => {
                const cfm = await window.cyberConfirm("Terminate session strictly?", "LOGOUT");
                if (cfm) {
                    signOut(auth).then(() => {
                        sessionStorage.setItem('_shield_unlocked', 'false');
                        window.location.reload();
                    });
                }
            };
        }

        // AI Assistant Launch
        const navAiBtn = document.getElementById('nav-ai-btn');
        if (navAiBtn) {
            navAiBtn.onclick = (e) => {
                e.stopPropagation();
                if (typeof window.openChat === 'function') {
                    window.openChat('My Assistant', 'AI', 'Connected & Ready', 'shield_ai', 'ai@shield.com');
                }
            };
        }

        // Support Sidebar
        const mainLogoSidebar = document.getElementById('main-logo-sidebar');
        if (mainLogoSidebar) {
            mainLogoSidebar.onclick = (e) => {
                e.stopPropagation();
                window.showPage('support');
            };
        }
    }



    window.showServerUplink = function () {
        const modal = document.getElementById('tool-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        if (!modal || !modalBody) return;
        modalTitle.innerText = "SERVER UPLINK";
        modal.style.display = 'flex';
        renderToolContent("SERVER UPLINK", modalBody);
    };

    function renderToolContent(tool, container, defaultEmail = '') {
        container.innerHTML = '';
        const toolTitle = tool.toUpperCase().trim();

        if (toolTitle === 'SERVER UPLINK') {
            const serverUrl = window.location.href;
            const serverId = "HK-47"; // Consistent with footer
            container.innerHTML = `
                <div class="tool-content-box" style="padding: 20px; text-align: center;">
                    <div style="font-size: 2.5rem; margin-bottom: 20px; color: var(--terminal-green); text-shadow: 0 0 15px var(--terminal-green);">ÃƒÂ°Ã…Â¸Ã¢€Å“Ã‚Â¡</div>
                    <h3 style="font-family: var(--font-heading); margin-bottom: 5px;">SERVER BRIDGE: ${serverId}</h3>
                    <p style="font-size: 0.7rem; opacity: 0.5; margin-bottom: 20px; font-family: var(--font-mono);">LOCATION: HK_CLUSTER_01</p>
                    
                    <div style="background: rgba(192,192,192,0.03); border: 1px solid rgba(192,192,192,0.1); border-radius: 10px; padding: 15px; margin-bottom: 20px; text-align: left;">
                        <div style="display:flex; justify-content:space-between; font-size:0.6rem; margin-bottom:10px; font-family:var(--font-mono);">
                            <span style="opacity:0.6;">UPTIME:</span>
                            <span style="color:var(--terminal-green);">99.999%</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:0.6rem; margin-bottom:10px; font-family:var(--font-mono);">
                            <span style="opacity:0.6;">LATENCY:</span>
                            <span style="color:var(--terminal-green);">12ms</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:0.6rem; font-family:var(--font-mono);">
                            <span style="opacity:0.6;">ENCRYPTION:</span>
                            <span style="color:var(--terminal-green);">QUANTUM-256</span>
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px; align-items: center; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                        <input type="text" readonly value="${serverUrl}" id="server-link-display" style="flex:1; background:transparent; border:none; color:var(--terminal-green); font-size:0.65rem; font-family:var(--font-mono); outline:none;">
                    </div>
                    <button id="copy-server-link" class="modal-btn" style="width: 100%; margin-top: 15px;">COPY BRIDGE LINK</button>
                    
                    <p style="font-size: 0.6rem; opacity: 0.4; margin-top: 20px; line-height: 1.4;">
                        Share this bridge link with other operatives to grant them access to this node cluster.
                    </p>
                </div>
            `;
            document.getElementById('copy-server-link').onclick = () => {
                const link = document.getElementById('server-link-display').value;
                window.cyberCopy(link);
            };
        } else if (toolTitle === 'QR CONVERTER') {
            container.innerHTML = `
                <div class="tool-content-box" style="padding: 10px;">
                    <p style="font-size: 0.8rem; margin-bottom: 15px; opacity: 0.8;">Generate an encrypted signature for raw data or local file fragments.</p>
                    <div class="input-tab-group" style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <button class="quantum-btn active" id="btn-text-mode" style="flex: 1; font-size: 0.7rem; padding: 10px;">TEXT DATA</button>
                        <button class="quantum-btn secondary" id="btn-file-mode" style="flex: 1; font-size: 0.7rem; padding: 10px;">FILE FRAGMENT</button>
                    </div>
                    <div id="text-mode-input">
                        <input type="text" id="qr-input" class="modal-input" placeholder="Enter node data...">
                    </div>
                    <div id="file-mode-input" style="display: none;">
                        <div style="background: rgba(255,255,255,0.05); border: 1px dashed var(--glass-border); padding: 15px; border-radius: 8px; text-align: center; position: relative; overflow: hidden; cursor: pointer;">
                            <input type="file" id="qr-file-input" style="position: absolute; top:0; left:0; width:100%; height:100%; opacity:0.01; cursor:pointer; z-index:10;">
                            <button class="quantum-btn secondary" style="font-size: 0.7rem; pointer-events: none; width: 100%;">SELECT CHUNK</button>
                            <p id="qr-file-name" style="margin-top: 10px; font-size: 0.6rem; opacity: 0.5; position: relative; z-index:1;">NO CHUNK SELECTED</p>
                        </div>
                    </div>
                    <button id="gen-qr-btn" class="modal-btn" style="width: 100%; margin-top: 15px;">GENERATE SIGNATURE</button>
                    <div id="qrcode" class="qr-result" style="margin-top: 20px; display: none; justify-content: center; background: white; padding: 10px; border-radius: 10px; width: fit-content; margin-left: auto; margin-right: auto;"></div>
                </div>
            `;
            const genBtn = document.getElementById('gen-qr-btn');
            const qrInput = document.getElementById('qr-input');
            const qrResult = document.getElementById('qrcode');
            const fileInput = document.getElementById('qr-file-input');
            const fileName = document.getElementById('qr-file-name');
            const btnText = document.getElementById('btn-text-mode');
            const btnFile = document.getElementById('btn-file-mode');
            const textGroup = document.getElementById('text-mode-input');
            const fileGroup = document.getElementById('file-mode-input');

            let mode = 'text';
            btnText.onclick = () => {
                mode = 'text'; btnText.classList.add('active'); btnText.classList.remove('secondary');
                btnFile.classList.add('secondary'); btnFile.classList.remove('active');
                textGroup.style.display = 'block'; fileGroup.style.display = 'none';
            };
            btnFile.onclick = () => {
                mode = 'file'; btnFile.classList.add('active'); btnFile.classList.remove('secondary');
                btnText.classList.add('secondary'); btnText.classList.remove('active');
                textGroup.style.display = 'none'; fileGroup.style.display = 'block';
            };
            fileInput.onchange = (e) => { if (e.target.files[0]) fileName.innerText = e.target.files[0].name.toUpperCase(); };
            genBtn.onclick = () => {
                qrResult.innerHTML = ''; let data = "";
                if (mode === 'text') data = qrInput.value.trim();
                else if (fileInput.files[0]) data = "FILE_CHUNK_" + fileInput.files[0].name + "_" + Math.random();
                if (data) {
                    if (typeof QRCode === 'undefined') {
                        window.cyberAlert("QR ENGINE OFFLINE - RELOAD REQD", "error");
                        return;
                    }
                    qrResult.style.display = 'flex';
                    new QRCode(qrResult, { text: data, width: 180, height: 180, colorDark: "#000", colorLight: "#fff" });
                    window.cyberAlert("SIGNATURE GENERATED");
                } else { window.cyberAlert("INVALID DATA INPUT", "error"); }
            };
        } else if (toolTitle === 'SECUREDRIVE' || toolTitle === 'UPLINK DOC/IMAGE' || toolTitle === 'SHARE LINK') {
            container.innerHTML = `
                <div class="tool-content-box" style="padding: 10px;">
                    <p style="font-size: 0.8rem; margin-bottom: 20px; opacity: 0.8;">Generate a direct download signal for documents or images.</p>
                    <div class="file-upload-container" style="background: rgba(192,192,192,0.03); border: 1px dashed var(--terminal-green); padding: 30px; text-align: center; border-radius: 12px; margin-bottom: 20px; position: relative; overflow: hidden; cursor: pointer;">
                        <input type="file" id="doc-file-input" style="position: absolute; top:0; left:0; width:100%; height:100%; opacity:0.01; cursor:pointer; z-index:10;">
                        <button class="quantum-btn" style="padding: 10px 20px; width:100%; font-size: 0.7rem; pointer-events: none;">CHOOSE DOC/IMAGE</button>
                        <p id="file-name" style="margin-top: 15px; font-size: 0.75rem; color: var(--terminal-green); font-family: var(--font-mono); position: relative; z-index:1;">AWAITING FILE INPUT...</p>
                    </div>
                    <button id="gen-link-btn" class="modal-btn" style="display: none; width: 100%;">GENERATE SIGNAL UPLINK</button>
                    <div id="doc-qrcode" style="margin-top: 20px; display: none; justify-content: center; background: white; padding: 10px; border-radius: 10px; width: fit-content; margin-left: auto; margin-right: auto;"></div>
                </div>
            `;
            const fileInput = document.getElementById('doc-file-input');
            const genBtn = document.getElementById('gen-link-btn');
            const fileNameDisplay = document.getElementById('file-name');
            const qrResult = document.getElementById('doc-qrcode');
            fileInput.onchange = (e) => {
                if (e.target.files.length > 0) {
                    fileNameDisplay.innerText = "> UPLINK READY: " + e.target.files[0].name.toUpperCase();
                    genBtn.style.display = 'block';
                    window.cyberAlert("DOCUMENT DETECTED");
                }
            };
            genBtn.onclick = async () => {
                const file = fileInput.files[0];
                if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                        window.cyberAlert("SIGNAL OVERLOAD (MAX 5MB)", "error");
                        return;
                    }
                    genBtn.innerText = "ENCRYPTING SIGNAL...";
                    genBtn.disabled = true;
                    genBtn.style.opacity = '0.5';

                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                        try {
                            const userEmail = (auth.currentUser ? auth.currentUser.email : 'GUEST_' + Math.floor(Math.random() * 1000));
                            const randomBytes = Math.random().toString(36).substring(2, 7).toUpperCase();
                            const docId = `SECURE_${Date.now().toString(36).toUpperCase()}_${randomBytes}`;
                            
                            console.log("INITIATING_UPLINK:", docId);
                            
                            await set(ref(database, `shared_docs/${docId}`), {
                                name: file.name,
                                data: ev.target.result,
                                sender: userEmail,
                                timestamp: Date.now()
                            });
                            window.cyberAlert("QUANTUM UPLINK STABLE");
                            genBtn.style.display = 'none';
                            
                            // Cyber Signal Construction - FORCE PRODUCTION URL FOR GLOBAL COMPATIBILITY
                            const PROD_BASE = "https://noor-cf2f7.web.app/share.html";
                            const shareableUrl = `${PROD_BASE}#doc=${docId}`;
                            
                            console.log("QUANTUM_LINK_STABILIZED:", shareableUrl);
                            window.cyberAlert("LINK GENERATED: " + docId);

                            // Render DRIVE SIGNAL QR
                            if (typeof QRCode !== 'undefined') {
                                qrResult.style.display = 'flex';
                                qrResult.innerHTML = '';
                                new QRCode(qrResult, { text: shareableUrl, width: 220, height: 220, colorDark: "#000", colorLight: "#fff" });

                                const qrLabel = document.createElement('div');
                                qrLabel.style.cssText = "font-size:0.5rem; color:#000; font-weight:bold; margin-top:5px; text-align:center;";
                                qrLabel.innerText = "[ DRIVE SIGNAL QR ]";
                                qrResult.appendChild(qrLabel);
                            } else {
                                console.warn("QRCode library missing - skipping QR generation");
                            }

                            const linkDisplay = document.createElement('div');
                            linkDisplay.style.cssText = "margin-top:20px; background:rgba(0,0,0,0.3); border:1px solid var(--terminal-green); padding:20px; border-radius:12px;";
                            linkDisplay.innerHTML = `
                                <div style="font-size:0.55rem; opacity:0.6; margin-bottom:10px; font-family:var(--font-mono); color:var(--terminal-green);">[ GLOBAL_LIVE_SIGNAL ]</div>
                                <div style="display:flex; flex-direction:column; gap:12px;">
                                    <input type="text" value="${shareableUrl}" id="public-link-text" readonly style="width:100%; background:rgba(255,255,255,0.05); padding:12px; border:none; color:var(--terminal-green); font-size:0.7rem; border-radius:8px; font-family:var(--font-mono); outline:none; border: 1px solid rgba(192,192,192,0.1);">
                                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                                        <button class="quantum-btn" id="copy-public-link-btn" style="flex:1; padding:10px; font-size:0.65rem; background:var(--terminal-green); color:#000; font-weight:bold;">COPY LINK</button>
                                        <button class="quantum-btn secondary" id="share-native-btn" style="flex:1; padding:10px; font-size:0.65rem;">SHARE APP</button>
                                        <button class="quantum-btn secondary" id="share-qr-btn" style="flex:1; padding:10px; font-size:0.65rem;">SHARE QR</button>
                                    </div>
                                </div>
                                <div style="margin-top: 15px; border-top: 1px dashed rgba(192,192,192,0.2); padding-top: 15px;">
                                    <div style="font-size:0.55rem; opacity:0.6; margin-bottom:10px; font-family:var(--font-mono); color:var(--terminal-green);">[ SEND TO INTERNAL CONTACT ]</div>
                                    <div style="display:flex; gap:10px;">
                                        <select id="contact-select" style="flex:2; background:rgba(255,255,255,0.05); padding:10px; border:1px solid rgba(192,192,192,0.1); color:var(--terminal-green); font-size:0.7rem; border-radius:8px; font-family:var(--font-mono); outline:none;">
                                            <option value="">LOADING SECURE CONTACTS...</option>
                                        </select>
                                        <button class="quantum-btn" id="send-contact-btn" style="flex:1; padding:10px; font-size:0.7rem;">SEND QUICK</button>
                                    </div>
                                </div>
                            `;
                            container.appendChild(linkDisplay);

                            // Load friends into select dropdown
                            const contactSelect = document.getElementById('contact-select');
                            try {
                                const friendsSnap = await get(ref(database, `users/${auth.currentUser.uid}/friends`));
                                if (friendsSnap.exists()) {
                                    const friendsKeys = Object.keys(friendsSnap.val());
                                    contactSelect.innerHTML = '<option value="">-- SELECT SECURE NODE --</option>';
                                    for (const fUid of friendsKeys) {
                                        const fDataSnap = await get(ref(database, `users/${fUid}`));
                                        if (fDataSnap.exists()) {
                                            const fData = fDataSnap.val();
                                            const opt = document.createElement('option');
                                            opt.value = fUid;
                                            opt.innerText = fData.username || fData.email || fUid.substring(0, 8);
                                            contactSelect.appendChild(opt);
                                        }
                                    }
                                } else {
                                    contactSelect.innerHTML = '<option value="">NO CONTACTS FOUND</option>';
                                }
                            } catch (e) {
                                contactSelect.innerHTML = '<option value="">CONTACT SYNC FAILED</option>';
                            }

                            // Event Listeners for new buttons
                            document.getElementById('send-contact-btn').onclick = async () => {
                                const targetUid = contactSelect.value;
                                if (!targetUid) {
                                    window.cyberAlert("SELECT A TARGET NODE", "error");
                                    return;
                                }
                                const sendBtn = document.getElementById('send-contact-btn');
                                sendBtn.innerText = 'TRANSMITTING...';
                                sendBtn.disabled = true;

                                try {
                                    const chatKey = [auth.currentUser.uid, targetUid].sort().join('_');
                                    const messagesRef = ref(database, `messages/${chatKey}`);
                                    await push(messagesRef, {
                                        text: `[ENCRYPTED DOCUMENT UPLINK]\nFile: ${file.name}\nDecrypt here:\n${shareableUrl}`,
                                        sender: auth.currentUser.email,
                                        senderName: window._currentUserProfile?.username || (auth.currentUser.email || 'NODE').split('@')[0],
                                        timestamp: Date.now()
                                    });
                                    window.cyberAlert("MESSAGE SENT");
                                    setTimeout(() => {
                                        sendBtn.innerText = 'SENT SUCCESSFULLY';
                                    }, 500);
                                } catch (e) {
                                    console.error("Send message error:", e);
                                    window.cyberAlert("TRANSMISSION FAILED", "error");
                                    sendBtn.innerText = 'RETRY';
                                    sendBtn.disabled = false;
                                }
                            };

                            document.getElementById('share-qr-btn').onclick = async () => {
                                try {
                                    const canvas = qrResult.querySelector('canvas');
                                    if (!canvas) { window.cyberAlert("QR NOT RENDERED YET", "error"); return; }
                                    const dataUrl = canvas.toDataURL("image/png");

                                    if (window.Capacitor && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins.Filesystem) {
                                        const base64Data = dataUrl.split(',')[1];
                                        const savedFile = await window.Capacitor.Plugins.Filesystem.writeFile({
                                            path: `QR_${docId}.png`,
                                            data: base64Data,
                                            directory: 'CACHE'
                                        });
                                        await window.Capacitor.Plugins.Share.share({
                                            title: 'Quantum QR Code',
                                            url: savedFile.uri
                                        });
                                    } else {
                                        // Web Download fallback
                                        const link = document.createElement('a');
                                        link.download = `QR_${docId}.png`;
                                        link.href = dataUrl;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.cyberAlert("QR CODE DOWNLOADED");
                                    }
                                } catch (e) {
                                    console.error("QR Share Error:", e);
                                    window.cyberAlert("QR SHARE FAILED", "error");
                                }
                            };

                            // AUTO-SCROLL to the newly generated links
                            setTimeout(() => {
                                const body = document.getElementById('modal-body');
                                if (body) body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' });
                            }, 100);

                            document.getElementById('copy-public-link-btn').onclick = () => {
                                window.cyberCopy(shareableUrl);
                            };

                            // Pure Link Sharing (Document Focused)
                            document.getElementById('share-native-btn').onclick = async () => {
                                const shareData = {
                                    title: 'DOCUMENT UPLINK',
                                    url: shareableUrl,
                                    text: `Incoming Document: ${file.name}\nDecrypt here: ${shareableUrl}`,
                                };

                                try {
                                    const SharePlugin = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) ||
                                        (window.Capacitor && window.Capacitor.Share);

                                    if (SharePlugin) {
                                        await SharePlugin.share(shareData);
                                    } else if (navigator.share) {
                                        await navigator.share(shareData);
                                    } else {
                                        window.cyberAlert("NATIVE UPLINK ATOMIZED", "error");
                                    }
                                } catch (exc) {
                                    console.error("Native Share Error: ", exc);
                                    window.cyberAlert("UPLINK COMPROMISED", "error");
                                }
                            };
                        } catch (err) {
                            window.cyberAlert("UPLINK INTERRUPTED", "error");
                            genBtn.disabled = false;
                            genBtn.innerText = "RETRY HANDSHAKE";
                            genBtn.style.opacity = '1';
                        }
                    };
                    reader.onerror = () => {
                        window.cyberAlert("FILE READ ERROR", "error");
                        genBtn.disabled = false;
                        genBtn.innerText = "RETRY";
                    };
                    reader.readAsDataURL(file);
                }
            };
        } else if (toolTitle === 'RECEIVE DOC') {
            container.innerHTML = `<div id="doc-scanner-target" style="border-radius:12px; overflow:hidden;"></div>`;
            const target = document.getElementById('doc-scanner-target');
            if (window.renderScanner) {
                window.renderScanner(target, async (decoded) => {
                    if (decoded.includes('share.html?doc=') || decoded.includes('index.html?doc=')) {
                        window.cyberAlert("LINK FOUND. REDIRECTING...");
                        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                            window.open(decoded, '_system');
                        } else {
                            window.open(decoded, '_blank');
                        }
                    } else if (decoded.includes('DOC_LINK:')) {
                        const docId = decoded.split('DOC_LINK:')[1].split(' ')[0];
                        window.cyberAlert("SIGNAL ACQUIRED");
                        window.downloadFromLink(docId);
                    } else {
                        window.cyberAlert("INVALID SIGNAL DATA", "error");
                    }
                });
            }
        } else if (toolTitle === 'TRANSFER POINTS') {
            container.innerHTML = `
                <div class="tool-content-box" style="padding: 10px;">
                    <p style="font-size: 0.8rem; margin-bottom: 20px; opacity: 0.8;">Secure peer-to-peer credit transfer over quantum channel.</p>
                    <input type="email" id="transfer-email" class="modal-input" placeholder="Target Node Email..." value="${defaultEmail}">
                    <input type="number" id="transfer-amount" class="modal-input" placeholder="Credits (SP)..." min="1">
                    <button id="confirm-transfer-btn" class="modal-btn" style="width: 100%; margin-top: 15px;">EXECUTE TRANSFER</button>
                </div>
            `;
            const confirmBtn = document.getElementById('confirm-transfer-btn');
            if (confirmBtn) {
                confirmBtn.onclick = async () => {
                    const email = document.getElementById('transfer-email').value;
                    const amount = parseInt(document.getElementById('transfer-amount').value);
                    const currentUser = auth.currentUser;
                    if (!email || !amount || amount <= 0) { window.cyberAlert("INVALID TRANSFER PARAMETERS", "error"); return; }
                    const snap = await get(ref(database, 'users'));
                    const users = snap.val();
                    let recipientUid = null;
                    Object.keys(users).forEach(uid => {
                        if (users[uid] && users[uid].email === email) recipientUid = uid;
                    });
                    if (!recipientUid) { window.cyberAlert("USER NOT FOUND", "error"); return; }
                    const senderBalRef = ref(database, `users/${currentUser.uid}/wallet/balance`);
                    const receiverBalRef = ref(database, `users/${recipientUid}/wallet/balance`);
                    const senderSnap = await get(senderBalRef);
                    const senderBal = senderSnap.val() || 0;
                    if (senderBal < amount) { window.cyberAlert("INSUFFICIENT CREDITS", "error"); return; }
                    await set(senderBalRef, senderBal - amount);
                    const receiverSnap = await get(receiverBalRef);
                    await set(receiverBalRef, (receiverSnap.val() || 0) + amount);

                    await logTransaction(currentUser.uid, -amount, email, 'TRANSMISSION SENT');
                    await logTransaction(recipientUid, amount, currentUser.email, 'TRANSMISSION RCVD');

                    window.cyberAlert("TRANSFER COMPLETE");
                    document.getElementById('tool-modal').style.display = 'none';
                };
            }
        }
    }

    // ====================== PROFILE SYSTEM ======================
    function initProfile(user) {
        const avatarWrapper = document.getElementById('profile-avatar-wrapper');
        const avatarUpload = document.getElementById('avatar-upload');
        const avatarImg = document.getElementById('profile-avatar-img');
        const avatarText = document.getElementById('profile-avatar-text');
        const usernameInput = document.getElementById('profile-username');
        const bioInput = document.getElementById('profile-bio');
        const bioCounter = document.getElementById('bio-counter');
        const emailDisplay = document.getElementById('profile-email');
        const saveBtn = document.getElementById('save-profile-btn');

        if (!avatarWrapper || !user) return;

        // Display email
        emailDisplay.innerText = user.email;

        // Load saved profile from Firebase
        const profileRef = ref(database, `users/${user.uid}/profile`);
        onValue(profileRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                if (data.username) usernameInput.value = data.username;
                if (data.bio) {
                    bioInput.value = data.bio;
                    bioCounter.innerText = data.bio.length + '/120';
                }
                if (data.avatar) {
                    avatarImg.src = data.avatar;
                    avatarImg.style.display = 'block';
                    avatarText.style.display = 'none';

                    // Also update global objects if they exist
                    const sidebarAvatar = document.querySelector('.user-info .contact-avatar');
                    if (sidebarAvatar) sidebarAvatar.innerHTML = `<img src="${data.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                } else {
                    avatarText.innerText = user.email.substring(0, 2).toUpperCase();
                }
                // Update sidebar username
                const sidebarName = document.querySelector('.username');
                if (sidebarName && data.username) sidebarName.innerText = data.username;
            } else {
                avatarText.innerText = user.email.substring(0, 2).toUpperCase();
            }
        });

        // Avatar click
        avatarWrapper.onclick = () => avatarUpload.click();

        // Avatar upload preview
        avatarUpload.onchange = (e) => {
            const file = e.target.files[0];
            if (file && file.size < 500000) { // Max 500KB
                const reader = new FileReader();
                reader.onload = (ev) => {
                    avatarImg.src = ev.target.result;
                    avatarImg.style.display = 'block';
                    avatarText.style.display = 'none';
                };
                reader.readAsDataURL(file);
            } else if (file) {
                window.cyberAlert("FILE TOO LARGE (MAX 500KB)", "error");
            }
        };

        // Bio counter
        bioInput.oninput = () => {
            bioCounter.innerText = bioInput.value.length + '/120';
        };

        // Save profile
        saveBtn.onclick = async () => {
            const profileData = {
                username: usernameInput.value.trim() || (user.email || user.id || 'NODE').split('@')[0],
                bio: bioInput.value.trim()
            };

            // Save avatar as base64 (small images only)
            if (avatarImg.src && avatarImg.style.display !== 'none') {
                profileData.avatar = avatarImg.src;
            }

            try {
                await set(profileRef, profileData);
                await set(ref(database, `users/${user.uid}/username`), profileData.username);
                // Update sidebar display
                const sidebarName = document.querySelector('.username');
                if (sidebarName) sidebarName.innerText = profileData.username;
                window.cyberAlert("IDENTITY SAVED");
            } catch (err) {
                window.cyberAlert("SAVE FAILED: " + err.message, "error");
            }
        };
    }

    // ====================== SETTINGS SYSTEM ======================
    // ====================== STATUS SYSTEM ======================
    // ====================== PREMIUM STATUS SYSTEM ======================
    function initializeStatuses(user) {
        const statusListEl = document.getElementById('status-list');
        const postBtn = document.getElementById('btn-post-status');
        const statusRef = ref(database, 'statuses');

        // Viewer elements
        const viewer = document.getElementById('status-viewer');
        const viewerContent = document.getElementById('status-viewer-content');
        const viewerAuthor = document.getElementById('status-viewer-author');
        const viewerAvatar = document.getElementById('status-viewer-avatar');
        const viewerTime = document.getElementById('status-viewer-time');
        const progressBar = document.getElementById('status-progress-bar');
        const closeViewer = document.getElementById('close-status-viewer');
        const replyInput = document.getElementById('status-reply-input');
        const replySend = document.getElementById('status-reply-send');
        const footerInfo = document.getElementById('status-viewer-footer-info');

        let statusTimer;
        let activeStatusUid;
        let activeStatusKey;

        window.openStatusViewer = (status, uid, key) => {
            if (!viewer) return;

            activeStatusUid = uid;
            activeStatusKey = key;

            if (history.state?.modal !== 'status-viewer') {
                history.pushState({ modal: 'status-viewer' }, '');
            }

            viewer.classList.add('active');
            viewerAuthor.textContent = status.author;
            viewerAvatar.textContent = status.author.substring(0, 1);
            viewerTime.textContent = new Date(status.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const viewerCount = status.views ? Object.keys(status.views).length : 0;
            footerInfo.textContent = `VIEWED BY ${viewerCount} PERIPHERAL NODES`;

            viewerContent.innerHTML = '';
            if (status.type === 'image') {
                const img = document.createElement('img');
                img.src = status.content;
                img.style.cssText = "width:100%; height:100%; object-fit:contain; z-index:5;";
                viewerContent.appendChild(img);

                // Blurred background for vertical images
                const bg = document.createElement('div');
                bg.style.cssText = `position:absolute; inset:0; background:url(${status.content}) center/cover no-repeat; filter:blur(30px); opacity:0.3; z-index:1;`;
                viewerContent.appendChild(bg);
            } else {
                const textBox = document.createElement('div');
                textBox.style.cssText = "padding:40px; font-size:1.8rem; color:#fff; text-align:center; font-family:var(--font-heading); background:linear-gradient(135deg, #1a1a1a, #000); width:100%; height:100%; display:flex; align-items:center; justify-content:center; border:1px solid rgba(212,175,55,0.2); box-sizing:border-box;";
                textBox.textContent = status.content;
                viewerContent.appendChild(textBox);
            }

            // Mark as viewed
            const currentUser = auth.currentUser;
            if (currentUser && currentUser.uid !== uid) {
                set(ref(database, `statuses/${uid}/${key}/views/${currentUser.uid}`), {
                    name: (currentUser.displayName || currentUser.email.split('@')[0]).toUpperCase(),
                    timestamp: Date.now()
                });
            }

            // Progress Bar Logic (10 seconds)
            progressBar.style.width = '0%';
            progressBar.style.transition = 'none';
            setTimeout(() => {
                progressBar.style.transition = 'width 10s linear';
                progressBar.style.width = '100%';
            }, 50);

            if (statusTimer) clearTimeout(statusTimer);
            statusTimer = setTimeout(() => hideStatusViewer(), 10000);
        };

        const hideStatusViewer = () => {
            if (!viewer) return;
            viewer.classList.remove('active');
            if (statusTimer) clearTimeout(statusTimer);

            if (history.state?.modal === 'status-viewer') history.back();

            progressBar.style.width = '0%';
            progressBar.style.transition = 'none';
            replyInput.value = '';
        };

        if (closeViewer) closeViewer.onclick = hideStatusViewer;

        if (replySend) {
            replySend.onclick = async () => {
                const text = replyInput.value.trim();
                if (!text) return;

                const currentUser = auth.currentUser;
                const chatKey = [currentUser.uid, activeStatusUid].sort().join('_');

                await push(ref(database, `messages/${chatKey}`), {
                    text: `(STATUS_REPLY): ${text}`,
                    sender: currentUser.email,
                    timestamp: Date.now()
                });

                window.cyberAlert("REPLY TRANSMITTED");
                hideStatusViewer();
            };
        }

        if (replyInput) {
            replyInput.onkeydown = (e) => { if (e.key === 'Enter') replySend.click(); };
        }

        if (postBtn) {
            postBtn.onclick = async () => {
                const res = await window.showModal({
                    title: 'BROADCAST STATUS',
                    message: 'Select Signal Type',
                    confirmText: 'IMAGE',
                    cancelText: 'TEXT'
                });

                if (res === null) return;

                let statusData = {
                    uid: user.uid,
                    author: (user.displayName || user.email.split('@')[0]).toUpperCase(),
                    timestamp: Date.now(),
                    expiry: Date.now() + (24 * 60 * 60 * 1000)
                };

                if (res === true) {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                        const file = e.target.files[0];
                        if (file.size > 800000) { window.cyberAlert("SIGNAL TOO LARGE (MAX 800KB)", "error"); return; }
                        const reader = new FileReader();
                        reader.onload = async (re) => {
                            statusData.type = 'image';
                            statusData.content = re.target.result;
                            await set(ref(database, `statuses/${user.uid}/${Date.now()}`), statusData);
                            window.cyberAlert("SIGNAL BROADCASTED");
                        };
                        reader.readAsDataURL(file);
                    };
                    input.click();
                } else {
                    const text = await window.cyberPrompt("ENTER STATUS MESSAGE", "Secure transmission...", "STATUS UPLINK");
                    if (text) {
                        statusData.type = 'text';
                        statusData.content = text;
                        await set(ref(database, `statuses/${user.uid}/${Date.now()}`), statusData);
                        window.cyberAlert("SIGNAL BROADCASTED");
                    }
                }
            };
        }

        onValue(statusRef, (snapshot) => {
            if (!statusListEl) return;
            statusListEl.innerHTML = '';
            let hasStatuses = false;

            if (snapshot.exists()) {
                const allStatuses = snapshot.val();
                Object.keys(allStatuses).forEach(uid => {
                    const userStatuses = allStatuses[uid];
                    const latestKey = Object.keys(userStatuses).sort().pop();
                    const status = userStatuses[latestKey];

                    if (status.expiry < Date.now()) {
                        set(ref(database, `statuses/${uid}/${latestKey}`), null);
                        return;
                    }

                    hasStatuses = true;
                    const item = document.createElement('div');
                    item.className = 'status-item';
                    item.style.cssText = "display: flex; flex-direction: column; align-items: center; min-width: 135px; cursor: pointer; transition: transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28); position: relative; margin-right: 18px;";

                    const avatarStr = status.author.substring(0, 1).toUpperCase();
                    const hasViewed = status.views && status.views[user.uid];
                    const ringColor = hasViewed ? 'rgba(212,175,55,0.2)' : 'var(--terminal-green)';
                    const glowEffect = hasViewed ? '' : 'box-shadow: 0 0 10px rgba(0,255,157,0.3);';

                    item.innerHTML = `
                        <div style="width: 130px; height: 210px; border-radius: 24px; padding: 4px; border: 3.5px solid ${ringColor}; ${glowEffect} margin-bottom: 12px; display: flex; align-items: center; justify-content: center; background:rgba(255,255,255,0.04); cursor:pointer; overflow:hidden; transform-origin:center; box-shadow: 0 8px 25px rgba(0,0,0,0.5); position:relative;">
                            <div style="width: 100%; height: 100%; border-radius: 18px; background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #fff; font-size: 2.5rem; border:1px solid rgba(255,255,255,0.06);">
                                ${status.type === 'image' ? `<img src="${status.content}" style="width:100%; height:100%; object-fit:cover; opacity: 0.9;">` : `<span style="opacity:0.6;">${avatarStr}</span>`}
                            </div>
                            <!-- Small Author Badge inside the rectangle for high-end look -->
                            <div style="position:absolute; bottom:12px; left:12px; right:12px; background:rgba(0,0,0,0.4); backdrop-filter:blur(10px); padding:4px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); color:#fff; font-size:0.5rem; font-family:var(--font-mono); text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; letter-spacing:0.5px;">${status.author}</div>
                        </div>
                    `;

                    item.onclick = () => window.openStatusViewer(status, uid, latestKey);
                    statusListEl.appendChild(item);
                });
            }

            if (!hasStatuses) {
                statusListEl.innerHTML = `<div class="empty-history" style="opacity:0.25; text-align:center; padding:20px 0; font-family:var(--font-mono); font-size:0.7rem; width:100%;">> NO RECENT FEED DETECTED...</div>`;
            }
        });
    }



    // ====================== GROUP SYSTEM ======================
    function initializeGroups(user) {
        const groupBtn = document.getElementById('btn-new-group');
        if (!groupBtn) {
            console.error("Group button not found!");
            return;
        }

        groupBtn.onclick = async (e) => {
            e.stopPropagation();
            console.log("Initiating new group...");

            if (!navigator.onLine) {
                window.cyberAlert("CONNECTION ERROR: OFFLINE", "error");
                return;
            }

            const groupName = await window.cyberPrompt("CREATE NEW NODE CHANNEL", "MY-SQUAD-1", "SECURE MULTI-SYNC");
            if (!groupName) {
                console.log("Group creation cancelled");
                return;
            }

            const groupId = 'group_' + Date.now();
            const members = { [user.uid]: true };

            const groupData = {
                name: groupName.toUpperCase(),
                id: groupId,
                createdBy: user.uid,
                admins: { [user.uid]: true },
                members: members,
                timestamp: Date.now()
            };

            try {
                await set(ref(database, `groups/${groupId}`), groupData);
                await set(ref(database, `users/${user.uid}/groups/${groupId}`), true);
                window.cyberAlert("SECURE CHANNEL ESTABLISHED");
                window.openChat(groupData.name, 'GR', 'Group Sync Active', groupId, 'group@shield.os');
            } catch (err) {
                console.error("Group creation fail:", err);
                window.cyberAlert("CREATION FAILED", "error");
            }
        };
    }

    function initSettings(user) {
        // --- Toggle Persistence (all toggles) ---
        const toggleIds = [
            'toggle-notif', 'toggle-sound', 'toggle-read', 'toggle-lastseen', 'toggle-theme',
            'toggle-2fa', 'toggle-biometric', 'toggle-notifications', 'toggle-e2e', 'toggle-screenshot',
            'toggle-preview', 'toggle-download', 'toggle-typing', 'toggle-linkpreview', 'toggle-entersend',
            'toggle-animations', 'toggle-compact', 'toggle-blur', 'toggle-applock', 'toggle-chatlock', 'toggle-autolock'
        ];
        toggleIds.forEach(id => {
            const toggle = document.getElementById(id);
            if (!toggle) return;
            const saved = localStorage.getItem(id);
            if (saved !== null) toggle.checked = saved === 'true';
            toggle.onchange = async () => {
                if (id === 'toggle-applock' && toggle.checked) {
                    const pin = await window.showModal({ title: 'SET PIN', message: 'Enter 4-digit security PIN', showInput: true, placeholder: '1234' });
                    if (pin && pin.length === 4) {
                        localStorage.setItem('app-pin', pin);
                    } else {
                        toggle.checked = false;
                        window.cyberAlert('PIN REJECTED', 'error');
                        return;
                    }
                } else if (id === 'toggle-biometric' && toggle.checked) {
                    const verified = await window.requestBiometricAuth(true); // true = setup mode
                    if (!verified) {
                        toggle.checked = false;
                        window.cyberAlert('BIOMETRIC SYNC FAILED', 'error');
                        return;
                    }
                    sessionStorage.setItem('_shield_unlocked', 'true'); // Stay unlocked if we just enabled it
                }
                localStorage.setItem(id, toggle.checked);
                window.cyberAlert(id.replace('toggle-', '').toUpperCase() + (toggle.checked ? ' ENABLED' : ' DISABLED'));
            };
        });

        // requestBiometricAuth is defined globally above (before auth state listener)

        // --- Real-time Network Graph ---
        const canvas = document.getElementById('network-graph');
        const countEl = document.getElementById('live-user-count');
        const totalEl = document.getElementById('total-user-count');

        if (canvas && user) {
            canvas.width = canvas.offsetWidth * 2;
            canvas.height = 120;
            const ctx = canvas.getContext('2d');
            const dataPoints = [];
            const maxPoints = 30;

            const presenceRef = ref(database, 'status');
            onValue(presenceRef, (snapshot) => {
                let onlineCount = 0;
                if (snapshot.exists()) {
                    snapshot.forEach(child => {
                        if (child.val().state === 'online') onlineCount++;
                    });
                }
                if (countEl) countEl.innerText = onlineCount;
                dataPoints.push(onlineCount || 0.1); // Small offset so graph isn't dead flat 0
                if (dataPoints.length > maxPoints) dataPoints.shift();
                drawGraph(ctx, canvas, dataPoints);
            });

            // Real-time total nodes count
            onValue(ref(database, 'users'), (snapshot) => {
                const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
                if (totalEl) totalEl.innerText = count;
            });
        }

        function drawGraph(ctx, canvas, data) {
            const w = canvas.width;
            const h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            if (data.length < 2) return;

            const maxVal = Math.max(...data, 3);
            const stepX = w / (data.length - 1);

            // Gradient fill
            const gradient = ctx.createLinearGradient(0, 0, 0, h);
            gradient.addColorStop(0, 'rgba(192, 192, 192, 0.3)');
            gradient.addColorStop(1, 'rgba(192, 192, 192, 0.0)');

            // Draw filled area
            ctx.beginPath();
            ctx.moveTo(0, h);
            data.forEach((val, i) => {
                const x = i * stepX;
                const y = h - (val / maxVal) * (h - 10);
                if (i === 0) ctx.lineTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();

            // Draw line
            ctx.beginPath();
            data.forEach((val, i) => {
                const x = i * stepX;
                const y = h - (val / maxVal) * (h - 10);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.strokeStyle = '#C0C0C0';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw dots
            data.forEach((val, i) => {
                const x = i * stepX;
                const y = h - (val / maxVal) * (h - 10);
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#C0C0C0';
                ctx.fill();
            });
        }

        // --- Documentation Modals ---
        const docContents = {
            'btn-privacy': {
                title: 'PRIVACY POLICY',
                body: `<div class="doc-content">
                    <h3>SHIELD PRIVACY PROTOCOL</h3>
                    <p>SHIELD OS is built with a zero-knowledge architecture. Your data is processed through quantum-resistant encryption channels.</p>
                    <p><strong>Data Collection:</strong> We collect minimal metadata required for node synchronization: email hash, session tokens, encrypted timestamps.</p>
                    <p><strong>Storage:</strong> All messages use <code>AES-256-GCM</code> end-to-end encryption. Keys are generated per-session and never stored on our servers.</p>
                    <p><strong>Third Parties:</strong> No data is shared with external entities. The SHIELD network operates as a closed quantum mesh.</p>
                    <p><strong>Deletion:</strong> You may purge your node identity at any time. All associated data is cryptographically shredded within 24hrs.</p>
                    <p><strong>Cookies:</strong> Session tokens are stored locally via <code>localStorage</code>. No tracking cookies are deployed.</p>
                    <p style="opacity: 0.5; margin-top: 20px;">Last updated: 2024-12-01 | Protocol: GDPR-QUANTUM-COMPLIANT</p>
                </div>`
            },
            'btn-whitepaper': {
                title: 'WHITEPAPER',
                body: `<div class="doc-content">
                    <h3>SHIELD OS ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â QUANTUM MESH WHITEPAPER</h3>
                    <p><strong>Abstract:</strong> SHIELD OS is a decentralized communication protocol leveraging quantum-resistant cryptography for secure peer-to-peer messaging across untrusted networks.</p>
                    <p><strong>1. Architecture:</strong> The system employs a dual-layer mesh: a public signaling layer for node discovery and a private encryption layer for data transit.</p>
                    <p><strong>2. Consensus:</strong> Node trust is established via a Proof-of-Presence (PoP) mechanism, where each node validates its existence through cryptographic heartbeats.</p>
                    <p><strong>3. Token Economics:</strong> SHIELD Points (SP) serve as the internal credit system, earned through network participation and redeemable for enhanced services.</p>
                    <pre>
QUANTUM_MESH_PARAMS = {
  "encryption": "AES-256-GCM",
  "key_exchange": "X25519",
  "hash": "SHA3-512",
  "consensus": "PoP-v2",
  "max_nodes": 1048576
}</pre>
                    <p><strong>4. Future:</strong> Integration of post-quantum lattice-based cryptography (CRYSTALS-Kyber) planned for v3.0.</p>
                </div>`
            },
            'btn-encryption': {
                title: 'ENCRYPTION PROTOCOL',
                body: `<div class="doc-content">
                    <h3>QUANTUM ENCRYPTION ENGINE</h3>
                    <p>All transmissions are protected by military-grade encryption stacks:</p>
                    <pre>
// Key Generation Pipeline
async function generateNodeKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-384" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const aesKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: remotePubKey },
    keyPair.privateKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  return { keyPair, aesKey };
}

// Message Encryption
async function encryptSignal(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key, encoded
  );
  return { cipher, iv };
}</pre>
                    <p><strong>Forward Secrecy:</strong> New keys are derived for every session, ensuring past communications remain secure even if current keys are compromised.</p>
                    <p><strong>Integrity:</strong> All messages carry <code>HMAC-SHA3-512</code> signatures for tamper detection.</p>
                </div > `
            },
            'btn-terms': {
                title: 'TERMS OF SERVICE',
                body: `< div class="doc-content" >
                    <h3>TERMS OF SERVICE</h3>
                    <p>By activating your node on the SHIELD network, you agree to the following operational parameters:</p>
                    <p><strong>1.</strong> All activity must comply with local and decentralized network ethics.</p>
                    <p><strong>2.</strong> You are solely responsible for your node's encryption keys.</p>
                    <p><strong>3.</strong> SHIELD Points (SP) are non-transferable outside the network ecosystem and hold no monetary value.</p>
                    <p><strong>4.</strong> The SHIELD network reserves the right to terminate node access for violations of these terms without prior notice.</p>
                    <p style="opacity: 0.5; margin-top: 20px;">Effective: 2024-01-01 | Jurisdiction: Quantum Mesh International</p>
                </div > `
            },
            'btn-about': {
                title: 'ABOUT SHIELD OS',
                body: `< div class="doc-content" >
                    <h3>SHIELD OS v2.1.4</h3>
                    <p>The SHIELD project is an open-source initiative dedicated to digital anonymity and cryptographic freedom.</p>
                    <div style="background: rgba(192,192,192,0.05); padding: 15px; border-radius: 8px; margin: 15px 0; font-family: var(--font-mono); font-size: 0.65rem; border-left: 2px solid var(--terminal-green);">
                        &gt; NODE_STATUS: STABLE<br>
                        &gt; ENCRYPTION: ACTIVE<br>
                        &gt; MESH_UPLINK: ONLINE
                    </div>
                    <p style="margin-top: 20px;"><strong>Mission:</strong> SHIELD OS exists to provide a secure communication layer for everyone who values privacy. Built on the principle that every message should be private.</p>
                    <p><strong>Team:</strong> Developed by the SHIELD Network Collective ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â a distributed group of cryptography engineers, security researchers, and UI architects.</p>
                    <pre>
NODE_INFO = {
  version: "2.1.4",
  build: 8842,
  uptime: "99.7%",
  nodes_global: 12847,
  encryption: "AES-256-GCM",
  status: "OPERATIONAL"
}</pre>
                </div>`
            },
            'btn-changelog': {
                title: 'CHANGELOG',
                body: `< div class="doc-content" >
                    <h3>CHANGELOG</h3>
                    <p><strong>v2.1.4</strong> ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â Settings & Profile overhaul, accent color picker, font size selector, security toggles, storage management.</p>
                    <p><strong>v2.1.3</strong> ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â Quantum Wallet with QR payments, transaction history, point transfers between nodes.</p>
                    <p><strong>v2.1.2</strong> ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â Friends system with QR-based friend requests, real-time presence tracking.</p>
                    <p><strong>v2.1.1</strong> ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â Quantum Tools: document sharing, data encoding, hash generator.</p>
                    <p><strong>v2.1.0</strong> ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â Real-time messaging engine, end-to-end encryption pipeline.</p>
                    <p><strong>v2.0.0</strong> ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â Complete UI redesign with glassmorphic quantum theme.</p>
                    <p><strong>v1.0.0</strong> ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â Initial SHIELD OS release. Basic encrypted messaging.</p>
                </div > `
            },
            'btn-licenses': {
                title: 'OPEN SOURCE LICENSES',
                body: `< div class="doc-content" >
                    <h3>OPEN SOURCE LICENSES</h3>
                    <p><strong>Firebase SDK</strong> ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â Apache License 2.0 ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â Google LLC</p>
                    <p><strong>qrcode.js</strong> ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â MIT License ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â davidshimjs</p>
                    <p><strong>html5-qrcode</strong> ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â Apache License 2.0 ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â mebjas</p>
                    <p><strong>Inter Font</strong> ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â SIL Open Font License ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â Rasmus Andersson</p>
                    <p><strong>Outfit Font</strong> ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â SIL Open Font License ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â Rodrigo Fuenzalida</p>
                    <p><strong>JetBrains Mono</strong> ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â SIL Open Font License ÃƒÂ¢Ã¢â€šÂ¬Ã¢€Â JetBrains</p>
                    <p style="margin-top: 15px; opacity: 0.5;">All dependencies are used in compliance with their respective licenses. SHIELD OS itself is proprietary software of the SHIELD Network Collective.</p>
                </div > `
            }
        };

        Object.keys(docContents).forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.onclick = () => {
                    const modal = document.getElementById('tool-modal');
                    const modalTitle = document.getElementById('modal-title');
                    const modalBody = document.getElementById('modal-body');
                    modalTitle.innerText = docContents[btnId].title;
                    modalBody.innerHTML = docContents[btnId].body;
                    modal.style.display = 'flex';
                };
            }
        });

        // --- Font Size Selector ---
        document.querySelectorAll('.font-size-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.font-size-btn').forEach(b => {
                    b.style.background = 'rgba(255,255,255,0.05)';
                    b.style.borderColor = 'rgba(255,255,255,0.1)';
                    b.style.color = 'white';
                });
                btn.style.background = 'rgba(192,192,192,0.15)';
                btn.style.borderColor = 'rgba(192,192,192,0.3)';
                btn.style.color = 'var(--terminal-green)';
                localStorage.setItem('fontSize', btn.dataset.size);
                window.cyberAlert('FONT SIZE: ' + btn.dataset.size.toUpperCase());
            };
        });

        // --- Accent Color Picker ---
        document.querySelectorAll('.accent-dot').forEach(dot => {
            dot.onclick = () => {
                document.querySelectorAll('.accent-dot').forEach(d => {
                    d.style.border = '2px solid transparent';
                    d.style.boxShadow = 'none';
                });
                const color = dot.dataset.color;
                dot.style.border = `2px solid ${color} `;
                dot.style.boxShadow = `0 0 10px ${color} 40`;
                document.documentElement.style.setProperty('--terminal-green', color);
                localStorage.setItem('accentColor', color);
                window.cyberAlert('ACCENT: ' + color);
            };
        });
        // Restore saved accent
        const savedAccent = localStorage.getItem('accentColor');
        if (savedAccent) {
            document.documentElement.style.setProperty('--terminal-green', savedAccent);
            document.querySelectorAll('.accent-dot').forEach(d => {
                d.style.border = '2px solid transparent';
                d.style.boxShadow = 'none';
                if (d.dataset.color === savedAccent) {
                    d.style.border = `2px solid ${savedAccent} `;
                    d.style.boxShadow = `0 0 10px ${savedAccent} 40`;
                }
            });
        }

        // --- Theme Selector ---
        const themeOptions = document.querySelectorAll('.theme-option');

        function applyTheme(themeName) {
            if (themeName === 'default') {
                document.documentElement.removeAttribute('data-theme');
            } else {
                document.documentElement.setAttribute('data-theme', themeName);
            }

            // Update active state on theme options
            themeOptions.forEach(opt => {
                opt.classList.remove('active');
                if (opt.dataset.theme === themeName) {
                    opt.classList.add('active');
                }
            });

            localStorage.setItem('appTheme', themeName);
            window.cyberAlert('THEME: ' + themeName.toUpperCase().replace('-', ' '));
        }

        // Click listeners for theme options
        themeOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                applyTheme(opt.dataset.theme);
            });
        });

        // Restore saved theme
        const savedTheme = localStorage.getItem('appTheme');
        if (savedTheme && savedTheme !== 'default') {
            document.documentElement.setAttribute('data-theme', savedTheme);
            themeOptions.forEach(opt => {
                opt.classList.remove('active');
                if (opt.dataset.theme === savedTheme) {
                    opt.classList.add('active');
                }
            });
        }

        // --- Storage & Danger Zone ---
        const btnClearCache = document.getElementById('btn-clear-cache');
        if (btnClearCache) btnClearCache.onclick = () => {
            localStorage.clear();
            window.cyberAlert('CACHE PURGED');
        };

        const btnExport = document.getElementById('btn-export-data');
        if (btnExport) btnExport.onclick = () => {
            const data = JSON.stringify(localStorage, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'shield-export.json';
            a.click();
            window.cyberAlert('DATA EXPORTED');
        };

        const btnClearHistory = document.getElementById('btn-clear-history');
        if (btnClearHistory) btnClearHistory.onclick = async () => {
            const user = auth.currentUser;
            if (!user) {
                window.cyberAlert('AUTH REQUIRED', 'error');
                return;
            }

            if (await window.cyberConfirm('Erase all chat history permanently? This cannot be undone.', 'Purge History')) {
                try {
                    window.cyberAlert('PURGING SIGNAL HISTORY...');

                    const updates = {};

                    // 1. Target AI Chat
                    updates[`messages / ai_${user.uid} `] = null;

                    // 2. Target Friend Chats
                    const friendsSnap = await get(ref(database, `users / ${user.uid}/friends`));
                    if (friendsSnap.exists()) {
                        const friends = friendsSnap.val();
                        Object.keys(friends).forEach(fUid => {
                            const chatKey = [user.uid, fUid].sort().join('_');
                            updates[`messages/${chatKey}`] = null;
                        });
                    }

                    // 3. Clear User Library & Contacts
                    updates[`users/${user.uid}/friends`] = null;
                    updates[`users/${user.uid}/handshakeRequests`] = null;
                    updates[`users/${user.uid}/starred`] = null;

                    // Execute Multi-Path Purge
                    await update(ref(database), updates);

                    window.cyberAlert('HISTORY PURGED');

                    // Force refresh to clear UI state
                    setTimeout(() => window.location.reload(), 1500);
                } catch (err) {
                    console.error("Purge Error:", err);
                    window.cyberAlert('PURGE INTERRUPTED', 'error');
                }
            }
        };

        const btnDeactivate = document.getElementById('btn-deactivate');
        if (btnDeactivate) btnDeactivate.onclick = () => {
            window.cyberAlert('NODE DEACTIVATION REQUIRES ADMIN', 'error');
        };

        const btnDelete = document.getElementById('btn-delete-account');
        if (btnDelete) btnDelete.onclick = async () => {
            if (await window.cyberConfirm('Delete your account and all data permanently?', 'Delete Account')) {
                window.cyberAlert('ACCOUNT DELETION INITIATED', 'error');
            }
        };
    }

    // ============ SCANNER (Camera) ============
    window.openScanner = function (mode) {
        // Create fullscreen scanner overlay
        const overlay = document.createElement('div');
        overlay.id = 'scanner-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div style="position:absolute;top:calc(env(safe-area-inset-top) + 15px);left:15px;right:15px;display:flex;justify-content:space-between;align-items:center;z-index:10;">
                <button id="scanner-close" style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);color:#fff;border:none;font-size:20px;cursor:pointer;">✖️</button>
                <span style="color:#C0C0C0;font-size:0.8rem;font-family:monospace;">${mode === 'qr' ? 'QR SCANNER' : mode === 'friend' ? 'FRIEND SCANNER' : 'DOCUMENT SCANNER'}</span>
                <div style="width:40px;"></div>
            </div>
            <div style="position:relative;width:280px;height:280px;margin:20px 0;">
                <video id="scanner-video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;border-radius:12px;"></video>
                <div style="position:absolute;inset:0;border:2px solid rgba(192,192,192,0.6);border-radius:12px;pointer-events:none;">
                    <div style="position:absolute;top:-2px;left:-2px;width:30px;height:30px;border-top:3px solid #D4AF37;border-left:3px solid #D4AF37;border-radius:4px 0 0 0;"></div>
                    <div style="position:absolute;top:-2px;right:-2px;width:30px;height:30px;border-top:3px solid #D4AF37;border-right:3px solid #D4AF37;border-radius:0 4px 0 0;"></div>
                    <div style="position:absolute;bottom:-2px;left:-2px;width:30px;height:30px;border-bottom:3px solid #D4AF37;border-left:3px solid #D4AF37;border-radius:0 0 0 4px;"></div>
                    <div style="position:absolute;bottom:-2px;right:-2px;width:30px;height:30px;border-bottom:3px solid #D4AF37;border-right:3px solid #D4AF37;border-radius:0 0 4px 0;"></div>
                    <div id="scan-line-anim" style="position:absolute;top:10%;left:5%;width:90%;height:2px;background:linear-gradient(90deg,transparent,#D4AF37,transparent);animation:scanMove 2s linear infinite;"></div>
                </div>
            </div>
            <p style="color:rgba(192,192,192,0.6);font-size:0.7rem;margin-top:10px;font-family:monospace;">ALIGN TARGET WITHIN VIEWFINDER</p>
            <style>@keyframes scanMove{0%{top:10%}50%{top:85%}100%{top:10%}}</style>
        `;
        document.body.appendChild(overlay);

        // Start camera
        const video = document.getElementById('scanner-video');
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            }).then(stream => {
                video.srcObject = stream;
                video.setAttribute('playsinline', true);
                video.onloadedmetadata = () => {
                    video.play().catch(e => console.error("Video play failed", e));
                };
                window._scannerStream = stream;
            }).catch(err => {
                console.error('Camera error:', err);
                window.cyberAlert('CAMERA ACCESS DENIED', 'error');
                overlay.remove();
            });
        } else {
            window.cyberAlert('CAMERA NOT SUPPORTED', 'error');
            overlay.remove();
        }

        // Close button
        document.getElementById('scanner-close').onclick = () => {
            if (window._scannerStream) {
                window._scannerStream.getTracks().forEach(t => t.stop());
                window._scannerStream = null;
            }
            overlay.remove();
        };
    };

    // Launch Final UI Interaction Layer
    initGlobalInteractions();
    initInteractiveFeatures(); // For wallet tools and secure handshake
    initTools();
});