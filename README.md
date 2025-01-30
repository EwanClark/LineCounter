# Line Counter

Line Counter is an Electron-based application that allows users to select files or folders and count the number of lines, words, and characters in the selected files. It provides a user-friendly interface to display the file structure and statistics.

## Features

- Select files or folders via button click or drag-and-drop
- Display the number of lines, words, and characters for each file
- Search functionality to filter files and folders
- Interactive file/folder tree view with checkboxes
- Real-time statistics updates when selecting/deselecting files
- Progress bar for large folder processing
- Interactive pie chart visualization showing:
  - Lines per file extension
  - Files per extension
  - Words per extension
  - Characters per extension
- Toggleable chart legend
- Data export to JSON format
- Custom alerts system
- Dark mode interface
- Frameless window with minimize/close controls
- Session persistence (remembers last opened file/folder)

## Shortcuts

- Ctrl + O - Select a file
- Ctrl + K - Select a folder
- Ctrl + E - Export data
- Ctrl + R - Reload data
- Escape - Close alerts

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