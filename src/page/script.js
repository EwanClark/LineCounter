// Get references to search bar and tree view
const searchBar = document.getElementById('search-bar');
const treeView = document.getElementById('tree-view');
const linecount = document.getElementById('linecount');
const wordcount = document.getElementById('wordcount');
const charactercount = document.getElementById('charactercount');
const filecount = document.getElementById('filecount');
const currentfolder = document.getElementById('currentfolder');
const displaylineorfile = document.getElementById('displaylineorfile');

var folderPath;
var filesAndFolders
var piedata = {};
var typeofchart = 'lines';
var legend = false;

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

// Recursive function to set the states of all children
function setChildrenState(folder, isChecked) {
    const children = getchildren(folder);
    children.forEach(child => {
        checkboxStates[child.path] = isChecked; // Update state in the global object
        const checkbox = document.getElementById(child.path);
        if (checkbox) checkbox.checked = isChecked; // Update UI if checkbox exists

        if (child.type === 'folder') {
            setChildrenState(child.path, isChecked); // Recursively handle nested folders
        }
    });
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
        else {
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
                var extension = filesAndFolders.fileExtension;
            }
            else {
                var fileData = filesAndFolders.find(item => item.path === f);
                var lines = filesAndFolders.find(item => item.path === f).lines;
                var words = filesAndFolders.find(item => item.path === f).words;
                var characters = filesAndFolders.find(item => item.path === f).characters;
                var extension = filesAndFolders.find(item => item.path === f).fileExtension;
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
                if (extension in piedata) {
                    if (typeofchart === 'lines') {
                        piedata[extension] += lines;
                    } else if (typeofchart === 'files') {
                        piedata[extension] += 1;
                    } else if (typeofchart === 'words') {
                        piedata[extension] += words;
                    } else if (typeofchart === 'characters') {
                        piedata[extension] += characters;
                    }
                } else {
                    if (typeofchart === 'lines') {
                        piedata[extension] = lines;
                    } else if (typeofchart === 'files') {
                        piedata[extension] = 1;
                    } else if (typeofchart === 'words') {
                        piedata[extension] = words;
                    } else if (typeofchart === 'characters') {
                        piedata[extension] = characters;
                    }
                }
                updatepiechart(piedata);
            } else {
                linecount.innerHTML = currentlinecount - lines;
                wordcount.innerHTML = currentwordcount - words;
                charactercount.innerHTML = currentcharactercount - characters;
                filecount.innerHTML = currentfilecount - 1; // Decrement file count
                if (typeofchart === 'lines') {
                    piedata[extension] -= lines;
                }
                else {
                    piedata[extension] -= 1;
                }
                updatepiechart(piedata);
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

let pieChart; // Declare a variable to hold the chart instance

function updatepiechart(data) {
    const ctx = document.getElementById('pie-chart').getContext('2d');
    if (pieChart) {
        pieChart.data.labels = Object.keys(data);
        pieChart.data.datasets[0].data = Object.values(data);
        pieChart.update();
    } else {
        pieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: [
                        '#1E88E5', '#FF5722', '#8BC34A', '#FFEB3B', '#9C27B0',
                        '#3F51B5', '#FFC107', '#CDDC39', '#00BCD4', '#FF9800',
                        '#009688', '#E91E63', '#4CAF50', '#FF4081', '#673AB7'
                    ],
                    borderColor: '#1f1f1f',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: legend,
                    },
                    tooltip: {
                        callbacks: {
                            label: function (tooltipItem) {
                                const label = tooltipItem.label;
                                if (typeofchart === 'lines') {
                                    var percentage = ((tooltipItem.raw / linecount.innerHTML) * 100).toFixed(2);
                                    return `${label}: ${percentage}% (${tooltipItem.raw} lines)`;
                                } else if (typeofchart === 'files') {
                                    var percentage = ((tooltipItem.raw / filecount.innerHTML) * 100).toFixed(2);
                                    return `${label}: ${percentage}% (${tooltipItem.raw} files)`;
                                } else if (typeofchart === 'words') {
                                    var percentage = ((tooltipItem.raw / wordcount.innerHTML) * 100).toFixed(2);
                                    return `${label}: ${percentage}% (${tooltipItem.raw} words)`;
                                } else if (typeofchart === 'characters') {
                                    var percentage = ((tooltipItem.raw / charactercount.innerHTML) * 100).toFixed(2);
                                    return `${label}: ${percentage}% (${tooltipItem.raw} characters)`;
                                }
                            }
                        }
                    }
                }
            }
        });
    }
}

async function init() {
    document.querySelectorAll('input[name="option"]').forEach(button => {
        button.disabled = true;
    });
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.disabled = true;
    });
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
    document.querySelectorAll('input[name="option"]').forEach(button => {
        button.disabled = false;
    });
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.disabled = false;
    });
}


searchBar.addEventListener('input', () => {
    const listItems = treeView.getElementsByTagName('li');

    searchBar.addEventListener('input', () => {
        const searchText = searchBar.value.toLowerCase();

        for (let item of listItems) {
            const itemText = item.textContent.toLowerCase();
            if (itemText.includes(searchText)) {
                item.style.display = 'flex'; // Show the item if it matches
            } else {
                item.style.display = 'none'; // Hide the item if it doesn't match
            }
        }
    });
});

document.getElementById('select-folder').addEventListener('click', async () => {
    folderPath = await window.electron.selectFolder();
    if (!folderPath) {
        return;
    }
    await init();
});

document.getElementById('select-file').addEventListener('click', async () => {
    const filepath = await window.electron.selectAndReadFile();
    if (!filepath) {
        return;
    }
    currentfolder.innerHTML = `Scanning: <code>'${filepath.path}'</code>`;
    filesAndFolders = filepath;
    piedata = {};
    rendertree(filepath);
    filecount.innerHTML = 0;
    linecount.innerHTML = 0;
    wordcount.innerHTML = 0;
    charactercount.innerHTML = 0;
    document.querySelectorAll('input[name="option"]').forEach(button => {
        button.disabled = true;
    });
    await updatestats(true, filepath.path);
    document.querySelectorAll('input[name="option"]').forEach(button => {
        button.disabled = false;
    });

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

document.querySelectorAll('input[name="option"]').forEach(button => {
    button.addEventListener('change', async (event) => {
        option = event.target.value;
        if (option === 'lines') {
            typeofchart = 'lines';
            displaylineorfile.innerHTML = 'Showing Lines Per File Extension:';
        } else if (option === 'files') {
            typeofchart = 'files';
            displaylineorfile.innerHTML = 'Showing Files Per File Extension:';
        } else if (option === 'words') {
            typeofchart = 'words';
            displaylineorfile.innerHTML = 'Showing Words Per File Extension:';
        } else if (option === 'characters') {
            typeofchart = 'characters';
            displaylineorfile.innerHTML = 'Showing Characters Per File Extension:';
        }

        // check all files and folders
        if (!filesAndFolders.path) {
            filesAndFolders.forEach(item => {
                itemname = item.path;
                document.getElementById(itemname).checked = true;
            });
        }
        else {
            document.getElementById(filesAndFolders.path).checked = true;
        }


        piedata = {};

        // stop radio buttons from being pressed when updating
        document.querySelectorAll('input[name="option"]').forEach(button => {
            button.disabled = true;
        });

        if (filesAndFolders.path) {
            filecount.innerHTML = 0;
            linecount.innerHTML = 0;
            wordcount.innerHTML = 0;
            charactercount.innerHTML = 0;
            await updatestats(true, filesAndFolders.path);
        }
        else {
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
            // re-enable radio buttons
            document.querySelectorAll('input[name="option"]').forEach(button => {
                button.disabled = false;
            });
        }
    });
});

document.querySelectorAll('input[name="legend"]').forEach(button => {
    button.addEventListener('change', async () => {
        if (legend) {
            legend = false;
        } else {
            legend = true;
        }
        pieChart.options.plugins.legend.display = legend;
        pieChart.update();
    });
});

document.getElementById('reload').addEventListener('click', async () => {
    if (filesAndFolders.path) {
        localStorage.setItem('path', filesAndFolders.path);
    } else {
        localStorage.setItem('path', folderPath);
    }
    location.reload();
});

document.addEventListener('DOMContentLoaded', () => {
    // Prevent default drag-and-drop behaviors for the entire document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
        document.addEventListener(event, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    // Highlight page when dragging
    ['dragenter', 'dragover'].forEach(event => {
        document.addEventListener(event, () => {
            document.body.style.border = '5px dashed #1e88e5'; // Highlight border
        });
    });

    // Remove highlight when dragging out
    ['dragleave', 'drop'].forEach(event => {
        document.addEventListener(event, () => {
            document.body.style.border = 'none';
        });
    });

    // Handle dropped files/folders
    document.addEventListener('drop', async (e) => {
        e.stopPropagation();
        e.preventDefault();

        const droppedItems = e.dataTransfer.items;

        // Ensure a single item is dropped
        if (droppedItems.length > 1) {
            alert('Please drop only one file or folder at a time');
            return;
        }

        const item = droppedItems[0];

        // Check if the dropped item is a file or a directory
        if (item.kind === 'file') {
            // Handle file drop
            const file = item.getAsFile();
            const filePath = await window.electron.showFilePath(file);
            console.log(filePath);
        } else if (item.kind === 'directory') {
            // Handle folder drop
            const directoryEntry = item.getAsEntry();
            folderPath = await window.electron.showFilePath(directoryEntry);
            init();
        } else {
            console.error("Unsupported item type:", item.kind);
        }
    });
});

if (localStorage.getItem('path')) {
    folderPath = localStorage.getItem('path');
    localStorage.clear();
    init();
}

// TODO:
// Drag-and-drop file/folder support --- TEST ON WINDOWS BECUASE NOT WORKING HERE
// add more data analytics to the chart
// Progress bar for large scans
// open button to open file in default app