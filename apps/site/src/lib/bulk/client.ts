/**
 * The page's handle on the bulk worker: one request in flight at a time, progress callbacks,
 * and a cancel that actually stops the work.
 *
 * Cancelling terminates the worker outright, which is the only thing that interrupts a
 * synchronous encode loop. That is safe here because the worker is stateless: a finished
 * generation run lives on the page, and a render request carries what it needs back down.
 * The next call spawns a fresh worker.
 *
 * The `new URL('./worker.ts', import.meta.url)` form is what lets Vite emit the worker as its
 * own chunk, so none of this code is in the bundle a visitor downloads for a single QR code.
 */
import type {
	BulkItem,
	BulkRequest,
	BulkResponse,
	BulkRow,
	EncodeOptions,
	RenderOptions
} from './protocol';

/** Thrown into the caller's promise when `cancel()` interrupts a run. */
export class Cancelled extends Error {
	constructor() {
		super('Cancelled');
		this.name = 'Cancelled';
	}
}

export type ProgressFn = (done: number, total: number) => void;

interface Pending {
	resolve: (response: BulkResponse) => void;
	reject: (error: Error) => void;
	onProgress?: ProgressFn;
}

export class BulkWorker {
	#worker: Worker | null = null;
	#pending: Pending | null = null;

	#spawn(): Worker {
		if (this.#worker) return this.#worker;
		const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
		worker.onmessage = (event: MessageEvent<BulkResponse>) => {
			const message = event.data;
			if (message.kind === 'progress') {
				this.#pending?.onProgress?.(message.done, message.total);
				return;
			}
			const pending = this.#pending;
			this.#pending = null;
			if (!pending) return;
			if (message.kind === 'failed') pending.reject(new Error(message.message));
			else pending.resolve(message);
		};
		worker.onerror = (event: ErrorEvent) => {
			this.#fail(new Error(event.message || 'The bulk generator stopped unexpectedly.'));
		};
		this.#worker = worker;
		return worker;
	}

	#fail(error: Error): void {
		const pending = this.#pending;
		this.#pending = null;
		pending?.reject(error);
	}

	#send(request: BulkRequest, onProgress?: ProgressFn): Promise<BulkResponse> {
		if (this.#pending) return Promise.reject(new Error('The bulk generator is already busy.'));
		const worker = this.#spawn();
		return new Promise<BulkResponse>((resolve, reject) => {
			this.#pending = { resolve, reject, onProgress };
			worker.postMessage(request);
		});
	}

	/** Encode and verify every row. Resolves with the items and the packed matrix buffer. */
	async generate(
		rows: BulkRow[],
		opts: EncodeOptions,
		onProgress?: ProgressFn
	): Promise<{ items: BulkItem[]; bits: Uint8Array }> {
		const response = await this.#send({ kind: 'generate', rows, opts }, onProgress);
		if (response.kind !== 'generated') throw new Error('The bulk generator returned the wrong reply.');
		return { items: response.items, bits: response.bits };
	}

	/**
	 * Build the ZIP. `bits` is cloned rather than transferred, because the page still needs it
	 * for the label-sheet PDF after the download.
	 */
	async zip(
		items: BulkItem[],
		bits: Uint8Array,
		opts: RenderOptions,
		onProgress?: ProgressFn
	): Promise<Uint8Array> {
		const response = await this.#send({ kind: 'render', items, bits, opts }, onProgress);
		if (response.kind !== 'zip') throw new Error('The bulk generator returned the wrong reply.');
		return response.bytes;
	}

	/** Stop whatever is running. The pending promise rejects with `Cancelled`. */
	cancel(): void {
		this.#worker?.terminate();
		this.#worker = null;
		this.#fail(new Cancelled());
	}

	/** Tear down on unmount. */
	dispose(): void {
		this.#worker?.terminate();
		this.#worker = null;
		this.#pending = null;
	}
}
