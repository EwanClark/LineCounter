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
            contextIsolation: true,
        },
        frame: false,
        icon: process.platform === 'win32' ? path.join('assets/icons/icon.ico') : path.join('assets/icons/icon.png'),
    });

    mainWindow.loadFile('src/page/index.html');
});

function getFileExtension(file) {
    const segments = file.split(path.sep); // Split path into segments by separator
    const extname = path.extname(file).toLowerCase(); // Get file extension

    // Loop through the segments to find the first hidden directory (starting with a '.')
    for (let segment of segments) {
        if (segment.startsWith('.')) {
            return segment; // Return the first hidden directory/file found
        }
    }
    return extname || path.basename(file);
}

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
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null; // Return null if no file is selected
    }
    return result.filePaths[0];
});

ipcMain.handle('readFile', async (_, filePath) => {
    let lineCount = 0;
    let wordCount = 0;
    let characterCount = 0;

    try {
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
            fileExtension: getFileExtension(filePath),
        };
    } catch (error) {
        console.error('Error selecting file:', error);
        throw error; // Rethrow the error to handle it in the renderer process
    }
});

ipcMain.handle('readFolder', async (_, folderPath) => {
    const files = [];

    const readFileStats = async (folderPath, baseDir) => {
        return new Promise((resolve, reject) => {
            let lineCount = 0;
            let wordCount = 0;
            let characterCount = 0;

            const fileStream = fs.createReadStream(folderPath);
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
                const relativePath = path.relative(baseDir, folderPath);
                resolve({
                    path: relativePath,
                    type: 'file',
                    lines: lineCount,
                    words: wordCount,
                    characters: characterCount,
                    fileExtension: getFileExtension(folderPath),
                });
            });

            rl.on('error', (error) => reject(error));
        });
    };

    const readDir = async (dir, baseDir) => {
        const items = fs.readdirSync(dir, { withFileTypes: true }); // Use withFileTypes to simplify
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            const relativePath = path.relative(baseDir, fullPath);

            try {
                if (item.isDirectory()) {
                    files.push({ path: relativePath, type: 'folder' });
                    await readDir(fullPath, baseDir); // Recursively read subdirectories
                } else if (item.isFile()) {
                    const fileStats = await readFileStats(fullPath, baseDir);
                    files.push(fileStats);
                }
            } catch (err) {
                console.error(`Error processing ${fullPath}:`, err.message);
                // Skip problematic files or directories
            }
        }
    };

    try {
        await readDir(folderPath, folderPath);
        return files;
    } catch (err) {
        console.error('Error reading folder:', err.message);
        throw err; // Re-throw the error to the renderer for feedback
    }
});


ipcMain.handle('isFile', async (_, folderPath, filePath) => {
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

ipcMain.handle('folderPath', async (_, folderName) => {
    try {
        const appDir = app.getPath('home'); // Default to the user's home directory
        const folderPath = path.join(appDir, folderName);

        if (fs.existsSync(folderPath)) {
            return folderPath; // Return the resolved path
        } else {
            throw new Error(`Folder "${folderName}" does not exist`);
        }
    } catch (err) {
        console.error('Error resolving folder path:', err);
        throw err;
    }
});

ipcMain.handle('filePath', async (_, fileName) => {
    try {
        const appDir = app.getPath('downloads'); // Default to the Downloads directory
        const filePath = path.join(appDir, fileName);

        if (fs.existsSync(filePath)) {
            return filePath; // Return the resolved path
        } else {
            throw new Error(`File "${fileName}" does not exist`);
        }
    } catch (err) {
        console.error('Error resolving file path:', err);
        throw err;
    }
});

ipcMain.handle('windowMinimize', () => {
    mainWindow.minimize();
});

ipcMain.handle('windowExit', () => {
    mainWindow.close();
});

ipcMain.handle('joinPaths', (_, ...paths) => {
    return path.join(...paths);
});

ipcMain.handle('getFileExtension', (_, file) => {
    return getFileExtension(file);
});