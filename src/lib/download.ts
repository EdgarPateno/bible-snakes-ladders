/**
 * Offer a file to save. Inside a claude.ai Artifact the page cannot start downloads itself, so it asks the
 * viewer through the `downloads` capability. Anywhere else (Netlify, Vercel, GitHub Pages, `npm run dev`)
 * it falls back to a normal browser download.
 */
type SaveStatus = 'saved' | 'declined' | 'failed';

interface DownloadsApi {
  save(req: { filename: string; data: string | Blob }): Promise<{ status: string }>;
}
interface ClaudeRuntime {
  use(name: 'downloads'): Promise<DownloadsApi | null>;
}

function runtime(): ClaudeRuntime | undefined {
  return (window as unknown as { claude?: ClaudeRuntime }).claude;
}

function browserDownload(filename: string, data: string, mime: string): SaveStatus {
  try {
    const url = URL.createObjectURL(new Blob([data], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'saved';
  } catch {
    return 'failed';
  }
}

export async function saveTextFile(filename: string, data: string, mime: string): Promise<SaveStatus> {
  const claude = runtime();
  if (claude?.use) {
    try {
      const downloads = await claude.use('downloads');
      if (downloads) {
        await downloads.save({ filename, data });
        return 'saved';
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      return code === 'declined' ? 'declined' : 'failed';
    }
    return 'failed';
  }
  return browserDownload(filename, data, mime);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
