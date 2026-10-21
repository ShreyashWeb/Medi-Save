#!/usr/bin/env python3
"""
Extract tables from raw PDF documents using pdfplumber into data/staging/<pdf-name>.csv.

Rules:
- If a PDF has no text layer, report and stop for that file.
- Add source_page, source_file, and needs_review columns.
- Do not rename, translate, merge, or fix names or prices.
- Remove only repeated header rows and blank rows.
- Flag broken-looking rows with needs_review=true. Do not repair them.
"""

import sys
import os
import csv
import pdfplumber

# Ensure UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')


def is_blank_row(row):
    """Check if all elements in row are None or empty/whitespace."""
    if not row:
        return True
    return not any(cell is not None and str(cell).strip() for cell in row)


def is_broken_row(cells, expected_len):
    """
    Check if a row looks broken (fragmented, wrapped line, missing most columns).
    Do NOT repair. Just flag.
    """
    non_empty = sum(1 for c in cells if c and str(c).strip())
    # If fewer than 2 columns are populated when expecting 4+, or less than 20% populated
    if non_empty <= 1 and expected_len >= 3:
        return True
    if non_empty < (expected_len / 3):
        return True
    return False


def extract_pdf_file(pdf_path, output_csv_path):
    """Extract tables from a single PDF into staging CSV."""
    fname = os.path.basename(pdf_path)
    print(f"\n==================================================")
    print(f"PROCESSING: {fname}")
    print(f"==================================================")

    with pdfplumber.open(pdf_path) as pdf:
        # Check text layer
        has_text_layer = False
        for p in pdf.pages:
            t = p.extract_text()
            if t and t.strip():
                has_text_layer = True
                break

        if not has_text_layer:
            print(f"ERROR: '{fname}' has NO text layer! Skipping and stopping for this file.")
            return None

        # Pass 1: detect main header row
        header = None
        for page in pdf.pages:
            tables = page.extract_tables()
            if not tables:
                continue
            for t in tables:
                for r in t:
                    if is_blank_row(r):
                        continue
                    non_empty = [str(c).strip() if c is not None else "" for c in r]
                    if sum(1 for c in non_empty if c) >= 2:
                        header = non_empty
                        break
                if header:
                    break
            if header:
                break

        if not header:
            print(f"No tabular header detected in {fname}.")
            header = ["col_0"]

        # Ensure header labels are non-empty
        clean_header = []
        for idx, col_name in enumerate(header):
            name = col_name.replace('\n', ' ').strip()
            if not name:
                name = f"col_{idx+1}"
            clean_header.append(name)

        num_cols = len(clean_header)
        out_header = clean_header + ["source_page", "source_file", "needs_review"]

        extracted_rows = []
        rows_per_page = {}
        flagged_count = 0

        # Pass 2: extract rows
        for pno, page in enumerate(pdf.pages, 1):
            p_count = 0
            tables = page.extract_tables()
            if tables:
                for table in tables:
                    for raw_row in table:
                        if is_blank_row(raw_row):
                            continue
                        cells = [str(c).replace('\r', '').strip() if c is not None else "" for c in raw_row]

                        # Check if repeated header row
                        if cells == [str(c).replace('\r', '').strip() if c is not None else "" for c in header]:
                            continue
                        if cells == clean_header:
                            continue

                        # Check if broken-looking
                        broken = is_broken_row(cells, num_cols)
                        if broken:
                            flagged_count += 1
                        needs_rev = "true" if broken else "false"

                        # Align columns to num_cols without altering data
                        if len(cells) < num_cols:
                            cells = cells + [""] * (num_cols - len(cells))
                        elif len(cells) > num_cols:
                            cells = cells[:num_cols]

                        row_entry = cells + [str(pno), fname, needs_rev]
                        extracted_rows.append(row_entry)
                        p_count += 1

            rows_per_page[pno] = p_count

        # Write to staging CSV
        os.makedirs(os.path.dirname(os.path.abspath(output_csv_path)), exist_ok=True)
        with open(output_csv_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(out_header)
            writer.writerows(extracted_rows)

        # Print summary for this PDF
        print(f"Total Pages:         {len(pdf.pages)}")
        print(f"Rows extracted:      {len(extracted_rows)}")
        print(f"Rows flagged review: {flagged_count}")
        print("Rows per page:")
        page_summary = ", ".join([f"P{p}:{c}" for p, c in rows_per_page.items() if c > 0])
        print(f"  {page_summary if page_summary else 'No rows extracted'}")

        return {
            'file': fname,
            'pages': len(pdf.pages),
            'total_rows': len(extracted_rows),
            'flagged_rows': flagged_count,
            'rows_per_page': rows_per_page,
            'sample_rows': extracted_rows[:15]
        }


def extract_all(raw_dir=None, staging_dir=None):
    """Process all raw PDFs into data/staging/."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if raw_dir is None:
        raw_dir = os.path.join(base_dir, "data", "raw")
    if staging_dir is None:
        staging_dir = os.path.join(base_dir, "data", "staging")

    pdf_files = sorted([f for f in os.listdir(raw_dir) if f.endswith(".pdf")])
    print(f"Found {len(pdf_files)} PDF files in {raw_dir}")

    all_results = []
    all_sample_rows = []

    for fname in pdf_files:
        pdf_path = os.path.join(raw_dir, fname)
        base_name = os.path.splitext(fname)[0]
        csv_path = os.path.join(staging_dir, f"{base_name}.csv")
        res = extract_pdf_file(pdf_path, csv_path)
        if res:
            all_results.append(res)
            for r in res['sample_rows'][:2]:  # collect samples
                all_sample_rows.append(r)

    print("\n==================================================")
    print("STAGE 4 EXTRACTION COMPLETED")
    print("==================================================")
    print(f"Total PDFs processed: {len(all_results)} / {len(pdf_files)}")
    print("15 Sample Extracted Rows Across PDFs:")
    print("--------------------------------------------------")
    for idx, sample in enumerate(all_sample_rows[:15], 1):
        # Truncate row representation for clean display
        disp = " | ".join([str(c)[:30].replace('\n', ' ') for c in sample])
        print(f"{idx:2d}. {disp}")


if __name__ == "__main__":
    raw_d = sys.argv[1] if len(sys.argv) > 1 else None
    staging_d = sys.argv[2] if len(sys.argv) > 2 else None
    extract_all(raw_d, staging_d)
