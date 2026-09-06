import 'server-only';
import { validateFileBytes } from '@/lib/upload/validation';

/**
 * The malware-scanning boundary.
 *
 * THE RULE: a document is created `pending` and its bytes are not readable -
 * the storage SELECT policy requires scan_status = 'clean'. Only the worker
 * moves it, through app.record_scan_result, which is service_role only and
 * refuses to run inside a user session.
 *
 * THE DEFAULT: with nothing configured, nothing happens. Documents stay pending
 * and stay undeliverable. We never mark an unscanned file clean - that would
 * turn "scanned" into a lie the moment this ships.
 *
 * The development adapter is opt-in via SCANNER_PROVIDER=dev and does a real,
 * if modest, piece of work: it re-checks the stored bytes against the same
 * magic-byte rules the client used, and treats the EICAR test string as
 * infected so the infected path is genuinely exercised.
 *
 * These adapters are deliberately pure - bytes in, verdict out. Nothing here
 * touches the database or holds a credential; the cron route does that.
 */

export type ScanResult = 'clean' | 'infected' | 'error' | 'skipped';

export type ScanVerdict = { result: ScanResult; detail?: string };

export interface MalwareScanner {
  readonly name: string;
  scan(bytes: Uint8Array, declaredMime: string): Promise<ScanVerdict>;
}

/** The EICAR standard anti-malware test file. Not malware; a defined trigger. */
export const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

class DevScanner implements MalwareScanner {
  readonly name = 'dev';
  async scan(bytes: Uint8Array, declaredMime: string): Promise<ScanVerdict> {
    const asText = Buffer.from(bytes.slice(0, 4096)).toString('latin1');
    if (asText.includes(EICAR)) {
      return { result: 'infected', detail: 'EICAR test signature' };
    }
    const check = validateFileBytes(declaredMime, bytes.byteLength, bytes.slice(0, 16));
    if (!check.ok) {
      return { result: 'error', detail: `content check failed: ${check.reason}` };
    }
    return { result: 'clean', detail: 'dev adapter: signature and content re-check' };
  }
}

/**
 * No scanner. Returns 'skipped'; the caller records nothing, so the document
 * stays pending and its bytes stay unreadable.
 */
class NullScanner implements MalwareScanner {
  readonly name = 'none';
  async scan(): Promise<ScanVerdict> {
    return { result: 'skipped', detail: 'no scanner configured' };
  }
}

export function getScanner(): MalwareScanner {
  switch (process.env.SCANNER_PROVIDER) {
    case 'dev':
      return new DevScanner();
    // A real provider (ClamAV, VirusTotal, a vendor API) is added here. The
    // interface is the whole contract.
    default:
      return new NullScanner();
  }
}
