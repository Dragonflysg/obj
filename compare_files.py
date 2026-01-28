import difflib
import sys
from pathlib import Path

#Basic usage (text diff in terminal):
#python compare_files.py original.aspx updated.aspx

#With HTML visual comparison:
#python compare_files.py original.aspx updated.aspx --html



def compare_files(file1_path: str, file2_path: str) -> None:
    """Compare two files and show differences with line numbers."""

    # Read both files
    try:
        with open(file1_path, 'r', encoding='utf-8') as f:
            file1_lines = f.readlines()
    except UnicodeDecodeError:
        with open(file1_path, 'r', encoding='latin-1') as f:
            file1_lines = f.readlines()

    try:
        with open(file2_path, 'r', encoding='utf-8') as f:
            file2_lines = f.readlines()
    except UnicodeDecodeError:
        with open(file2_path, 'r', encoding='latin-1') as f:
            file2_lines = f.readlines()

    # Generate unified diff
    diff = difflib.unified_diff(
        file1_lines,
        file2_lines,
        fromfile=f'OLD: {Path(file1_path).name}',
        tofile=f'NEW: {Path(file2_path).name}',
        lineterm=''
    )

    print("=" * 70)
    print("FILE COMPARISON RESULTS")
    print("=" * 70)
    print(f"Original file: {file1_path}")
    print(f"Updated file:  {file2_path}")
    print("=" * 70)
    print("\nLegend:")
    print("  - (red)   = Line removed from original")
    print("  + (green) = Line added in updated file")
    print("  @@ ... @@ = Location info (old line, new line)")
    print("-" * 70)

    diff_output = list(diff)

    if not diff_output:
        print("\nNo differences found! Files are identical.")
    else:
        print("\nDIFFERENCES:\n")
        for line in diff_output:
            # Remove trailing newline for cleaner output
            line = line.rstrip('\n')
            print(line)

    print("\n" + "=" * 70)


def compare_files_side_by_side(file1_path: str, file2_path: str) -> None:
    """Generate an HTML side-by-side comparison."""

    try:
        with open(file1_path, 'r', encoding='utf-8') as f:
            file1_lines = f.readlines()
    except UnicodeDecodeError:
        with open(file1_path, 'r', encoding='latin-1') as f:
            file1_lines = f.readlines()

    try:
        with open(file2_path, 'r', encoding='utf-8') as f:
            file2_lines = f.readlines()
    except UnicodeDecodeError:
        with open(file2_path, 'r', encoding='latin-1') as f:
            file2_lines = f.readlines()

    # Create HTML diff
    differ = difflib.HtmlDiff()
    html_diff = differ.make_file(
        file1_lines,
        file2_lines,
        fromdesc=f'Original: {Path(file1_path).name}',
        todesc=f'Updated: {Path(file2_path).name}',
        context=True,
        numlines=3
    )

    output_path = Path(file1_path).parent / 'comparison_result.html'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_diff)

    print(f"\nHTML comparison saved to: {output_path}")
    print("Open this file in a browser for a side-by-side visual comparison.")


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python compare_files.py <original_file> <updated_file> [--html]")
        print("\nExample:")
        print("  python compare_files.py old_page.aspx new_page.aspx")
        print("  python compare_files.py old_page.aspx new_page.aspx --html")
        sys.exit(1)

    file1 = sys.argv[1]
    file2 = sys.argv[2]

    # Check if files exist
    if not Path(file1).exists():
        print(f"Error: File not found: {file1}")
        sys.exit(1)
    if not Path(file2).exists():
        print(f"Error: File not found: {file2}")
        sys.exit(1)

    # Show text diff
    compare_files(file1, file2)

    # Optionally generate HTML diff
    if '--html' in sys.argv:
        compare_files_side_by_side(file1, file2)
