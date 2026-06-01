// Upload files to Firebase Storage using firebase-tools auth token
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Get the firebase login token from config
const configDir = path.join(process.env.APPDATA || '', 'configstore');
let token = null;

try {
    const configPath = path.join(configDir, 'firebase-tools.json');
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        token = config.tokens?.refresh_token;
        console.log('Found Firebase refresh token');
    }
} catch (e) {
    console.log('No firebase config found, trying alternative...');
}

if (!token) {
    // Try the newer location
    const homeDir = process.env.USERPROFILE || process.env.HOME;
    const altPaths = [
        path.join(homeDir, '.config', 'configstore', 'firebase-tools.json'),
        path.join(configDir, 'firebase-tools.json'),
    ];
    for (const p of altPaths) {
        try {
            if (fs.existsSync(p)) {
                const config = JSON.parse(fs.readFileSync(p, 'utf8'));
                token = config.tokens?.refresh_token;
                if (token) {
                    console.log('Found token at:', p);
                    break;
                }
            }
        } catch (e) {}
    }
}

if (!token) {
    console.error('ERROR: No Firebase token found. Please run: firebase login');
    process.exit(1);
}

// Exchange refresh token for access token
async function getAccessToken() {
    return new Promise((resolve, reject) => {
        const data = `grant_type=refresh_token&refresh_token=${encodeURIComponent(token)}&client_id=563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com&client_secret=j9iVZfS8kkCEFUPaAeJV0sAi`;
        
        const req = https.request({
            hostname: 'oauth2.googleapis.com',
            path: '/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (json.access_token) resolve(json.access_token);
                    else reject(new Error('No access token: ' + body));
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// Upload to Firebase Storage using REST API
async function uploadFile(accessToken, localPath, remoteName, contentType) {
    const fileBuffer = fs.readFileSync(localPath);
    const sizeMB = (fileBuffer.length / 1024 / 1024).toFixed(1);
    console.log(`\nUploading ${path.basename(localPath)} (${sizeMB} MB) → ${remoteName}`);

    const bucket = 'noor-cf2f7.appspot.com';
    const encodedName = encodeURIComponent(remoteName);

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'storage.googleapis.com',
            path: `/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodedName}`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': contentType,
                'Content-Length': fileBuffer.length
            },
            timeout: 600000 // 10 min timeout for large files
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const json = JSON.parse(body);
                        const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedName}?alt=media`;
                        console.log(`  ✅ Upload complete!`);
                        console.log(`  URL: ${downloadUrl}`);
                        resolve(downloadUrl);
                    } catch (e) { resolve(body); }
                } else {
                    reject(new Error(`Upload failed (${res.statusCode}): ${body}`));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Upload timeout')); });
        
        // Write in chunks to show progress
        const chunkSize = 5 * 1024 * 1024; // 5MB chunks
        let offset = 0;
        function writeChunk() {
            const end = Math.min(offset + chunkSize, fileBuffer.length);
            const chunk = fileBuffer.slice(offset, end);
            const canContinue = req.write(chunk);
            offset = end;
            const pct = ((offset / fileBuffer.length) * 100).toFixed(0);
            process.stdout.write(`\r  Progress: ${pct}%`);
            
            if (offset < fileBuffer.length) {
                if (canContinue) {
                    setImmediate(writeChunk);
                } else {
                    req.once('drain', writeChunk);
                }
            } else {
                console.log('');
                req.end();
            }
        }
        writeChunk();
    });
}

async function main() {
    console.log('=== Firebase Storage Uploader ===\n');
    
    const accessToken = await getAccessToken();
    console.log('✅ Got access token');
    
    const apkUrl = await uploadFile(
        accessToken,
        path.join(__dirname, 'app website', 'releases', 'Shield_Elite_v8.2.0.bin'),
        'releases/Shield-OS-Elite-v8.2.0.apk',
        'application/vnd.android.package-archive'
    );
    
    const zipUrl = await uploadFile(
        accessToken,
        path.join(__dirname, 'app website', 'releases', 'Shield_Elite_v8.2.0.zip'),
        'releases/Shield-OS-Elite-v8.2.0.zip',
        'application/zip'
    );
    
    console.log('\n=== FAST DOWNLOAD URLs (Firebase Storage CDN) ===');
    console.log('APK:', apkUrl);
    console.log('ZIP:', zipUrl);
}

main().catch(err => {
    console.error('Failed:', err.message);
    process.exit(1);
});
