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
        relation: '18'
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
        procedure: string
        modifiers: string[]
        place: string
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
        // Interchange Control Header (Checked)
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
            },
        )

        // Functional Group Header (Checked)
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

        // Transaction Set Header (Checked)
        const transaction = group.addTransaction([
            '837',
            '000000000', // Control Number
            '005010X222A1',
        ])

        // Beginning of Hierarchical Transaction (Checked)
        transaction.addSegment('BHT', [
            '0019',
            '00',
            '000000000', // Control Number
            toCCYYMMDD(),
            toHHMM(),
            'CH',
        ])

        // [1000A] Submitter Name (Checked)
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

        // [1000A] Submitter EDI Contact Information (Checked)
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

        // [1000B] Receiver Name (Checked)
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

        // [2000A] Hierarchical Level (Checked)
        transaction.addSegment('HL', ['1', '', '20', ''])

        // [2010AA] Billing Provider Name (Checked)
        transaction.addSegment('NM1', [
            '85',
            '2',
            this.data.billingProvider.name,
            '',
            '',
            '',
            '',
            '',
            this.data.npiNumber,
        ])

        // [2010AA] Billing Provider Address (Checked)
        transaction.addSegment('N3', [
            this.data.billingProvider.address.street,
            '',
        ])

        // [2010AA] Billing Provider City, State, ZIP Code (Checked)
        transaction.addSegment('N4', [
            this.data.billingProvider.address.city,
            this.data.billingProvider.address.state,
            this.data.billingProvider.address.zip,
            this.data.billingProvider.address.country,
            '',
            '',
            '',
        ])

        // [2010AA] Billing Provider Tax Identification (Checked)
        transaction.addSegment('REF', ['EI', this.data.federalTaxId])

        // [2010AA] Billing Provider Contact Information (Checked)
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

        // [2000B] Hierarchical Level (Checked)
        transaction.addSegment('HL', ['2', '1', '22', ''])

        // [2000B] Subscriber Information (Checked)
        transaction.addSegment('SBR', [
            'P', // ?
            this.data.patient.relation,
            '',
            '',
            '',
            '',
            '',
            '',
            this.data.insured.type,
        ])

        // [2010BA] Subscriber Name (Checked)
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

        // [2010BA] Subscriber Address (Checked)
        transaction.addSegment('N3', [this.data.insured.address.street, ''])

        // [2010BA] Subscriber City, State, ZIP Code (Checked)
        transaction.addSegment('N4', [
            this.data.insured.address.city,
            this.data.insured.address.state,
            this.data.insured.address.zip,
            this.data.insured.address.country,
            '',
            '',
            '',
        ])

        // [2010BB] Payer Name (Checked)
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

        // [2000C] Hierarchical Level (Checked)
        transaction.addSegment('HL', ['3', '2', '23', ''])

        // [2000C] Patient Information (Checked)
        transaction.addSegment('PAT', [
            this.data.patient.relation,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
        ])

        // [2010CA] Patient Name (Checked)
        transaction.addSegment('NM1', [
            'QC',
            '1',
            this.data.patient.lastName,
            this.data.patient.firstName,
            this.data.patient.middleInitial,
            '',
            '',
        ])

        // [2010CA] Patient Address (Checked)
        transaction.addSegment('N3', [this.data.patient.address.street, ''])

        // [2010CA] Patient City, State, ZIP Code (Checked)
        transaction.addSegment('N4', [
            this.data.patient.address.city,
            this.data.patient.address.state,
            this.data.patient.address.zip,
            this.data.patient.address.country,
            this.data.patient.address.state,
        ])

        // [2010CA] Patient Demographic Information (Checked)
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
            '', // Required
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
            // [2400] Service Line Number (Checked)
            transaction.addSegment('LX', [(index + 1).toString()])

            // [2400] Professional Service (Checked)
            transaction.addSegment('SV1', [
                `HC:${service.procedure}:${service.modifiers.join(':')}`,
                service.charge,
                'UN', // ?
                service.count,
                service.place,
                '',
                '', // Required
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
            ])

            // [2400] Date - Service Date (Checked)
            transaction.addSegment('DTP', [
                '472',
                'RD8',
                `${toCCYYMMDD(service.from)}-${toCCYYMMDD(service.to)}`,
            ])

            // [2420A] Rendering Provider Name (Checked)
            transaction.addSegment('NM1', [
                '82',
                '1',
                this.data.billingProvider.name,
                '',
                '',
                '',
                '',
                '',
                service.renderingProviderId,
            ])
        })

        return new X12Generator(document).toString()
    }
}
