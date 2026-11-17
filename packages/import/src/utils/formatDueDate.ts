/**
 * Formats an issue's due date as the `yyyy-MM-dd` string Linear expects.
 *
 * Importers parse date-only values such as "2026-03-05" with `new Date`, which gives midnight UTC. Format the date in UTC
 * as well: in a time zone west of UTC the local date is the day before.
 */
export const formatDueDate = (dueDate: Date): string => dueDate.toISOString().slice(0, 10);
