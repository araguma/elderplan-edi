export function getYYMMDD(): string {
    const date = new Date()
    return `${date.getFullYear().toString().slice(2)}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`
}

export function getHHMM(): string {
    const date = new Date()
    return `${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`
}

export function getCCYYMMDD(): string {
    const date = new Date()
    return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`
}
