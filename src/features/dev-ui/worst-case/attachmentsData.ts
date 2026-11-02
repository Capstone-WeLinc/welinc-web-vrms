import type { Attachment, AttachmentKind, AttachmentList } from '../../../lib/api/attachmentsApi';
import type { DataMode } from './dataMode';

// Development only (break-ui, spec 0017): a ticket's photos and documents. Limits used: file name
// 255 (data model), uploader name 100 (whoName), 20 Before photos (uploads.max_vehicle_photos max),
// 30 After photos (uploads.max_after_photos max, spec 0018), 100 documents (uploads.max_documents
// max), display photos at most 2048 px on the long edge (AC-6).
// Fixtures are built on call, never at module level, so production drops this file.

const ATTACHMENTS_URL = /^\/vrms\/repairs\/[^/]+\/attachments$/;
const ATTACHMENT_ONE_URL = /^\/vrms\/repairs\/[^/]+\/attachments\/[^/]+$/;

const EMAIL_ONLY = 'bartholomew.fitzgerald@northwind-industries-holdings.example.com';
const LONG_NAME = 'Aleksandra Wiśniewska-Kowalczyk de la Cruz-Montgomery';
const DIACRITICS = 'Đặng Thị Ngọc Hân';
const FOX = '🦊 Fox';

// Underscores are not line break points, so this one cannot wrap. 251 characters plus ".pdf" is 255
const LONG_FILE =
  `Official_Receipt_0004821_Northwind_Industries_Holdings_and_Subsidiaries_Philippines_Incorporated_${'Marikina_Service_Annex_'.repeat(8)}`.slice(
    0,
    251,
  ) + '.pdf';

const KINDS: AttachmentList['kinds'] = [
  { kind: 'PHOTO', label: 'Photo', accepts: ['image/jpeg', 'image/png', 'image/heic'], acceptsLabel: 'JPEG, PNG or HEIC photos' },
  { kind: 'RECEIPT', label: 'Receipt', accepts: ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'], acceptsLabel: 'JPEG, PNG or HEIC photos and PDF files' },
  { kind: 'OTHER_DOCUMENT', label: 'Other document', accepts: ['application/pdf'], acceptsLabel: 'PDF files' },
];

/** A picture the browser can draw with no network: a plain panel with its size written on it. */
function panel(width: number, height: number, hue: number) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="hsl(${hue} 35% 55%)"/>` +
    `<text x="50%" y="50%" fill="white" font-family="sans-serif" font-size="${Math.round(Math.min(width, height) / 6)}" text-anchor="middle" dominant-baseline="middle">${width}x${height}</text>` +
    '</svg>';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const BROKEN_LINK = 'https://example.invalid/expired-link.jpg';

function ago(ms: number) {
  return new Date(Date.now() - ms).toISOString();
}

const DAY = 86_400_000;

function photo(i: number, over: Partial<Attachment> & { size?: [number, number] }): Attachment {
  const [width, height] = over.size ?? [2048, 1536];
  return {
    id: `fixture-a-${i}`,
    kind: 'VEHICLE_PHOTO',
    issueId: null,
    fileName: `IMG_20250914_18${String(i).padStart(2, '0')}22_HDR.jpg`,
    mimeType: 'image/jpeg',
    sizeBytes: 640_000,
    width,
    height,
    uploadedBy: { id: 'fixture-u-1', name: 'Pedro Santos' },
    createdAt: ago((30 - i) * 3_600_000),
    url: panel(width, height, (i * 47) % 360),
    thumbnailUrl: panel(320, 320, (i * 47) % 360),
    canRemove: i % 2 === 0,
    canMove: i % 2 === 0,
    ...over,
  };
}

function doc(i: number, kind: AttachmentKind, fileName: string, uploader: string, canRemove: boolean): Attachment {
  return {
    id: `fixture-d-${i}`,
    kind,
    issueId: null,
    fileName,
    mimeType: 'application/pdf',
    sizeBytes: 210_000,
    width: null,
    height: null,
    uploadedBy: { id: `fixture-u-${i}`, name: uploader },
    createdAt: ago((12 - i) * DAY),
    url: 'https://example.com/fixture.pdf',
    thumbnailUrl: null,
    canRemove,
    canMove: false,
  };
}

function worstPhotos(): Attachment[] {
  return [
    photo(0, { issueId: 'fixture-issue-2', uploadedBy: { id: 'u0', name: LONG_NAME }, fileName: 'IMG_20250914_183022_HDR_portrait_edited_edited.jpg' }),
    photo(1, { kind: 'PROOF', uploadedBy: { id: 'u1', name: 'Jo' }, size: [1536, 2048] }),
    photo(2, { issueId: 'fixture-issue-1', uploadedBy: { id: 'u2', name: DIACRITICS }, size: [2048, 420] }),
    // The link has expired and refetching gives the same one: the tile shows "Could not load photo"
    photo(3, { kind: 'PROOF', uploadedBy: { id: 'u3', name: FOX }, thumbnailUrl: BROKEN_LINK, url: BROKEN_LINK }),
    // Uploaded by a person known only by email, and one you may not remove
    photo(4, { uploadedBy: { id: 'u4', name: EMAIL_ONLY }, canRemove: false }),
  ];
}

function worstDocuments(): Attachment[] {
  return [
    doc(0, 'RECEIPT', 'Q3 Board Deck — FINAL (revised) v12 [approved by legal].pdf', LONG_NAME, true),
    doc(1, 'OTHER_DOCUMENT', 'IMG_20250914_183022_HDR_portrait_edited_edited_scanned_supplier_invoice.pdf', EMAIL_ONLY, false),
    doc(2, 'RECEIPT', 'resibo.pdf', 'Jo', true),
    doc(3, 'OTHER_DOCUMENT', LONG_FILE, DIACRITICS, true),
    doc(4, 'RECEIPT', 'Receipt <b>0042</b> &amp; **parts** <script>alert(1)</script>.pdf', FOX, false),
  ];
}

function list(mode: Exclude<DataMode, 'demo'>): AttachmentList {
  let photos: Attachment[];
  let docs: Attachment[];
  let maxPhotos = 5;
  let maxAfter = 10;
  let maxDocs = 20;
  if (mode === 'empty') {
    photos = [];
    docs = [];
  } else if (mode === 'one') {
    photos = [photo(0, { uploadedBy: { id: 'u1', name: 'Jo' } })];
    docs = [doc(0, 'RECEIPT', 'resibo.pdf', 'Jo', true)];
  } else if (mode === 'huge') {
    // The settings' own maximums: 20 Before, 30 After and 100 documents, every one a different shape
    maxPhotos = 20;
    maxAfter = 30;
    maxDocs = 100;
    photos = Array.from({ length: 50 }, (_, i) =>
      photo(i, {
        kind: i < 20 ? 'VEHICLE_PHOTO' : 'PROOF',
        issueId: i < 20 ? `fixture-issue-${(i % 3) + 1}` : null,
        size: i % 3 === 0 ? [2048, 1536] : i % 3 === 1 ? [1536, 2048] : [2048, 420],
      }),
    );
    docs = Array.from({ length: 100 }, (_, i) =>
      doc(i, i % 2 === 0 ? 'RECEIPT' : 'OTHER_DOCUMENT', i % 7 === 0 ? LONG_FILE : `Invoice ${i + 1}.pdf`, i % 5 === 0 ? LONG_NAME : 'Pedro Santos', i % 3 === 0),
    );
  } else {
    photos = worstPhotos();
    docs = worstDocuments();
  }
  return {
    items: [...photos, ...docs],
    urlsExpireAt: ago(-20 * 60_000),
    limits: {
      maxFileMb: 10,
      maxVehiclePhotos: maxPhotos,
      maxAfterPhotos: maxAfter,
      maxDocuments: maxDocs,
      vehiclePhotoCount: photos.filter((p) => p.kind === 'VEHICLE_PHOTO').length,
      afterPhotoCount: photos.filter((p) => p.kind === 'PROOF').length,
      documentCount: docs.length,
    },
    kinds: KINDS,
    can: { addFiles: true, addDocuments: true },
  };
}

/** A ticket's attachment list for a fixture mode, or undefined for any other URL. */
export function madeUpAttachments(mode: DataMode, url: string): unknown {
  if (mode === 'demo') return undefined;
  return ATTACHMENTS_URL.test(url.split('?')[0]) ? list(mode) : undefined;
}

/** Uploads and removes would send fixture ids to the live database, so they stay off. */
export function isAttachmentWrite(method: string | undefined, url: string | undefined) {
  if (!method || method.toLowerCase() === 'get' || !url) return false;
  const path = url.split('?')[0];
  return ATTACHMENTS_URL.test(path) || ATTACHMENT_ONE_URL.test(path);
}
