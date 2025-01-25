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
var lineorfile = 'lines';

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
                    if (lineorfile === 'lines') {
                        piedata[extension] += lines;
                    }
                    else {
                        piedata[extension] += 1;
                    }
                } else {
                    if (lineorfile === 'lines') {
                        piedata[extension] = lines;
                    }
                    else {
                        piedata[extension] = 1;
                    }
                }
                updatepiechart(piedata);
            } else {
                linecount.innerHTML = currentlinecount - lines;
                wordcount.innerHTML = currentwordcount - words;
                charactercount.innerHTML = currentcharactercount - characters;
                filecount.innerHTML = currentfilecount - 1; // Decrement file count
                if (lineorfile === 'lines') {
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
    const ctx = document.getElementById('pie-chart-extension').getContext('2d');
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
                        '#007bff', '#ffc107', '#28a745', '#dc3545', '#17a2b8',
                        '#6c757d', '#6610f2', '#fd7e14', '#ff6347', '#8a2be2', '#00bfff',
                        '#ff1493', '#ff4500', '#f0e68c', '#32cd32', '#ff8c00', '#d2691e',
                        '#2e8b57', '#d3d3d3', '#4b0082', '#ffff00', '#98fb98', '#ff00ff',
                        '#00ff00', '#ffd700', '#ff69b4', '#ff4500', '#8b0000', '#4682b4',
                        '#228b22', '#ff6347', '#adff2f', '#8b4513', '#4b0082', '#e9967a',
                        '#b0c4de', '#ffb6c1', '#000080', '#ff0000', '#00ff7f', '#c71585',
                        '#dda0dd', '#e6e6fa', '#800080', '#ff6347', '#ff1493', '#7fff00',
                        '#f08080', '#f4a460', '#00008b', '#ff8c00', '#ff4500', '#d3d3d3',
                        '#2e8b57', '#ff00ff', '#e9967a', '#483d8b', '#bdb76b', '#9acd32',
                        '#f0f8ff', '#6a5acd', '#ff1493', '#00ffff', '#c71585', '#f4a460',
                        '#20b2aa', '#98fb98', '#ff4500', '#9b30ff', '#ff6347', '#add8e6',
                        '#f8f8ff', '#d2691e', '#32cd32', '#ff6347', '#ffb6c1', '#4682b4',
                        '#228b22', '#ff0000', '#c71585', '#dda0dd', '#e6e6fa', '#800080',
                        '#ff00ff', '#ff6347', '#ff1493', '#7fff00', '#f08080', '#f4a460',
                        '#00008b', '#ff8c00', '#ff4500', '#d3d3d3', '#2e8b57', '#ff00ff'
                    ],
                    borderColor: '#1f1f1f',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'left',
                        labels: {
                            color: '#e0e0e0',
                            font: { size: 14 },
                            padding: 20,
                            boxWidth: 20, // Adjusts the size of the legend item
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (tooltipItem) {
                                const label = tooltipItem.label;
                                if (lineorfile === 'lines') {
                                    var percentage = ((tooltipItem.raw / linecount.innerHTML) * 100).toFixed(2);
                                    return `${label}: ${percentage}% (${tooltipItem.raw} lines)`;
                                }
                                else {
                                    var percentage = ((tooltipItem.raw / filecount.innerHTML) * 100).toFixed(2);
                                    return `${label}: ${percentage}% (${tooltipItem.raw} files)`;
                                }
                            }
                        }
                    }
                }
            }
        });
    }
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
    currentfolder.innerHTML = `Scanning: <code>${folderPath}</code>`;
    const files = await window.electron.readFolder(folderPath);
    filesAndFolders = files;
    piedata = {};
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
    piedata = {};
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

document.getElementById('show-file-types').addEventListener('click', async () => {
    if (lineorfile === 'lines') {
        lineorfile = 'files';
        document.getElementById('show-file-types').textContent = 'Show Lines Per File Extension';
        displaylineorfile.innerHTML = 'Showing Amount Of Files Per File Extension:';
    }
    else {
        lineorfile = 'lines';
        document.getElementById('show-file-types').textContent = 'Show files Per File Extension';
        displaylineorfile.innerHTML = 'Showing Amount Of Lines Per File Extension:';
    }

    // check all files and folders
    if (!filesAndFolders.path) {
        filesAndFolders.forEach(item => {
            itemname = item.path;
            document.getElementById(itemname).checked = true; 
        });
    }
    else{
        document.getElementById(filesAndFolders.path).checked = true;
    }


    piedata = {};

    if (filesAndFolders.path) {
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
    }
});

// change pie chart to show file per file extension to percentage of total lines per file extension
// Average lines per file
// Drag-and-drop file/folder support
// Progress bar for large scans
// open button to open file in default app
// remeber default Pie chart showing lines per file extension or files per file extension