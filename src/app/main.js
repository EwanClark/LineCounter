const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

let mainWindow;

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        frame: false,
        titleBarStyle: 'hidden',
    });

    mainWindow.loadFile('src/page/index.html');
});

ipcMain.handle('selectFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    return result.filePaths[0];
});

ipcMain.handle('selectFile', async () => {
    let lineCount = 0;
    let wordCount = 0;
    let characterCount = 0;

    try {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null; // Return null if no file is selected
        }

        const filePath = result.filePaths[0];

        await new Promise((resolve, reject) => {
            const fileStream = fs.createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity,
            });

            rl.on('line', (line) => {
                lineCount++;
                const words = line.trim().split(/\s+/);
                wordCount += words.filter((word) => word.length > 0).length;
                characterCount += line.length;
            });

            rl.on('close', () => {
                resolve();
            });

            rl.on('error', (error) => {
                reject(error);
            });
        });

        return {
            path: filePath,
            type: 'file',
            lines: lineCount,
            words: wordCount,
            characters: characterCount,
        };
    } catch (error) {
        console.error('Error selecting file:', error);
        throw error; // Rethrow the error to handle it in the renderer process
    }
});
ipcMain.handle('readFolder', async (_, folderPath) => {
    const files = [];

    const readFileStats = async (filePath, baseDir) => {
        return new Promise((resolve, reject) => {
            let lineCount = 0;
            let wordCount = 0;
            let characterCount = 0;

            const fileStream = fs.createReadStream(filePath);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity, // Handle different types of line breaks
            });

            rl.on('line', (line) => {
                lineCount++;
                const words = line.trim().split(/\s+/);
                wordCount += words.filter((word) => word.length > 0).length;
                characterCount += line.length;
            });

            rl.on('close', () => {
                const relativePath = path.relative(baseDir, filePath);
                resolve({
                    path: relativePath,
                    type: 'file',
                    lines: lineCount,
                    words: wordCount,
                    characters: characterCount,
                });
            });

            rl.on('error', (error) => reject(error));
        });
    };

    const readDir = async (dir, baseDir) => {
        const items = fs.readdirSync(dir);
        for (const file of items) {
            const fullPath = path.join(dir, file);
            const relativePath = path.relative(baseDir, fullPath);

            if (fs.lstatSync(fullPath).isDirectory()) {
                files.push({ path: relativePath, type: 'folder' });
                await readDir(fullPath, baseDir); // Recursively read subdirectories
            } else {
                const fileStats = await readFileStats(fullPath, baseDir);
                files.push(fileStats);
            }
        }
    };

    await readDir(folderPath, folderPath);
    return files;
});

ipcMain.handle('isFile', async (_, filePath, folderPath) => {
    try {
        if (folderPath) {
            filePath = path.join(folderPath, filePath);
        }
        return fs.statSync(filePath).isFile();
    } catch (error) {
        console.error(`Error checking file: ${filePath}`, error);
        return error;
    }
});

ipcMain.handle('exportData', async (_, data) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: 'data.json',
        });

        if (result.canceled || !result.filePath) {
            return null;
        }

        fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
        return result.filePath;
    } catch (error) {
        console.error('Error exporting data:', error);
        throw error;
    }
});