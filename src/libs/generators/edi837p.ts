import { JSEDINotation, X12Generator } from 'node-x12'

import { toCCYYMMDD, toHHMM, toYYMMDD } from '@/libs/date'
import { Address } from '@/types'

export type EDI837PData = {
    patient: {
        lastName: string
        firstName: string
        middleInitial: string
        birthDate: Date
        gender: 'F' | 'M' | 'U'
        address: Address
        relationship: '18'
    }
    insured: {
        type: 'MA' | 'MB' | 'MC'
        id: string
        lastName: string
        firstName: string
        middleInitial: string
        address: Address
    }
    services: {
        from: Date
        to: Date
        place: string
        procedure: string
        modifiers: string[]
        charge: string
        count: string
        renderingProviderId: string
    }[]
    billingProvider: {
        name: string
        address: Address
        phone: string
    }
    diagnosisCodes: string[]
    authorizationNumber: string
    federalTaxId: string
    totalCharge: string
    amountPaid: string
    npiNumber: string
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
                `AX${this.data.federalTaxId}`,
                'ZZ',
                '316250001',
                toYYMMDD(),
                toHHMM(),
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
                subElementDelimiter: ':',
            },
        )

        // Functional Group Header
        const group = document.addFunctionalGroup([
            'HC',
            `AX${this.data.federalTaxId}`,
            '316250001',
            toCCYYMMDD(),
            toHHMM(),
            '000000000', // Control Number
            'X',
            '005010X222A1',
        ])

        // Transaction Set Header
        const transaction = group.addTransaction([
            '837',
            '000000000', // Control Number
            '005010X222A1',
        ])

        // Beginning of Hierarchical Transaction
        transaction.addSegment('BHT', [
            '0019',
            '00',
            '000000000', // Control Number
            toCCYYMMDD(),
            toHHMM(),
            'CH',
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
            `AX${this.data.federalTaxId}`,
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
        transaction.addSegment('HL', ['1', '', '20', ''])

        // [2010AA] Billing Provider Name
        transaction.addSegment('NM1', [
            '85',
            '2',
            this.data.billingProvider.name,
            '',
            '',
            '',
            '',
            'XX',
            this.data.npiNumber,
        ])

        // [2010AA] Billing Provider Address
        transaction.addSegment('N3', [
            this.data.billingProvider.address.street,
            '',
        ])

        // [2010AA] Billing Provider City, State, ZIP Code
        transaction.addSegment('N4', [
            this.data.billingProvider.address.city,
            this.data.billingProvider.address.state,
            this.data.billingProvider.address.zip,
            this.data.billingProvider.address.country,
            '',
            '',
            '',
        ])

        // [2010AA] Billing Provider Tax Identification
        transaction.addSegment('REF', ['EI', this.data.federalTaxId])

        // [2010AA] Billing Provider Contact Information
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

        // [2000B] Hierarchical Level
        transaction.addSegment('HL', ['2', '1', '22', ''])

        // [2000B] Subscriber Information
        transaction.addSegment('SBR', [
            'P',
            this.data.patient.relationship,
            '',
            '',
            '',
            '',
            '',
            '',
            this.data.insured.type,
        ])

        // [2010BA] Subscriber Name
        transaction.addSegment('NM1', [
            'IL',
            '1',
            this.data.insured.lastName,
            this.data.insured.firstName,
            this.data.insured.middleInitial,
            '',
            '',
            'MI',
            this.data.insured.id,
        ])

        // [2010BA] Subscriber Address
        transaction.addSegment('N3', [this.data.insured.address.street, ''])

        // [2010BA] Subscriber City, State, ZIP Code
        transaction.addSegment('N4', [
            this.data.insured.address.city,
            this.data.insured.address.state,
            this.data.insured.address.zip,
            this.data.insured.address.country,
            '',
            '',
            '',
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

        // [2000C] Hierarchical Level
        transaction.addSegment('HL', ['3', '2', '23', ''])

        // [2000C] Patient Information
        transaction.addSegment('PAT', [
            this.data.patient.relationship,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
        ])

        // [2010CA] Patient Name
        transaction.addSegment('NM1', [
            'QC',
            '1',
            this.data.patient.lastName,
            this.data.patient.firstName,
            this.data.patient.middleInitial,
            '',
            '',
        ])

        // [2010CA] Patient Address
        transaction.addSegment('N3', [this.data.patient.address.street, ''])

        // [2010CA] Patient City, State, ZIP Code
        transaction.addSegment('N4', [
            this.data.patient.address.city,
            this.data.patient.address.state,
            this.data.patient.address.zip,
            this.data.patient.address.country,
            '',
            '',
            '',
        ])

        // [2010CA] Patient Demographic Information
        transaction.addSegment('DMG', [
            'D8',
            toCCYYMMDD(this.data.patient.birthDate),
            this.data.patient.gender,
        ])

        // [2300] Claim Information
        transaction.addSegment('CLM', [
            '000000000', // Patient Control Number
            this.data.totalCharge,
            '',
            '',
            '12:B:1',
            'N',
            'C',
            'Y',
            'Y',
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

        // [2300] Patient Amount Paid
        transaction.addSegment('AMT', ['F5', this.data.amountPaid])

        // [2300] Prior Authorization Number
        transaction.addSegment('REF', ['G1', this.data.authorizationNumber])

        // [2300] Health Care Diagnosis Code
        transaction.addSegment(
            'HI',
            Array<string>(15)
                .fill('')
                .map((value, index) => {
                    return this.data.diagnosisCodes[index]
                        ? `BK:${this.data.diagnosisCodes[index]}`
                        : value
                }),
        )

        this.data.services.forEach((service, index) => {
            // [2400] Service Line Number
            transaction.addSegment('LX', [(index + 1).toString()])

            // [2400] Professional Service
            transaction.addSegment('SV1', [
                `HC:${service.procedure}:${service.modifiers.join(':')}`,
                service.charge,
                'UN',
                service.count,
                service.place,
                '',
                '1',
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
            transaction.addSegment('DTP', [
                '472',
                'RD8',
                `${toCCYYMMDD(service.from)}-${toCCYYMMDD(service.to)}`,
            ])

            // [2420A] Rendering Provider Name
            transaction.addSegment('NM1', [
                '82',
                '1',
                this.data.billingProvider.name,
                '',
                '',
                '',
                '',
                'XX',
                service.renderingProviderId,
            ])
        })

        return new X12Generator(document).toString()
    }
}
