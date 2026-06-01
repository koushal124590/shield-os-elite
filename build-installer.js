const electronInstaller = require('electron-winstaller');
const path = require('path');
const fs = require('fs');

async function createInstaller() {
    console.log('--- INITIALIZING SHIELD OS INSTALLER BUILD ---');
    
    const appDirectory = 'C:\\Users\\koush\\s_build';
    const outputDirectory = 'C:\\Users\\koush\\s_out';

    try {
        await electronInstaller.createWindowsInstaller({
            appDirectory: appDirectory,
            outputDirectory: outputDirectory,
            authors: 'SHIELD OS',
            exe: 'SHIELD OS Elite.exe',
            setupExe: 'Shield_Elite_v8.2.0_Installer.exe',
            description: 'SHIELD OS Elite Desktop Protocol',
            noMsi: true,
            setupIcon: 'C:\\Users\\koush\\s_out\\icon.ico',
        });
        console.log(`--- INSTALLER GENERATED SUCCESSFULLY IN ${outputDirectory} ---`);
    } catch (e) {
        console.log(`BUILD ERROR: ${e.message}`);
    }
}

createInstaller();

