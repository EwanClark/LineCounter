// src/app/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose the methods to the renderer process
contextBridge.exposeInMainWorld('electron', {
    selectFolder: () => ipcRenderer.invoke('selectFolder'), // Communicate with main process to select a folder
    readFolder: (folderPath) => ipcRenderer.invoke('readFolder', folderPath), // Read files in the selected folder
    selectAndReadFile: () => ipcRenderer.invoke('selectAndReadFile'), // Communicate with main process to select a file
    countLines: (filePath) => ipcRenderer.invoke('countLines', filePath), // Count lines in a file
    countWords: (filePath) => ipcRenderer.invoke('countWords', filePath), // Count words in a file
    countCharacters: (filePath) => ipcRenderer.invoke('countCharacters', filePath), // Count characters in a file
    isFile: (filePath, folderPath) => ipcRenderer.invoke('isFile', filePath, folderPath), // Check if a path is a file
    exportData: (data) => ipcRenderer.invoke('exportData', data), // Export data to a file
});