import { useId, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Button } from '../ui/Button';
import { inputClass } from '../ui/Field';
import { copyText, saveTextFile } from '../../lib/download';
import { toast } from '../../store/toastStore';

/** yyyy-mm-dd, for file names. */
export function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Save a text file and tell the host what happened. */
export async function exportFile(filename: string, data: string, mime: string, what: string): Promise<void> {
  const status = await saveTextFile(filename, data, mime);
  if (status === 'saved') toast({ tone: 'success', title: `Exported ${what}`, body: filename });
  else if (status === 'declined') toast({ tone: 'info', title: 'Export cancelled', body: 'The file was not saved.' });
  else
    toast(
      { tone: 'error', title: 'Could not save the file', body: 'Use the Copy button instead, then paste the text into a file.' },
      5000,
    );
}

export interface CopyFallbackState {
  label: string;
  text: string;
}

/** Copy to the clipboard; when the browser refuses, hand back the text so it can be shown for manual copying. */
export function useCopy() {
  const [fallback, setFallback] = useState<CopyFallbackState | null>(null);
  const copy = async (text: string, label: string, what: string) => {
    const ok = await copyText(text);
    if (ok) {
      setFallback(null);
      toast({ tone: 'success', title: `Copied ${what}`, body: 'Paste it into a file or a message.' });
    } else {
      setFallback({ label, text });
      toast({ tone: 'info', title: 'Copy blocked by the browser', body: 'Select the text in the box below and copy it yourself.' });
    }
  };
  return { fallback, copy, clear: () => setFallback(null) };
}

export function CopyFallback({ state, onClose }: { state: CopyFallbackState | null; onClose: () => void }) {
  const id = useId();
  if (!state) return null;
  return (
    <div className="mt-4 flex flex-col gap-2">
      <label htmlFor={id} className="text-base font-semibold text-ink-soft">
        {state.label} — select all and copy (Ctrl+C or ⌘+C)
      </label>
      <textarea
        id={id}
        readOnly
        value={state.text}
        rows={8}
        onFocus={(e) => e.currentTarget.select()}
        className={`${inputClass} font-mono text-sm`}
      />
      <div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Hide text
        </Button>
      </div>
    </div>
  );
}

export type TextFormat = 'json' | 'csv';

/** Pick a parser: the file extension wins, otherwise the first non-space character. */
export function detectFormat(text: string, fileName: string | null): TextFormat {
  const ext = fileName?.toLowerCase().split('.').pop();
  if (ext === 'json') return 'json';
  if (ext === 'csv') return 'csv';
  const first = text.trimStart().charAt(0);
  return first === '{' || first === '[' ? 'json' : 'csv';
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.readAsText(file, 'utf-8');
  });
}

interface TextSourceProps {
  idPrefix: string;
  accept: string;
  text: string;
  fileName: string | null;
  onChange: (text: string, fileName: string | null) => void;
  pasteLabel: string;
  pastePlaceholder?: string;
  hint?: ReactNode;
}

/** A file picker and a paste box that feed the same text. */
export function TextSourceInput({ idPrefix, accept, text, fileName, onChange, pasteLabel, pastePlaceholder, hint }: TextSourceProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setReadError(`${file.name} is larger than 5 MB. Choose a smaller file.`);
      return;
    }
    try {
      const content = await readFile(file);
      setReadError(null);
      onChange(content, file.name);
    } catch {
      setReadError(`Could not read ${file.name}. Try again, or paste its text below.`);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-file`} className="text-base font-semibold text-ink-soft">
          Choose a file
        </label>
        <input
          ref={fileRef}
          id={`${idPrefix}-file`}
          type="file"
          accept={accept}
          onChange={onFile}
          className="block w-full max-w-full text-base file:mr-3 file:rounded-lg file:border file:border-walnut/50 file:bg-parchment-50 file:px-3 file:py-1.5 file:text-base file:font-semibold file:text-ink hover:file:bg-white"
        />
        {fileName && <span className="text-sm text-ink-soft">Loaded: {fileName}</span>}
        {readError && (
          <span role="alert" className="text-sm font-semibold text-oxblood">
            {readError}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${idPrefix}-paste`} className="text-base font-semibold text-ink-soft">
          {pasteLabel}
        </label>
        <textarea
          id={`${idPrefix}-paste`}
          value={text}
          rows={7}
          spellCheck={false}
          placeholder={pastePlaceholder}
          onChange={(e) => onChange(e.target.value, null)}
          className={`${inputClass} font-mono text-sm`}
        />
        {hint && <span className="text-sm text-ink-faint">{hint}</span>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="label-caps text-2xl text-oxblood">
      {children}
    </h2>
  );
}

/** A die face badge for 1–6. */
export function DieBadge({ n, className = '' }: { n: number; className?: string }) {
  const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-walnut/50 bg-parchment-50 text-4xl leading-none text-oxblood shadow-[0_2px_0_rgba(61,38,18,0.35)] ${className}`}
    >
      {faces[n - 1] ?? n}
    </span>
  );
}
