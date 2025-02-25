# Line Counter

Line Counter is an Electron-based application that allows users to select files or folders and count the number of lines, words, and characters in the selected files. It provides a user-friendly interface to display the file structure and statistics.

## CLI Version

A command-line version of Line Counter is available in the [`rust/src/main.rs`](rust/src/main.rs) file. This CLI tool counts lines, words, and characters in files and directories and supports options for exclusions, verbose output, and exporting results.

### Features

- Count lines, words, and characters for a specified file or directory
- Exclude files and/or directories using regex patterns via:
    - `--exclude <REGEX>` or `-x <REGEX>`: Exclude files and directories matching the pattern
    - `--exclude-files <REGEX>` or `-f <REGEX>`: Exclude files only
    - `--exclude-directories <REGEX>` or `-d <REGEX>`: Exclude directories only
- Verbose mode to display per-file statistics (`--verbose` or `-v`)
- Export results to a file (`--output <FILE>` or `-o <FILE>`)

### Usage

1. Download the repository:
        ```sh
        git clone https://github.com/EwanClark/LineCounter.git
        ```

2. Change directory to the Rust project folder:
        ```sh
        cd LineCounter/rust
        ```

3. Build the project in release mode:
        ```sh
        cargo build --release
        ```

4. Move the built executable to `/usr/local/bin`:
        ```sh
        mv ./target/release/linecounter /usr/local/bin
        ```

Alternatively, you can download the pre-built CLI release from:
[LineCounter CLI Release 1.0.0](https://github.com/EwanClark/LineCounter/releases/tag/1.0.0-cli)

After downloading, proceed with step 4.

### Arguments

- `<path>` (required): The file or directory to analyze.
- `--exclude <REGEX>` or `-x <REGEX>`: Exclude files and directories matching the pattern.
- `--exclude-files <REGEX>` or `-f <REGEX>`: Exclude files matching the pattern.
- `--exclude-directories <REGEX>` or `-d <REGEX>`: Exclude directories matching the pattern.
- `--verbose` or `-v`: Enable verbose mode (display line counts for each file).
- `--output <FILE>` or `-o <FILE>`: Export the results to the specified file.

## GUI Version

Line Counter also offers a graphical user interface (GUI) built with Electron.

### Features

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

### Shortcuts

- `Ctrl + O` - Select a file
- `Ctrl + K` - Select a folder
- `Ctrl + E` - Export data
- `Ctrl + R` - Reload data

### Usage

1. Download the repository:
        ```sh
        git clone https://github.com/EwanClark/LineCounter.git
        ```

2. Change directory to the Electron project folder:
        ```sh
        cd LineCounter/electron
        ```

3. Install the dependencies:
        ```sh
        npm install
        ```

4. Build the application:
        ```sh
        npm run build
        ```

5. Change directory to the builds:
        ```sh
        cd dist
        ```

6. Run/Install the app:

**AppImage**
```sh
1. Download the AppImage file
2. Make it executable: chmod +x 'LineCounter.1.0.0.AppImage'
3. Run the AppImage
```

**Debian/Ubuntu**
```sh
sudo dpkg -i LineCounter.1.0.0.deb
```

**Snap**
```sh
sudo snap install LineCounter.1.0.0.snap
```

**Arch Linux**
```sh
sudo pacman -U LineCounter.1.0.0.pacman
```

Alternatively, you can download the pre-built GUI release from:  
[LineCounter GUI Release 1.0.0](https://github.com/EwanClark/LineCounter/releases/tag/1.0.0-gui)

After downloading, run the executable.