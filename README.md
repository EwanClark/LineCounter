# Line Counter

Line Counter is an Electron-based application that allows users to select files or folders and count the number of lines, words, and characters in the selected files. It provides a user-friendly interface to display the file structure and statistics.

## Features

- Select a file or folder to analyze
- Display the number of lines, words, and characters for each file
- Export the analysis data to a JSON file
- Search functionality to filter files and folders
- Interactive UI with custom alerts

## ShortCuts

- Ctrl + O - Select a file
- Ctrl + K - Select a Folder
- Ctrl + E - Export Data
- Ctrl + R - Reload Data

## Building & Running

1. Clone the repository:
    ```sh
    git clone https://github.com/EwanClark/LineCounter
    cd linecounter
    ```

2. Install the dependencies:
    ```sh
    npm install
    ```

3. Start the application:
    ```sh
    npm start
    ```

## Known Bugs
- After the initial launch on large folders, if a checkbox is unticked and the pie chart type is changed while the application is still updating, the counters may display incorrect values. To resolve this, press the "Reload" button at the top to reset and recount from zero.
