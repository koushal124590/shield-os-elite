const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let server;
const PORT = 42801;

function startLocalServer() {
    server = http.createServer((req, res) => {
        // Remove query strings and normalize path
        let urlPath = req.url.split('?')[0];
        if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
        
        const filePath = path.join(__dirname, 'www', urlPath);

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.statusCode = 404;
                res.end('Not Found');
            } else {
                const ext = path.extname(filePath).toLowerCase();
                const contentType = {
                    '.html': 'text/html',
                    '.js': 'text/javascript',
                    '.css': 'text/css',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.svg': 'image/svg+xml',
                    '.json': 'application/json'
                }[ext] || 'application/octet-stream';
                
                res.setHeader('Content-Type', contentType);
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(data);
            }
        });
    });
    server.on('error', (e) => console.error('Server error:', e));
    server.listen(PORT, '127.0.0.1');
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        backgroundColor: '#000000',
        icon: path.join(__dirname, 'www', 'assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false, // Re-enable to ensure local assets can talk to cloud
            allowRunningInsecureContent: true
        },
        frame: true,
        autoHideMenuBar: true
    });

    win.loadURL(`http://localhost:${PORT}/index.html`);
    
    win.once('ready-to-show', () => {
        win.show();
    });
}

app.whenReady().then(() => {
    startLocalServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (server) server.close();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});


