import { JSEDINotation, X12Generator } from 'node-x12'

import { getCCYYMMDD, getHHMM, getYYMMDD } from '@/libs/date'

export type EDI837PData = {
    insurance: {
        type: string
        id: string
    }
    patient: {
        firstName: string
        lastName: string
        middleName: string
        suffix: string
        birthDate: string
        gender: string
        address: string
        signature: string
        date: string
    }
    insured: {
        name: string
        relationship: string
        address: string
        signature: string
    }
    services: [
        {
            procedure: string
            place: string
            charge: string
            count: string
            date: string
        },
    ]
    authorizationNumber: string
    federalTaxID: string
    totalCharge: string
    amountPaid: string
    billingProvider: {
        name: string
        address: string
        city: string
        state: string
        zip: string
        country: string
        phone: string
    }
}

export default class EDI837P {
    constructor(private data: EDI837PData) {}

    update(data: Partial<EDI837PData>): void {
        this.data = { ...this.data, ...data }
    }

    serialize(): string {
        // Interchange Control Header
        const document = new JSEDINotation(
            [
                '00',
                '',
                '00',
                '',
                'ZZ',
                this.data.federalTaxID,
                'ZZ',
                '316250001',
                getYYMMDD(),
                getHHMM(),
                '^',
                '00501',
                '000000000', // Control Number
                '1',
                'T',
                ':',
            ],
            {
                elementDelimiter: '*',
                repetitionDelimiter: '^',
                segmentTerminator: '~\n',
            },
        )

        // Functional Group Header
        const group = document.addFunctionalGroup([
            'HC',
            this.data.federalTaxID,
            '316250001',
            getCCYYMMDD(),
            getHHMM(),
            '000', // Control Number
            'X',
            '005010X222A1',
        ])

        // Transaction Set Header
        const transaction = group.addTransaction([
            '837',
            '0001', // Control Number
            '005010X222A1',
        ])

        // Beginning of Hierarchical Transaction
        transaction.addSegment('BHT', [
            '0019',
            '00',
            'XXXX', // Control Number
            getCCYYMMDD(),
            getHHMM(),
            'CH', // ?
        ])

        // [1000A] Submitter Name
        transaction.addSegment('NM1', [
            '41',
            '2',
            this.data.billingProvider.name,
            '',
            '',
            '',
            '',
            '46',
            this.data.federalTaxID,
        ])

        // [1000A] Submitter EDI Contact Information
        transaction.addSegment('PER', [
            'IC',
            this.data.billingProvider.name,
            'TE',
            this.data.billingProvider.phone,
            '',
            '',
            '',
            '',
        ])

        // [1000B] Receiver Name
        transaction.addSegment('NM1', [
            '40',
            '2',
            'Elderplan',
            '',
            '',
            '',
            '',
            '46',
            '316250001',
        ])

        // [2000A] Hierarchical Level
        transaction.addSegment('HL', ['1', '', '20', '1'])

        // [2010AA] Billing Provider Name
        transaction.addSegment('NM1', [
            '85',
            '2',
            this.data.billingProvider.name,
            '',
            '',
            '',
            '',
            '',
            '',
        ])

        // [2010AA] Billing Provider Address
        transaction.addSegment('N3', [this.data.billingProvider.address, ''])

        // [2010AA] Billing Provider City, State, ZIP Code
        transaction.addSegment('N4', [
            this.data.billingProvider.city,
            this.data.billingProvider.state,
            this.data.billingProvider.zip,
            this.data.billingProvider.country,
            this.data.billingProvider.state,
        ])

        // [2010AA] Billing Provider Tax Identification
        transaction.addSegment('REF', ['EI', this.data.federalTaxID])

        // [2000B] Hierarchical Level
        transaction.addSegment('HL', ['2', '1', '22', '1'])

        // [2000B] Subscriber Information
        transaction.addSegment('SBR', [
            'D', // ?
            '18',
            '',
            '',
            '',
            '',
            '',
            '',
            this.data.insurance.type,
        ])

        // [2010BA] Subscriber Name
        transaction.addSegment('NM1', [
            'IL',
            '1',
            this.data.patient.lastName,
            this.data.patient.firstName,
            this.data.patient.middleName,
            '',
            this.data.patient.suffix,
            'MI',
            this.data.insurance.id,
        ])

        // [2010BB] Payer Name
        transaction.addSegment('NM1', [
            'PR',
            '2',
            'Elderplan',
            '',
            '',
            '',
            '',
            'PI',
            '31625',
        ])

        // [2300] Claim Information
        // CLM*XXXX*000000000000***X>B>X*Y*C*N*Y*P*AA>XXX>>XX>XXX*05********11~
        transaction.addSegment('CLM', [
            'XXXX', // Patient Control Number
            this.data.totalCharge,
            '',
            '',
            '12>B>', // ?
            'Y', // ?
            'A', // ?
            'Y', // ?
            'Y', // ?
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
        ])

        // [2300] Prior Authorization Number
        transaction.addSegment('REF', ['G1', this.data.authorizationNumber])

        // [2300] Health Care Diagnosis Code
        transaction.addSegment('HI', [
            'BF>Z74.1',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
        ])

        this.data.services.forEach((service, index) => {
            // [2400] Service Line Number
            transaction.addSegment('LX', [(index + 1).toString()])

            // [2400] Professional Service
            transaction.addSegment('SV1', [
                service.procedure,
                service.charge,
                'UN',
                service.count,
                service.place,
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
            ])

            // [2400] Date - Service Date
            transaction.addSegment('DTP', ['472', 'RD8', service.date])
        })

        return new X12Generator(document).toString()
    }
}
