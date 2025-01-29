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
var filesAndFolders;
var piedata = {};
var typeofchart = 'lines';
var legend = false;
var pieChart;
var processfilecount = 0;
var realfilecount = 0;

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

function updateProgressBar(progress) {
    const progressBar = document.getElementById("progress-bar");
    const currentWidth = parseFloat(progressBar.style.width) || 0;
    progress = Math.floor(progress);
    if (progress > currentWidth) {
        progressBar.style.width = progress + "%";
        document.getElementById("total-header").textContent = `Total   -  ${progress}%`;
        if (progress === 100) {
            const timerId = setTimeout(() => {
                progressBar.style.width = "0%";
                document.getElementById("total-header").textContent = `TOTAL`;
                clearTimeout(timerId);
            }, 500);
        }
    }
}

// Update the stats based on the file/folder selection

async function updatestats(a, f, stats) {
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
                            await updatestats(true, child.path, stats);
                        } else {
                            await updatestats(true, children, stats);
                        }
                    }
                }
            }
            // If it's a file, process it
            if (file.type === 'file') {
                await updatestats(a, file.path, stats);
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
            // might need to check for windows compatablility with +'\\'+f
        }

        if (isFile === false) {
            // If it's a folder, get and process all its children
            const children = getchildren(fullfilepath);
            await updatestats(a, children, stats);
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
            console.log(stats);
            if (stats) {
                processfilecount += 1;
                processpercentage = processfilecount / realfilecount * 100;
                updateProgressBar(processpercentage);
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
                        await updatestats(true, child.path, false); // Process file stats
                    } else {
                        await arfile(child.path, true, 'folder'); // Recursively process folders
                    }
                }
            }
        } else if (isChecked && itemType === 'file') {
            await updatestats(true, itemPath, false);
        } else if (!isChecked && itemType === 'folder') {
            const children = getchildren(itemPath);

            for (const child of children) {
                const checkbox = document.getElementById(child.path);
                if (checkbox && checkbox.checked) {
                    checkbox.checked = false;

                    const isFile = await window.electron.isFile(child.path, folderPath);
                    if (isFile) {
                        await updatestats(false, child.path, false); // Process file stats
                    } else {
                        await arfile(child.path, false, 'folder'); // Recursively process folders
                    }
                }
            }
        } else if (!isChecked && itemType === 'file') {
            await updatestats(false, itemPath, false);
        } else {
            sendalert(`Error processing item: ${itemPath}`);
            console.error('Error: Unknown condition');
        }
    } catch (error) {
        sendalert(`Error processing item: ${itemPath}`);
        console.error(`Error processing item: ${itemPath}`, error);
    }
}

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
                                if (!filesAndFolders.path) {
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
                                else {
                                    if (typeofchart === 'lines') {
                                        return `${label}: 100% (${tooltipItem.raw} lines)`;
                                    } else if (typeofchart === 'files') {
                                        return `${label}: 100% (${tooltipItem.raw} files)`;
                                    } else if (typeofchart === 'words') {
                                        return `${label}: 100% (${tooltipItem.raw} words)`;
                                    } else if (typeofchart === 'characters') {
                                        return `${label}: 100% (${tooltipItem.raw} characters)`;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }
}

async function init(f) {
    document.querySelectorAll('input[name="option"]').forEach(button => {
        button.disabled = true;
    });
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.disabled = true;
    });
    document.getElementById('export-data').disabled = true;
    document.getElementById('select-folder').disabled = true;
    document.getElementById('select-file').disabled = true;


    if (f) {
        const isfile = await window.electron.isFile(f, '');
        if (!isfile) {
            console.log('Selecting a file, choose a folder')
            sendalert('Please use the "Select Folder" button to select a folder');
            return;
        }
        document.getElementById('export-data').disabled = false;
        filecount.innerHTML = 0;
        linecount.innerHTML = 0;
        wordcount.innerHTML = 0;
        charactercount.innerHTML = 0;
        piedata = {};

        const file = await window.electron.readFile(f);

        currentfolder.innerHTML = `Scanning: <code>'${file.path}'</code>`;
        filesAndFolders = file;
        rendertree(file);
        processfilecount = 0;
        await updatestats(true, file, true);
    } else if (folderPath) {
        filecount.innerHTML = 0;
        linecount.innerHTML = 0;
        wordcount.innerHTML = 0;
        charactercount.innerHTML = 0;
        processfilecount = 0;
        piedata = {};

        currentfolder.innerHTML = `Scanning: <code>${folderPath}</code>`;
        const files = await window.electron.readFolder(folderPath);
        filesAndFolders = files;

        var count = filesAndFolders.length;
        filesAndFolders.forEach(element => {
            if (element.type === 'folder') {
                count -= 1;
            }
        });
        realfilecount = count;

        rendertree(filesAndFolders);

        const totalItems = filesAndFolders.length;
        const chunkSize = 1500;

        if (totalItems > chunkSize) {
            for (let i = 0; i < totalItems; i += chunkSize) {
                const chunk = filesAndFolders.slice(i, i + chunkSize);
                console.log("chunk", chunk);
                console.log('doing it')
                await updatestats(true, chunk, true); // Update stats for the current chunk
            }
        }
        else {
            console.log('doing it')
            await updatestats(true, filesAndFolders, true);
        }
    } else {
        sendalert('Error selecting file/folder');
        console.error('Error selecting file/folder');
    }

    document.querySelectorAll('input[name="option"]').forEach(button => {
        button.disabled = false;
    });
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.disabled = false;
    });
    document.getElementById('export-data').disabled = false;
    document.getElementById('select-folder').disabled = false;
    document.getElementById('select-file').disabled = false;
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
    const filepath = await window.electron.selectFile();
    if (!filepath) {
        return;
    }
    await init(filepath);
});

document.getElementById('export-data').addEventListener('click', async () => {
    if (!filesAndFolders) {
        sendalert('No data to export');
        console.error('No data to export');
    }
    const result = await window.electron.exportData(filesAndFolders);
    if (result) {
        datafile = result;
        sendalert(`Data exported successfully to ${datafile}`);
    } else {
        console.log('Probably closed window to export data or error exporting data');
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
        document.getElementById('export-data').disabled = true;
        document.getElementById('select-folder').disabled = true;
        document.getElementById('select-file').disabled = true;

        if (filesAndFolders.path) {
            filecount.innerHTML = 0;
            linecount.innerHTML = 0;
            wordcount.innerHTML = 0;
            charactercount.innerHTML = 0;
            processfilecount = 0;
            await updatestats(true, filesAndFolders, true);
        }
        else {
            const totalItems = filesAndFolders.length;
            const chunkSize = 1500;

            filecount.innerHTML = 0;
            linecount.innerHTML = 0;
            wordcount.innerHTML = 0;
            charactercount.innerHTML = 0;

            processfilecount = 0;
            if (totalItems > chunkSize) {
                for (let i = 0; i < totalItems; i += chunkSize) {
                    const chunk = filesAndFolders.slice(i, i + chunkSize);
                    console.log("chunk", chunk);
                    await updatestats(true, chunk, true); // Update stats for the current chunk
                }
            }
            else {
                await updatestats(true, filesAndFolders, true);
            }
            // re-enable radio buttons
        }
        document.querySelectorAll('input[name="option"]').forEach(button => {
            button.disabled = false;
        });
        document.getElementById('export-data').disabled = false;
        document.getElementById('select-folder').disabled = false;
        document.getElementById('select-file').disabled = false;
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
    if (filesAndFolders) {
        if (filesAndFolders.path) {
            localStorage.setItem('path', filesAndFolders.path);
        }
        else {
            localStorage.setItem('path', folderPath);
        }
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

        const item = droppedItems[0];

        if (item.kind == ! 'file' && item.kind !== 'directory') {
            sendalert('Please drop a file or folder');
            return;
        }
        else if (droppedItems.length > 1) {
            sendalert('Please drop only one file or folder');
            return;
        }
        else {
            const file = item.getAsFile();
            const filePath = await window.electron.showFilePath(file);
            const isFile = await window.electron.isFile(filePath, '');

            if (isFile) {
                await init(filePath);
            } else {
                folderPath = filePath;
                await init();

            }
        }
    });
});

document.addEventListener('keydown', async (event) => {
    if (event.key === 'Escape') {
        closeModal();
    } else if (event.ctrlKey && event.key === 'k') {
        if (document.getElementById('select-folder').disabled) {
            return;
        }
        folderPath = await window.electron.selectFolder();
        if (!folderPath) {
            return;
        }
        await init();
    } else if (event.ctrlKey && event.key === 'o') {
        if (document.getElementById('select-file').disabled) {
            return;
        }
        const filepath = await window.electron.selectFile();
        if (!filepath) {
            return;
        }
        await init(filepath);
    } else if (event.ctrlKey && event.key === 'e') {
        if (document.getElementById('export-data').disabled) {
            return;
        }
        else if (!filesAndFolders) {
            sendalert('No data to export');
        }
        const result = await window.electron.exportData(filesAndFolders);
        if (result) {
            datafile = result;
            sendalert(`Data exported successfully to ${datafile}`);
        } else {
            console.log('Probably closed window to export data or error exporting data');
        }
    } else if (event.ctrlKey && event.key === 'r') {
        if (filesAndFolders.path) {
            localStorage.setItem('path', filesAndFolders.path);
        } else {
            localStorage.setItem('path', folderPath);
        }
        location.reload();
    }
});

document.getElementById('exit').addEventListener('click', () => {
    window.electron.windowExit();
});

document.getElementById('maximize').addEventListener('click', async () => {
    window.electron.windowMinimize();
});

document.getElementById('export-data').disabled = true;
(async () => {
    if (localStorage.getItem('path')) {
        const file = localStorage.getItem('path');
        localStorage.clear();
        const isfile = await window.electron.isFile(file, '');
        console.log(isfile);
        if (isfile) {
            await init(file);
        } else {
            folderPath = file;
            await init();
        }
    }
})();

// TODO:
// BUG: cant click any buttons on header when not in full screen
// make select all and unselect all buttons
// add more data analytics to the chart
// rather than calling update stats every time i need to update the pie chart make a function that updates the pie chart and call that function in the option buttons and update stats func
// add windows support --- check icon works   • default Electron icon is used  reason=application icon is not set
// check for spelling mistakes