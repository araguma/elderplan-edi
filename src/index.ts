import EDI837P from '@/libs/generators/edi837p'

const edi837p = new EDI837P({
    claimFilingIndicatorCode: '12',
    services: [{ date: '20240716', place: '2222', emg: '000' }],
})

console.log(edi837p.serialize())
