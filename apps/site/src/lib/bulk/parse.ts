/**
 * Reading a list of payloads out of a paste or a CSV file. Browser only, nothing uploaded:
 * papaparse reads the `File` straight off disk through the FileReader the input handed us.
 */
import Papa, { type ParseResult } from 'papaparse';
import { isLikelyUrl } from '@stoneqr/engine/payloads';
import type { BulkRow } from './protocol';

export interface ParsedInput {
	rows: BulkRow[];
	/** Rows found before the cap was applied. */
	total: number;
	/** How many rows the cap dropped. */
	dropped: number;
}

function capped(rows: BulkRow[], max: number): ParsedInput {
	return { rows: rows.slice(0, max), total: rows.length, dropped: Math.max(0, rows.length - max) };
}

/**
 * One payload per line, with an optional second column.
 *
 * The separator is decided once for the whole block rather than per line, so a single URL that
 * happens to contain a comma cannot silently lose its query string: tabs win if any line has
 * one, otherwise commas are used only when most lines have one, otherwise the whole line is
 * the payload.
 */
export function parsePasted(input: string, max: number): ParsedInput {
	const lines = input.split(/\r\n|\r|\n/).filter((l) => l.trim() !== '');
	if (lines.length === 0) return { rows: [], total: 0, dropped: 0 };

	const withTab = lines.filter((l) => l.includes('\t')).length;
	const withComma = lines.filter((l) => l.includes(',')).length;
	const sep = withTab > 0 ? '\t' : withComma > lines.length / 2 ? ',' : '';

	const rows: BulkRow[] = [];
	for (const line of lines) {
		let payload = line.trim();
		let label = '';
		if (sep) {
			const at = line.indexOf(sep);
			if (at >= 0) {
				payload = line.slice(0, at).trim();
				label = line.slice(at + 1).trim();
			}
		}
		if (payload !== '') rows.push({ payload, label });
	}
	return capped(rows, max);
}

export interface CsvTable {
	name: string;
	/** Every row as read, including the header row if there is one. */
	rows: string[][];
	/** Widest row, so the column pickers can offer every column present. */
	columns: number;
	/** Our guess, which the user can override with the checkbox. */
	looksLikeHeader: boolean;
}

/** Column names that read like a heading rather than data. */
const HEADERISH =
	/^(url|urls|link|links|website|web|address|payload|payloads|content|data|value|code|qr|name|label|labels|title|text|description|id|sku|slug|ref|reference|email|customer|product|item|asset|room|table|guest)\b/i;

function guessHeader(rows: string[][]): boolean {
	const first = rows[0];
	if (!first || rows.length < 2) return false;
	if (first.some((c) => c === '' || c.length > 60)) return false;
	if (first.some((c) => isLikelyUrl(c))) return false;
	return first.some((c) => HEADERISH.test(c));
}

/** Parse a CSV or TSV file in the browser. Rejects when papaparse cannot read the file at all. */
export function parseCsvFile(file: File): Promise<CsvTable> {
	return new Promise((resolve, reject) => {
		Papa.parse<string[], File>(file, {
			skipEmptyLines: 'greedy',
			complete: (result: ParseResult<string[]>) => {
				const rows = result.data
					.map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '').trim()) : []))
					.filter((row) => row.some((cell) => cell !== ''));
				if (rows.length === 0) {
					reject(new Error('That file has no rows in it.'));
					return;
				}
				resolve({
					name: file.name,
					rows,
					columns: rows.reduce((n, row) => Math.max(n, row.length), 0),
					looksLikeHeader: guessHeader(rows)
				});
			},
			error: (err: Error) => reject(new Error(err.message || 'That file could not be read as CSV.'))
		});
	});
}

/** What to put in the two column selects: header names when there are any, otherwise indexes. */
export function columnChoices(table: CsvTable, hasHeader: boolean): { value: number; text: string }[] {
	const header = hasHeader ? table.rows[0] : undefined;
	return Array.from({ length: table.columns }, (_, i) => ({
		value: i,
		text: header?.[i] ? `${header[i]}` : `Column ${i + 1}`
	}));
}

/** Sensible starting columns: the one that looks like a link, and the one that looks like a name. */
export function guessColumns(table: CsvTable, hasHeader: boolean): { payload: number; label: number } {
	const header = hasHeader ? table.rows[0] : undefined;
	const body = table.rows.slice(hasHeader ? 1 : 0);
	let payload = -1;
	let label = -1;

	if (header) {
		for (let i = 0; i < table.columns; i++) {
			const name = (header[i] ?? '').toLowerCase();
			if (payload < 0 && /(url|link|website|address|payload|content|data|code)/.test(name)) payload = i;
			if (label < 0 && /(name|label|title|description|customer|product|item|guest|room)/.test(name))
				label = i;
		}
	}
	// Nothing named usefully: take the first column that mostly holds links, else column 1.
	if (payload < 0) {
		for (let i = 0; i < table.columns; i++) {
			const hits = body.filter((row) => isLikelyUrl(row[i] ?? '')).length;
			if (hits > body.length / 2) {
				payload = i;
				break;
			}
		}
	}
	if (payload < 0) payload = 0;
	if (label === payload) label = -1;
	if (label < 0 && table.columns > 1) label = payload === 0 ? 1 : 0;
	return { payload, label: table.columns > 1 ? label : -1 };
}

/** Pull the chosen columns out of the table. `labelCol` below zero means "no labels". */
export function rowsFromTable(
	table: CsvTable,
	hasHeader: boolean,
	payloadCol: number,
	labelCol: number,
	max: number
): ParsedInput {
	const body = table.rows.slice(hasHeader ? 1 : 0);
	const rows: BulkRow[] = [];
	for (const row of body) {
		const payload = (row[payloadCol] ?? '').trim();
		if (payload === '') continue;
		rows.push({ payload, label: labelCol >= 0 ? (row[labelCol] ?? '').trim() : '' });
	}
	return capped(rows, max);
}
