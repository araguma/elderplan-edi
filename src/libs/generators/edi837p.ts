import { JSEDINotation, X12Generator } from 'node-x12'

export type EDI837PData = {
    claimFilingIndicatorCode: string
    services: [
        {
            date: string
            place: string
            emg: string
        }
    ]
}

export default class EDI837P {
    constructor(private data: EDI837PData) {}

    update(data: Partial<EDI837PData>): void {
        this.data = { ...this.data, ...data }
    }

    serialize(): string {
        // Interchange Control Header
        // ISA*00*          *00*          *XX*XXXXXXXXXXXXXXX*XX*XXXXXXXXXXXXXXX*240716*0316*^*00501*000000000*X*X*>~
        const document = new JSEDINotation(
            [
                '00',
                '',
                '00',
                '',
                'XX',
                'XXXXXXXXXXXXXXX',
                'XX',
                'XXXXXXXXXXXXXXX',
                '240716',
                '0316',
                '^',
                '00501',
                '000000000',
                'X',
                'X',
                '>',
            ],
            {
                elementDelimiter: '*',
                repetitionDelimiter: '^',
                segmentTerminator: '~\n',
            },
        )

        // Functional Group Header
        // GS*HC*XXXXX*XXX*20240716*2222*000*XX*005010X222A2~
        const group = document.addFunctionalGroup([
            'HC',
            'XXXXX',
            'XXX',
            '20240716',
            '2222',
            '000',
            'XX',
            '005010X222A2',
        ])

        // Transaction Set Header
        // ST*837*0001*005010X222A2~
        const transaction = group.addTransaction([
            '837',
            '0001',
            '005010X222A2',
        ])

        // Beginning of Hierarchical Transaction
        // BHT*0019*18*XXXX*20240716*1929*31~
        transaction.addSegment('BHT', [
            '0019',
            '18',
            'XXXX',
            '20240716',
            '1929',
            '31',
        ])

        // Submitter Name
        // NM1*41*2*XX*XXX*XXXX***46*XXXX~
        transaction.addSegment('NM1', [
            '41',
            '2',
            'XX',
            'XXX',
            'XXXX',
            '',
            '',
            '46',
            'XXXX',
        ])

        // Submitter EDI Contact Information
        // PER*IC*X*TE*XXXXX*EM*XX*EX*XX~
        transaction.addSegment('PER', [
            'IC',
            'X',
            'TE',
            'XXXXX',
            'EM',
            'XX',
            'EX',
            'XX',
        ])

        // Receiver Name
        // NM1*40*2*XXXX*****46*XXXXXXX~
        transaction.addSegment('NM1', [
            '40',
            '2',
            'XXXX',
            '',
            '',
            '',
            '46',
            'XXXXXXX',
        ])

        // Hierarchical Level
        // HL*1**20*1~
        transaction.addSegment('HL', ['1', '', '', '20', '1'])

        // Billing Provider Name
        // NM1*85*2*XX*XXX*XX**XXX*XX*XXX~
        transaction.addSegment('NM1', [
            '85',
            '2',
            'XX',
            'XXX',
            'XX',
            '',
            'XXX',
            'XX',
            'XXX',
        ])

        // Billing Provider Address
        // N3*XXXXX*XXXXX~
        transaction.addSegment('N3', ['XXXXX', 'XXXXX'])

        // Billing Provider City, State, ZIP Code
        // N4*XXX*XX*XXXXXXX*XXX~
        transaction.addSegment('N4', ['XXX', 'XX', 'XXXXXXX', 'XXX'])

        // Billing Provider Tax Identification
        // REF*EI*XXXX~
        transaction.addSegment('REF', ['EI', 'XXXX'])

        // Hierarchical Level
        // HL*2*1*22*1~
        transaction.addSegment('HL', ['2', '1', '22', '1'])

        // Subscriber Information
        // SBR*D*18*XXXXXX*XX*41****MB~
        transaction.addSegment('SBR', [
            'D',
            '18',
            'XXXXXX',
            'XX',
            '41',
            '',
            '',
            'MB',
        ])

        // Subscriber Name
        // NM1*IL*2*XX*XX*XXX**XX*MI*XXXX~
        transaction.addSegment('NM1', [
            'IL',
            '2',
            'XX',
            'XX',
            'XXX',
            '',
            'XX',
            'MI',
            'XXXX',
        ])

        // Payer Name
        // NM1*PR*2*XX*****XV*XX~
        transaction.addSegment('NM1', ['PR', '2', 'XX', '', '', '', 'XV', 'XX'])

        // Claim Information
        // CLM*XXXX*000000000000***X>B>X*Y*C*N*Y*P*AA>XXX>>XX>XXX*05********11~
        transaction.addSegment('CLM', [
            'XXXX',
            '000000000000',
            '',
            'X>B>X',
            'Y',
            'C',
            'N',
            'Y',
            'P',
            'AA>XXX>>XX>XXX',
            '05',
            '',
            '',
            '',
            '11',
        ])

        // Health Care Diagnosis Code
        // HI*BK>X*ABF>XXX*BF>XXX*BF>XX*BF>X*BF>XXXX*BF>XXX*ABF>XXXX*BF>XXX*BF>XXXX*BF>XXXXXX*BF>XXX~
        transaction.addSegment('HI', [
            'BK>X',
            'ABF>XXX',
            'BF>XXX',
            'BF>XX',
            'BF>X',
            'BF>XXXX',
            'BF>XXX',
            'ABF>XXXX',
            'BF>XXX',
            'BF>XXXX',
            'BF>XXXXXX',
            'BF>XXX',
        ])

        return new X12Generator(document).toString()
    }
}
