import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadAttachment, type AttachmentKindInfo, type UploadKind } from '../../../lib/api/attachmentsApi';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import { isRetryable, normalizeType, RETRY_DELAYS_MS, sizeProblem, typeProblem } from '../lib/photoUpload';
import { shrinkPhoto } from '../lib/shrinkPhoto';

export type QueueStatus = 'waiting' | 'uploading' | 'done' | 'failed';

export interface QueuedPhoto {
  id: string;
  /** What it uploads as: PHOTO shows in the photo strip, documents in the Documents card. */
  kind: UploadKind;
  name: string;
  status: QueueStatus;
  /** 0 to 100 while uploading. */
  progress: number;
  error?: string;
}

interface Job {
  id: string;
  file: File;
  kind: AttachmentKindInfo;
  maxFileMb: number;
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

let nextId = 1;

/**
 * Spec 0017, AC-22, AC-23 and AC-27: one in memory upload queue per ticket, for photos and
 * documents alike. Files go up one at a time, photos shrunk first; a network error or a 5xx retries twice (after 2 s, then 6 s), a 4xx stops
 * with the server's message. Leaving the page drops what hasn't finished.
 */
export function usePhotoUploadQueue(ticketId: string, onUploaded: () => Promise<unknown>) {
  const [items, setItems] = useState<QueuedPhoto[]>([]);
  const jobs = useRef(new Map<string, Job>());
  /** Failed jobs keep their file, so Retry can send it again. */
  const failed = useRef(new Map<string, Job>());
  const running = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const onUploadedRef = useRef(onUploaded);

  useEffect(() => {
    onUploadedRef.current = onUploaded;
  }, [onUploaded]);

  const patch = useCallback((id: string, change: Partial<QueuedPhoto>) => {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...change } : item)));
  }, []);

  /** Shrink, check, then upload with the automatic retries. Resolves to an error message or null. */
  const send = useCallback(
    async (job: Job, signal: AbortSignal): Promise<string | null> => {
      const typeError = typeProblem(job.file, job.kind);
      if (typeError) return typeError;
      // Only photos shrink; a PDF goes up as chosen (the server rebuilds it, AC-7)
      const file = normalizeType(job.file.type) === 'application/pdf' ? job.file : await shrinkPhoto(job.file);
      const sizeError = sizeProblem(file, job.maxFileMb);
      if (sizeError) return sizeError;

      for (let attempt = 0; ; attempt++) {
        try {
          patch(job.id, { status: 'uploading', progress: 0 });
          // A 200 duplicate counts as done (AC-8)
          await uploadAttachment(ticketId, file, {
            kind: job.kind.kind,
            signal,
            onProgress: (progress) => patch(job.id, { progress }),
          });
          return null;
        } catch (err) {
          if (signal.aborted) throw err;
          const status = getApiErrorStatus(err);
          if (!isRetryable(status) || attempt >= RETRY_DELAYS_MS.length) {
            return getApiErrorMessage(err, `Couldn’t upload ${job.file.name}. Check your connection and try again.`);
          }
          patch(job.id, { status: 'waiting', progress: 0 });
          await sleep(RETRY_DELAYS_MS[attempt], signal);
        }
      }
    },
    [ticketId, patch],
  );

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    const abort = new AbortController();
    controller.current = abort;
    try {
      for (;;) {
        const job = [...jobs.current.values()][0];
        if (!job || abort.signal.aborted) break;
        const error = await send(job, abort.signal);
        jobs.current.delete(job.id);
        if (error) {
          failed.current.set(job.id, job);
          patch(job.id, { status: 'failed', error });
        } else {
          patch(job.id, { status: 'done', progress: 100 });
          // Fresh list, then the real thumbnail replaces the tile
          await onUploadedRef.current();
          setItems((list) => list.filter((item) => item.id !== job.id));
        }
      }
    } catch {
      // Aborted: the page is gone, nothing to update
    } finally {
      running.current = false;
    }
  }, [send, patch]);

  // Leaving the page drops unfinished uploads (AC-23)
  useEffect(
    () => () => {
      controller.current?.abort();
      jobs.current.clear();
      failed.current.clear();
    },
    [],
  );

  const add = useCallback(
    (files: File[], kind: AttachmentKindInfo, maxFileMb: number) => {
      const added = files.map((file) => {
        const job: Job = { id: `upload-${nextId++}`, file, kind, maxFileMb };
        jobs.current.set(job.id, job);
        return { id: job.id, kind: kind.kind, name: file.name, status: 'waiting' as const, progress: 0 };
      });
      setItems((list) => [...list, ...added]);
      void run();
    },
    [run],
  );

  /** Send a failed file again, from the back of the queue. */
  const retry = useCallback(
    (id: string) => {
      const job = failed.current.get(id);
      if (!job) return;
      failed.current.delete(id);
      jobs.current.set(id, job);
      patch(id, { status: 'waiting', progress: 0, error: undefined });
      void run();
    },
    [patch, run],
  );

  /** Drop a failed tile and its file. */
  const remove = useCallback((id: string) => {
    failed.current.delete(id);
    setItems((list) => list.filter((item) => item.id !== id));
  }, []);

  return { items, add, retry, remove };
}
