use clap::Parser;
use rayon::prelude::*;
use regex::Regex;
use owo_colors::OwoColorize;
use std::fs::{self, File};
use std::io::{self, BufRead, Write};
use std::path::{Path, PathBuf};

/// CLI Line Counter in Rust (like `tree`)
#[derive(Parser)]
#[command(
    version,
    about = "Counts lines, words, and characters in files & directories"
)]
struct Args {
    /// File or directory to analyze
    path: String,

    /// Exclude files, directories, or both with a regex pattern
    #[arg(short = 'x', long, value_name = "REGEX", help_heading = "Exclusion Options")]
    exclude: Option<String>,

    /// Exclude files only
    #[arg(short = 'f', long, conflicts_with = "exclude", help_heading = "Exclusion Options")]
    exclude_files: Option<String>,

    /// Exclude directories only
    #[arg(short = 'd', long, conflicts_with = "exclude", help_heading = "Exclusion Options")]
    exclude_directories: Option<String>,

    /// Verbose mode: show line counts for each file
    #[arg(short, long, help = "Show line counts for each file")]
    verbose: bool,

    /// Output results to a file
    #[arg(short, long, value_name = "FILE", help = "Export results to a file")]
    output: Option<String>,
}

fn main() {
    let args = Args::parse();
    let path = Path::new(&args.path);

    let exclude_files = args.exclude_files.as_deref().or(args.exclude.as_deref());
    let exclude_directories = args.exclude_directories.as_deref().or(args.exclude.as_deref());

    let exclude_files_regex = exclude_files.and_then(|p| Regex::new(p).ok());
    let exclude_directories_regex = exclude_directories.and_then(|p| Regex::new(p).ok());

    let mut output = String::new();
    let mut total_lines = 0;
    let mut total_words = 0;
    let mut total_chars = 0;

    if path.is_file() {
        let (lines, words, chars, result) = count_lines_in_file(path, path);
        total_lines += lines;
        total_words += words;
        total_chars += chars;
        if args.verbose {
            println!("{}", result);
        }
        output.push_str(&result);
    } else if path.is_dir() {
        let (lines, words, chars, results) = count_lines_in_directory(
            path,
            path,
            &exclude_files_regex,
            &exclude_directories_regex,
            args.verbose,
        );
        total_lines += lines;
        total_words += words;
        total_chars += chars;
        output.push_str(&results);
    } else {
        eprintln!("{}: '{}' is not a valid file or directory", "Error".red().bold(), args.path);
        std::process::exit(1);
    }

    output.push_str(&format!(
        "{}: {} lines, {} words, {} characters\n",
        "TOTAL".bold().green(),
        total_lines.to_string().bold().yellow(),
        total_words.to_string().bold().blue(),
        total_chars.to_string().bold().magenta()
    ));
    println!("{}", output);

    if let Some(output_file) = &args.output {
        if Path::new(output_file).exists() {
            println!(
                "{}: The file '{}' already exists and will be {}!",
                "WARNING".yellow().bold(),
                output_file,
                "overwritten".red().bold()
            );
            println!("Press {} to continue or {} to cancel.", "[Enter]".cyan(), "[Ctrl+C]".red());

            let mut confirmation = String::new();
            io::stdin().read_line(&mut confirmation).expect("Failed to read input");
        }

        if let Err(err) = File::create(output_file).and_then(|mut file| file.write_all(output.as_bytes())) {
            eprintln!("{}: {}", "Error writing to file".red().bold(), err);
        }
    }
}


fn count_lines_in_file(path: &Path, base_path: &Path) -> (usize, usize, usize, String) {
    let file = match fs::File::open(path) {
        Ok(file) => file,
        Err(_) => {
            let err_msg = format!(
                "{}: {}",
                path.display().to_string().red(),
                "[ERROR: Failed to open file]".red().bold()
            );
            return (0, 0, 0, err_msg);
        }
    };

    let reader = io::BufReader::new(file);
    let mut lines = 0;
    let mut words = 0;
    let mut characters = 0;

    for line in reader.lines() {
        if let Ok(line) = line {
            lines += 1;
            words += line.split_whitespace().count();
            characters += line.chars().count();
        }
    }

    let rel_path = path.strip_prefix(base_path).unwrap_or(path);
    let output = format!(
        "{}: {} lines, {} words, {} characters\n",
        rel_path.display().to_string().cyan(),
        lines.to_string().yellow(),
        words.to_string().blue(),
        characters.to_string().magenta()
    );
    (lines, words, characters, output)
}

fn count_lines_in_directory(
    path: &Path,
    base_path: &Path,
    exclude_files: &Option<Regex>,
    exclude_directories: &Option<Regex>,
    verbose: bool,
) -> (usize, usize, usize, String) {
    let entries: Vec<PathBuf> = match fs::read_dir(path) {
        Ok(read_dir) => read_dir.filter_map(|entry| entry.ok().map(|e| e.path())).collect(),
        Err(_) => {
            eprintln!("{}: Failed to read directory '{}'", "Error".red().bold(), path.display());
            return (0, 0, 0, String::new());
        }
    };

    let (file_results, dir_results): (Vec<_>, Vec<_>) =
        entries.into_par_iter().partition(|entry| entry.is_file());

    let file_sums: Vec<(usize, usize, usize, String)> = file_results
        .into_par_iter()
        .filter(|file| {
            if let Some(regex) = exclude_files {
                !regex.is_match(file.file_name().unwrap_or_default().to_str().unwrap_or(""))
            } else {
                true
            }
        })
        .map(|file| {
            let (l, w, c, result) = count_lines_in_file(&file, base_path);
            if verbose {
                println!("{}", result.trim_end());
            }
            (l, w, c, result)
        })
        .collect();

    let dir_sums: Vec<(usize, usize, usize)> = dir_results
        .into_par_iter()
        .filter(|dir| {
            if let Some(regex) = exclude_directories {
                !regex.is_match(dir.file_name().unwrap_or_default().to_str().unwrap_or(""))
            } else {
                true
            }
        })
        .map(|dir| {
            let (l, w, c, _) =
                count_lines_in_directory(&dir, base_path, exclude_files, exclude_directories, verbose);
            (l, w, c)
        })
        .collect();

    let total_lines: usize = file_sums.iter().map(|(l, _, _, _)| *l).sum::<usize>()
        + dir_sums.iter().map(|(l, _, _)| *l).sum::<usize>();

    let total_words: usize = file_sums.iter().map(|(_, w, _, _)| *w).sum::<usize>()
        + dir_sums.iter().map(|(_, w, _)| *w).sum::<usize>();

    let total_chars: usize = file_sums.iter().map(|(_, _, c, _)| *c).sum::<usize>()
        + dir_sums.iter().map(|(_, _, c)| *c).sum::<usize>();

    let output = if verbose {
        file_sums
            .iter()
            .map(|(_, _, _, res)| res.clone())
            .collect::<Vec<_>>()
            .join("")
    } else {
        String::new()
    };

    (total_lines, total_words, total_chars, output)
}
