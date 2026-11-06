import { useRef, useState } from 'react';
import { ExternalLink, FilePlus, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { confirm } from '../../../components/shared/confirm/confirm';
import { DetailSection } from '../../../components/shared/DetailSection';
import { useToast } from '../../../context/toast';
import { removeAttachment, type Attachment } from '../../../lib/api/attachmentsApi';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import { useTicketFiles } from '../hooks/ticketFiles';
import { formatManilaDateTime } from '../lib/photoCaption';
import { documentRoomLeft } from '../lib/photoUpload';
import { UploadQueueRow } from './UploadQueueRow';

const DOCUMENT_KINDS = new Set(['RECEIPT', 'OTHER_DOCUMENT']);

/** A ticket can hold 100 documents; the newest this many show until someone asks for the rest. */
const RECENT_DOCUMENTS = 10;

function DocumentRow({ doc, kindLabel, onRemove }: { doc: Attachment; kindLabel: string; onRemove: () => void }) {
  return (
    <li className="flex min-w-0 items-start gap-2 py-2.5 first:pt-0 last:pb-0">
      <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs font-medium text-muted-foreground">{kindLabel}</span>
        <span className="text-sm wrap-break-word text-foreground">{doc.fileName}</span>
        {/* Spec 0024, AC-19: the uploader on one line, the date on the next */}
        <span className="text-xs text-muted-foreground">{doc.uploadedBy.name}</span>
        <time dateTime={doc.createdAt} className="text-xs text-muted-foreground">
          {formatManilaDateTime(doc.createdAt)}
        </time>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button asChild variant="ghost" size="icon" className="size-8 pointer-coarse:size-11">
          <a href={doc.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${doc.fileName} in a new tab`}>
            <ExternalLink aria-hidden="true" />
          </a>
        </Button>
        {doc.canRemove && (
          <Button type="button" variant="ghost" size="icon" className="size-8 pointer-coarse:size-11" aria-label={`Remove ${doc.fileName}`} onClick={onRemove}>
            <X aria-hidden="true" />
          </Button>
        )}
      </div>
    </li>
  );
}

/**
 * Spec 0017, AC-27: receipts and other documents, shown only to people who see costs (the page
 * decides). Add document sends one PDF as an other document through the ticket's upload queue.
 */
export function DocumentsCard() {
  const { ticketId, attachments, queue } = useTicketFiles();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showAll, setShowAll] = useState(false);

  const list = attachments.list;
  const docs = list?.items.filter((a) => DOCUMENT_KINDS.has(a.kind)) ?? [];
  const collapsed = !showAll && docs.length > RECENT_DOCUMENTS;
  const shownDocs = collapsed ? docs.slice(-RECENT_DOCUMENTS) : docs;
  const docQueue = queue.items.filter((item) => DOCUMENT_KINDS.has(item.kind));
  const otherKind = list?.kinds.find((k) => k.kind === 'OTHER_DOCUMENT');
  const labels = new Map<string, string>(list?.kinds.map((k) => [k.kind, k.label]));
  const inFlight = docQueue.filter((item) => item.status === 'waiting' || item.status === 'uploading').length;
  const room = list ? documentRoomLeft(list.limits, inFlight) : 0;
  const canAdd = list != null && list.can.addDocuments && otherKind != null;

  const pick = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = '';
    if (file && list && otherKind && room > 0) queue.add([file], otherKind, list.limits.maxFileMb);
  };

  const remove = async (doc: Attachment) => {
    const ok = await confirm({
      title: 'Remove this document?',
      description: 'It disappears from the ticket for everyone.',
      confirmText: 'Remove',
      tone: 'destructive',
    });
    if (!ok) return;
    try {
      await removeAttachment(ticketId, doc.id);
      await attachments.reload();
      showToast('Document removed', 'success');
    } catch (err) {
      // A 403 already showed the fixed denied toast
      if (getApiErrorStatus(err) !== 403) showToast(getApiErrorMessage(err, 'Couldn’t remove the document. Try again.'), 'error');
    }
  };

  let body;
  if (attachments.state === 'loading') {
    body = (
      <p role="status" className="text-sm text-muted-foreground">
        Loading documents…
      </p>
    );
  } else if (attachments.state === 'error' || !list) {
    // AC-3: STORAGE_UNAVAILABLE shows its message in place of the documents
    body = (
      <p role="alert" className="text-sm text-muted-foreground">
        {attachments.errorMessage}
      </p>
    );
  } else {
    body = (
      <div className="flex flex-col gap-3">
        {docs.length > RECENT_DOCUMENTS && (
          <Button type="button" variant="ghost" size="sm" aria-expanded={!collapsed} className="self-start" onClick={() => setShowAll(!showAll)}>
            {collapsed ? `Show ${docs.length - RECENT_DOCUMENTS} earlier documents` : 'Show fewer documents'}
          </Button>
        )}
        {docs.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border">
            {shownDocs.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} kindLabel={labels.get(doc.kind) ?? doc.kind} onRemove={() => void remove(doc)} />
            ))}
          </ul>
        ) : (
          docQueue.length === 0 && <p className="text-sm text-muted-foreground">No receipts or documents yet.</p>
        )}

        {/* The live region stays mounted so the first upload is announced too */}
        <div aria-live="polite">
          {docQueue.length > 0 && (
            <ul className="flex flex-col gap-2">
              {docQueue.map((item) => (
                <UploadQueueRow key={item.id} item={item} onRetry={() => queue.retry(item.id)} onDismiss={() => queue.remove(item.id)} />
              ))}
            </ul>
          )}
        </div>

        {canAdd && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => pick(event.target)}
            />
            {/* Disabled, not removed, so keyboard focus stays on the button at the limit */}
            <Button type="button" variant="outline" size="sm" disabled={room <= 0} onClick={() => inputRef.current?.click()}>
              <FilePlus aria-hidden="true" />
              Add document
            </Button>
            {room <= 0 && <span className="text-xs text-muted-foreground">Document limit reached</span>}
          </div>
        )}
      </div>
    );
  }

  return <DetailSection title="Documents">{body}</DetailSection>;
}
