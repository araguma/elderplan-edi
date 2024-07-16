// @ts-expect-error - no types available
import edi from 'rdpcrystal-edi-library'

/**
 * Join multiple EDI documents into a single EDI document.
 * @param {string[]} documents The EDI documents to join.
 * @returns {string} The joined EDI document.
 */
export default function join(documents) {
    const joiner = new edi.EDIFileJoiner()
    joiner.FileJoinLevel = edi.FileJoinLevel.FUNCTIONALGROUP
    return joiner.join(documents)
}
