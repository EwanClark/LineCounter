// Get references to search bar and tree view
const searchBar = document.getElementById('search-bar');
const treeView = document.getElementById('tree-view');
const linecount = document.getElementById('linecount');
const wordcount = document.getElementById('wordcount');
const charactercount = document.getElementById('charactercount');
const filecount = document.getElementById('filecount');
const currentfolder = document.getElementById('currentfolder');
var folderPath;
let filesAndFolders

// Function to show an alert
function sendalert(message) {
    // Set the message in the modal
    document.getElementById('alert-message').textContent = message;

    // Show the modal
    document.getElementById('custom-alert').style.display = 'flex';

    // Close the modal when clicking the close button or OK button
    document.getElementById('alert-ok').onclick = closeModal;
}

function closeModal() {
    document.getElementById('custom-alert').style.display = 'none';
}

// Render the tree And adds event listeners for checkboxes
function rendertree(data) {
    treeView.innerHTML = '';
    var newhtml = '';
    stats = '';
    if (!data.path) {
        data.forEach(item => {
            const itemname = item.path;
            if (filesAndFolders.find(item => item.path === itemname).lines) {
                stats = `(${filesAndFolders.find(item => item.path === itemname).lines} lines, ${filesAndFolders.find(item => item.path === itemname).words} words, ${filesAndFolders.find(item => item.path === itemname).characters} characters)`;
            }
            if (item.type === 'folder') {
                newhtml += `<li>
                        <input type="checkbox" id="${itemname}" checked>
                        <label for="${itemname}">📁 ${itemname}</label>
                    </li>`;
            }
            else {
                newhtml += `<li>
                        <input type="checkbox" id="${itemname}" checked>
                        <label for="${itemname}">📄 ${itemname} <span class="stats">${stats}</span></label>
                    </li>`;
            }
        });
    }
    else {
        const itemname = data.path;
        if (data.lines) {
            stats = `(${data.lines} lines, ${data.words} words, ${data.characters} characters)`;
        }
        if (data.type === 'folder') {
            newhtml += `<li>
                    <input type="checkbox" id="${itemname}" checked>
                    <label for="${itemname}">📁 ${itemname}</label>
                </li>`;
        }
        else {
            newhtml += `<li>
                    <input type="checkbox" id="${itemname}" checked>
                    <label for="${itemname}">📄 ${itemname} <span class="stats">${stats}</span></label>
                </li>`;
        }
    }
    treeView.innerHTML += newhtml;

    // Add event listeners for checkboxes
    if (!data.path) {
        data.forEach(item => {
            const itemname = item.path;
            document.getElementById(itemname).addEventListener('change', async () => {
                await arfile(itemname, document.getElementById(itemname).checked, item.type);
            });
        });
    }
    else {
        const itemname = data.path;
        document.getElementById(itemname).addEventListener('change', async () => {
            await arfile(itemname, document.getElementById(itemname).checked, data.type);
        });
    }
}

// Get all children of a folder

function getchildren(folder) {
    var children = []
    filesAndFolders.forEach(item => {
        if (item.path.startsWith(folder) && item.path !== folder) {
            children.push(item);
        }
    });
    return children;
}


// Update the stats based on the file/folder selection

async function updatestats(a, f) {
    if (Array.isArray(f)) {
        for (const file of f) {
            // If it's a folder and hasn't been processed yet
            if (file.type === 'folder') {
                const children = getchildren(file.path);
                for (const child of children) {
                    const checkbox = document.getElementById(child.path);
                    if (checkbox && !checkbox.checked) {
                        checkbox.checked = true;
                        const isFile = await window.electron.isFile(child.path, folderPath);
                        if (isFile) {
                            await updatestats(true, child.path);
                        } else {
                            await updatestats(true, children);
                        }
                    }
                }
            }
            // If it's a file, process it
            if (file.type === 'file') {
                await updatestats(a, file.path);
            }
        }
    } else {

        // check if it is a single file or a folder scanning

        // Check if the path is a file
        if (filesAndFolders.path) {
            var isFile = true;
        }
        else{
            var isFile = await window.electron.isFile(f, folderPath);
        }

        if (folderPath === undefined) {
            fullfilepath = f;
        }
        else {
            fullfilepath = folderPath + '/' + f;
        }

        if (isFile === false) {
            // If it's a folder, get and process all its children
            const children = getchildren(fullfilepath);
            await updatestats(a, children);
        } else {


            // If it's a file, count lines, words, and characters
            if (filesAndFolders.path) {
                var fileData = filesAndFolders;
                var lines = filesAndFolders.lines;
                var words = filesAndFolders.words;
                var characters = filesAndFolders.characters;
            }
            else {              
                var fileData = filesAndFolders.find(item => item.path === f);
                var lines = filesAndFolders.find(item => item.path === f).lines;
                var words = filesAndFolders.find(item => item.path === f).words;
                var characters = filesAndFolders.find(item => item.path === f).characters;
            }
            if (fileData && !fileData.lines) {
                fileData.lines = lines;
                fileData.words = words;
                fileData.characters = characters;

                // Update the stats span
                const statsSpan = document.querySelector(`label[for="${f}"] .stats`);
                if (statsSpan) {
                    statsSpan.textContent = `(${lines} lines, ${words} words, ${characters} characters)`;
                }
            } else if (!fileData) {
                sendalert(`Path not found: ${f}`);
                console.error(`Path not found: ${f}`);
            }

            // Update counts
            const currentlinecount = parseInt(linecount.innerHTML) || 0;
            const currentwordcount = parseInt(wordcount.innerHTML) || 0;
            const currentcharactercount = parseInt(charactercount.innerHTML) || 0;
            const currentfilecount = parseInt(filecount.innerHTML) || 0;

            if (a) {
                linecount.innerHTML = currentlinecount + lines;
                wordcount.innerHTML = currentwordcount + words;
                charactercount.innerHTML = currentcharactercount + characters;
                filecount.innerHTML = currentfilecount + 1; // Increment file count
            } else {
                linecount.innerHTML = currentlinecount - lines;
                wordcount.innerHTML = currentwordcount - words;
                charactercount.innerHTML = currentcharactercount - characters;
                filecount.innerHTML = currentfilecount - 1; // Decrement file count
            }
        }
    }
}

// Recursive function to process files and folders

async function arfile(itemPath, isChecked, itemType) {
    try {
        if (isChecked && itemType === 'folder') {
            const children = getchildren(itemPath);

            for (const child of children) {
                const checkbox = document.getElementById(child.path);

                if (checkbox && !checkbox.checked) {
                    checkbox.checked = true;

                    // Check if the child is a file or folder
                    const isFile = await window.electron.isFile(child.path, folderPath);
                    if (isFile) {
                        await updatestats(true, child.path); // Process file stats
                    } else {
                        await arfile(child.path, true, 'folder'); // Recursively process folders
                    }
                }
            }
        } else if (isChecked && itemType === 'file') {
            await updatestats(true, itemPath);
        } else if (!isChecked && itemType === 'folder') {
            const children = getchildren(itemPath);

            for (const child of children) {
                const checkbox = document.getElementById(child.path);
                if (checkbox && checkbox.checked) {
                    checkbox.checked = false;

                    const isFile = await window.electron.isFile(child.path, folderPath);
                    if (isFile) {
                        await updatestats(false, child.path); // Process file stats
                    } else {
                        await arfile(child.path, false, 'folder'); // Recursively process folders
                    }
                }
            }
        } else if (!isChecked && itemType === 'file') {
            await updatestats(false, itemPath);
        } else {
            sendalert(`Error processing item: ${itemPath}`);
            console.error('Error: Unknown condition');
        }
    } catch (error) {
        sendalert(`Error processing item: ${itemPath}`);
        console.error(`Error processing item: ${itemPath}`, error);
    }
}


searchBar.addEventListener('input', () => {
    const searchTerm = searchBar.value.toLowerCase();
    const filteredItems = filesAndFolders.filter(item =>
        item.path.toLowerCase().includes(searchTerm)
    );
    rendertree(filteredItems);
});

document.getElementById('select-folder').addEventListener('click', async () => {
    folderPath = await window.electron.selectFolder();
    if (!folderPath) {
        return;
    }
    currentfolder.innerHTML = `Scanning: <code>${folderPath}</code>`;
    const files = await window.electron.readFolder(folderPath);
    filesAndFolders = files;
    rendertree(filesAndFolders);
    
    const totalItems = filesAndFolders.length;
    const chunkSize = 1500;

    filecount.innerHTML = 0;
    linecount.innerHTML = 0;
    wordcount.innerHTML = 0;
    charactercount.innerHTML = 0;

    if (totalItems > chunkSize) {
        for (let i = 0; i < totalItems; i += chunkSize) {
            const chunk = filesAndFolders.slice(i, i + chunkSize);
            console.log("chunk", chunk);
            await updatestats(true, chunk); // Update stats for the current chunk
        }
    }
    else {
        await updatestats(true, filesAndFolders);
    }
});

document.getElementById('select-file').addEventListener('click', async () => {
    const filepath = await window.electron.selectAndReadFile();
    if (!filepath) {
        return;
    }
    currentfolder.innerHTML = `Scanning: <code>'${filepath.path}'</code>`;
    filesAndFolders = filepath;
    rendertree(filepath);
    filecount.innerHTML = 0;
    linecount.innerHTML = 0;
    wordcount.innerHTML = 0;
    charactercount.innerHTML = 0;
    await updatestats(true, filepath.path);
    
});

document.getElementById('export-data').addEventListener('click', async () => {
    const result = await window.electron.exportData(filesAndFolders);
    if (result) {
        datafile = result;
        sendalert(`Data exported successfully to ${datafile}`);
    } else {
        console.error('Error exporting data');
        sendalert('Error exporting data');
    }
});

function generatePieChart(data) {
    const ctx = document.createElement('canvas'); // Create a canvas element dynamically
    document.getElementById('pie-chart').appendChild(ctx); // Append it to the pie-chart div

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(data), // File extensions
            datasets: [{
                data: Object.values(data), // File counts
                backgroundColor: [
                    '#007bff', '#ffc107', '#28a745', '#dc3545', '#17a2b8',
                    '#6c757d', '#6610f2', '#fd7e14'
                ], // Example colors
                borderColor: '#1f1f1f',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e0e0e0', // Legend text color
                        font: { size: 14 }
                    }
                },
                tooltip: {
                    callbacks: {
                        // Display percentage in the tooltip
                        label: function(tooltipItem) {
                            const total = tooltipItem.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((tooltipItem.raw / total) * 100).toFixed(2);
                            return `${tooltipItem.label}: ${percentage}%`; // Show percentage in tooltip
                        }
                    }
                }
            }
        }
    });
}

// Example usage
document.addEventListener('DOMContentLoaded', () => {
    const exampleData = {
        ".js": 30,
        ".html": 20,
        ".css": 15,
        ".json": 10,
        ".txt": 25
    };

    generatePieChart(exampleData); // Call function with example data
});