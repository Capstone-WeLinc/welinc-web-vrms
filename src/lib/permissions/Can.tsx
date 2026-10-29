import type { ReactNode } from 'react';
import { Can as CaslCan } from '@casl/react';
import type { PermissionKey } from './keys';

/** `<Can I="ticket.create">`: shows its children only with that key (spec 0011, AC-22). */
export function Can({ I, not, children }: { I: PermissionKey; not?: boolean; children: ReactNode }) {
  return (
    <CaslCan I={I} a="Permission" not={not}>
      {children}
    </CaslCan>
  );
}
