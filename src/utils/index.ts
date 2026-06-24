import { format } from 'date-fns';

export function createPageUrl(pageName: string) {
    return '/' + pageName.replace(/ /g, '-');
}

export function safeFormatDate(dateStr: string | undefined | null, formatStr: string, locale?: any) {
    if (!dateStr) return '—';
    try {
        let date;
        // Try parsing as is first
        date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            // If that fails, try adding time component for date-only strings
            date = new Date(dateStr + 'T00:00:00');
        }
        if (isNaN(date.getTime())) return '—';
        return format(date, formatStr, { locale });
    } catch {
        return '—';
    }
}