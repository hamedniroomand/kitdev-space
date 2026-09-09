/**
 * Plain English text for the EPP status codes that a registry reports in RDAP.
 * The page and the tests read the same map, so the text has one source.
 */

/** The tool shows an expiry warning when fewer days than this remain. */
export const EXPIRY_WARNING_DAYS = 30

/** Keys hold only lowercase letters and digits, so `client hold` and `clientHold` match. */
const EPP_STATUS_TEXT: Record<string, string> = {
  ok: 'The domain is active. The registry reports no restriction on it.',
  active: 'The domain is active. The registry reports no restriction on it.',
  inactive: 'The domain has no name servers. It does not resolve in DNS.',
  locked: 'The registry blocks all changes to the domain.',
  clienthold: 'The registrar put the domain on hold. The registry does not publish it in DNS.',
  serverhold: 'The registry put the domain on hold. The registry does not publish it in DNS.',
  clienttransferprohibited: 'The registrar blocks a transfer of the domain to a different registrar.',
  servertransferprohibited: 'The registry blocks a transfer of the domain to a different registrar.',
  clientdeleteprohibited: 'The registrar blocks a request to delete the domain.',
  serverdeleteprohibited: 'The registry blocks a request to delete the domain.',
  clientupdateprohibited: 'The registrar blocks a change to the domain record.',
  serverupdateprohibited: 'The registry blocks a change to the domain record.',
  clientrenewprohibited: 'The registrar blocks a renewal of the domain.',
  serverrenewprohibited: 'The registry blocks a renewal of the domain.',
  addperiod: 'The registrar added the domain a few days ago. The registrar can still cancel it for a refund.',
  autorenewperiod: 'The registry renewed the domain automatically. The registrar can still cancel the renewal.',
  renewperiod: 'The registrar renewed the domain a few days ago. The registrar can still cancel the renewal.',
  transferperiod: 'A different registrar received the domain a few days ago.',
  redemptionperiod: 'The registrar deleted the domain. The owner can still restore it for a fee.',
  pendingrestore: 'The registrar asked to restore the deleted domain. The registry waits for the restore report.',
  pendingcreate: 'The registry received a request to add the domain. The request is not complete.',
  pendingdelete: 'The restore time is over. The registry deletes the domain in a few days.',
  pendingrenew: 'The registry received a request to renew the domain. The request is not complete.',
  pendingtransfer: 'The registry received a transfer request. The domain moves when the request is complete.',
  pendingupdate: 'The registry received a request to change the domain. The request is not complete.',
  associated: 'The record is connected to a registered object.',
  validated: 'The registry validated the contact data of this record.',
  removed: 'The registry removed the values of this record.',
  obscured: 'The registry replaced the values of this record with different text.',
  private: 'A privacy service holds the contact data of this record.',
  proxy: 'A proxy service holds the contact data of this record.',
}

function normalize(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Makes `clientTransferProhibited` into `client transfer prohibited`. */
function toWords(code: string): string {
  return code
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Gives one sentence for an EPP status code. An unknown code gets a sentence
 * with the words of the code, so the page never shows a bare acronym.
 */
export function explainEppStatus(code: string): string {
  const known = EPP_STATUS_TEXT[normalize(code)]
  if (known) {
    return known
  }
  return `The registry reports the status "${toWords(code)}". This code is not in the standard EPP list.`
}

/** Text for the days that remain before the domain expires. */
export function describeExpiry(days: number): string {
  if (days < 0) {
    return `The registration expired ${Math.abs(days)} days ago.`
  }
  if (days === 0) {
    return 'The registration expires today.'
  }
  return `The registration expires in ${days} days. Renew the domain to keep it.`
}
