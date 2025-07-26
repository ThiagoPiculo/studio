
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ChildProfile, MissionInstance, SchoolScheduleEntry, Weekday } from './types';
import { weekdayLabels, allWeekdays } from './types';
import { getDayToWeekday, isMissionScheduledForDate, getPeriodOfDay } from './calendar-utils';
import { format, startOfWeek, addDays, parse } from 'date-fns';

// --- PDF Styling Constants ---
const PRIMARY_COLOR = '#64B5F6'; 
const TEXT_COLOR_DARK = '#374151'; // gray-700
const TEXT_COLOR_LIGHT = '#6B7281'; // gray-500
const HEADER_FONT_SIZE = 18;
const TITLE_FONT_SIZE = 14;
const BODY_FONT_SIZE = 9;
const SMALL_FONT_SIZE = 7;
const PAGE_MARGIN = 15;

// --- Helper Functions ---

function addHeader(doc: jsPDF, title: string, childName: string) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(HEADER_FONT_SIZE);
    doc.setTextColor(PRIMARY_COLOR);
    doc.text('Mini Herois', PAGE_MARGIN, 20);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(TITLE_FONT_SIZE);
    doc.setTextColor(TEXT_COLOR_DARK);
    const fullTitle = `${title} - ${childName}`;
    doc.text(fullTitle, doc.internal.pageSize.width - PAGE_MARGIN, 20, { align: 'right' });
    
    doc.setDrawColor(PRIMARY_COLOR);
    doc.setLineWidth(0.3);
    doc.line(PAGE_MARGIN, 25, doc.internal.pageSize.width - PAGE_MARGIN, 25);
}

function addFooter(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(TEXT_COLOR_LIGHT);
        const date = new Date().toLocaleDateString('pt-BR');
        doc.text(`Gerado em: ${date} | miniherois.com.br`, PAGE_MARGIN, doc.internal.pageSize.height - 10);
        doc.text(`Página ${i}`, doc.internal.pageSize.width - PAGE_MARGIN, doc.internal.pageSize.height - 10, { align: 'right' });
    }
}

function drawMissionCell(doc: jsPDF, data: any) {
    const cellText = data.cell.raw as string;
    if (!cellText || typeof cellText !== 'string') return;
    
    const lines = cellText.split('\n');
    let y = data.cell.y + 4; // Initial y position with padding

    lines.forEach(line => {
        if (line.trim() === '') {
            y += 2; // Extra space for empty lines
            return;
        }
        if (line.startsWith('§')) { // Use a special character to denote period
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(TEXT_COLOR_DARK);
            doc.text(line.substring(1), data.cell.x + 3, y);
            y += 4;
        } else {
            doc.setFont('Helvetica', 'normal');
            doc.setTextColor(TEXT_COLOR_LIGHT);
            const splitLines = doc.splitTextToSize(line, data.cell.width - 6);
            doc.text(splitLines, data.cell.x + 3, y);
            y += splitLines.length * 4;
        }
    });
}

// --- Main PDF Generation Function ---

export async function generateFamilyRoutinePDF(
    children: ChildProfile[],
    missions: MissionInstance[],
    schedule: SchoolScheduleEntry[],
    familyName: string,
    options: { includeMissions?: boolean, includeSchool?: boolean } = { includeMissions: true, includeSchool: true }
) {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });
    
    doc.setFont('Helvetica');

    let isFirstPage = true;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekdaysForColumns = allWeekdays.filter(d => d !== 'SU'); // Mon-Sat

    for (const child of children) {
        const childMissions = missions.filter(m => m.childId === child.id && m.status === 'pending');
        const childSchedule = schedule.filter(s => s.childId === child.id);

        const hasMissionsToPrint = options.includeMissions && childMissions.length > 0;
        const hasSchoolToPrint = options.includeSchool && childSchedule.length > 0;

        if (!options.includeMissions && !options.includeSchool) continue;
        if (options.includeMissions && !options.includeSchool && !hasMissionsToPrint) continue;
        if (!options.includeMissions && options.includeSchool && !hasSchoolToPrint) continue;
        if (options.includeMissions && options.includeSchool && !hasMissionsToPrint && !hasSchoolToPrint) continue;


        // --- Missions Page ---
        if (options.includeMissions) {
            if (!isFirstPage) doc.addPage('a4', 'landscape');
            addHeader(doc, 'Rotina Semanal de Missões', child.name);
            
            const missionColumns = weekdaysForColumns.map(day => weekdayLabels[day].long);
            
            const missionsByDayAndPeriod: Record<Weekday, { Manhã: string[], Tarde: string[], Noite: string[] }> = {
                MO: { Manhã: [], Tarde: [], Noite: [] }, TU: { Manhã: [], Tarde: [], Noite: [] },
                WE: { Manhã: [], Tarde: [], Noite: [] }, TH: { Manhã: [], Tarde: [], Noite: [] },
                FR: { Manhã: [], Tarde: [], Noite: [] }, SA: { Manhã: [], Tarde: [], Noite: [] },
                SU: { Manhã: [], Tarde: [], Noite: [] }, // Keep SU for data mapping
            };

            for (const day of daysOfWeek) {
                const dayKey = getDayToWeekday[day.getDay()];
                const dailyMissions = childMissions.filter(m => isMissionScheduledForDate(m, day))
                    .sort((a,b) => {
                        const timeA = a.isRecurring ? a.startDate?.toDate() : a.dueDate?.toDate();
                        const timeB = b.isRecurring ? b.startDate?.toDate() : b.dueDate?.toDate();
                        if (!timeA || !timeB) return 0;
                        return timeA.getTime() - timeB.getTime();
                    });

                dailyMissions.forEach(m => {
                    const missionDate = m.isRecurring ? m.startDate?.toDate() : m.dueDate?.toDate();
                    const period = getPeriodOfDay(missionDate);
                    if (period) {
                        const time = missionDate ? format(missionDate, 'HH:mm') : '';
                        const emoji = m.emoji || '🎯';
                        missionsByDayAndPeriod[dayKey][period].push(`${time} ${emoji} ${m.title}`);
                    }
                });
            }
            
            const formattedRowData = weekdaysForColumns.map(dayKey => {
                const periods = missionsByDayAndPeriod[dayKey];
                return (Object.entries(periods) as [('Manhã'|'Tarde'|'Noite'), string[]][])
                    .filter(([, missions]) => missions.length > 0)
                    .map(([periodName, missions]) => `§${periodName}\n${missions.join('\n')}`)
                    .join('\n\n');
            });

            autoTable(doc, {
                head: [missionColumns],
                body: [formattedRowData],
                startY: 30,
                theme: 'grid',
                headStyles: { fillColor: PRIMARY_COLOR, textColor: '#FFFFFF', fontStyle: 'bold', halign: 'center', font: 'Helvetica' },
                styles: { fontSize: BODY_FONT_SIZE, cellPadding: 3, valign: 'top', font: 'Helvetica' },
                didDrawCell: (data) => drawMissionCell(doc, data),
                didDrawPage: (data) => addHeader(doc, 'Rotina Semanal de Missões', child.name)
            });
            isFirstPage = false;
        }

        if (options.includeSchool) {
            if (!isFirstPage) doc.addPage('a4', 'landscape');
            addHeader(doc, 'Agenda Escolar', child.name);

            if (childSchedule.length === 0) {
                 doc.text("Nenhuma rotina escolar cadastrada para este herói.", PAGE_MARGIN, 40);
            } else {
                const scheduleColumns = ['Horário', ...weekdaysForColumns.map(day => weekdayLabels[day].long)];
                const scheduleBody: string[][] = [];
                const scheduleTimeSlots = new Set<string>();

                childSchedule.forEach(entry => scheduleTimeSlots.add(entry.startTime));
                const sortedScheduleTimes = Array.from(scheduleTimeSlots).sort();

                for (const time of sortedScheduleTimes) {
                    const row = [time];
                    for (const day of weekdaysForColumns) {
                        const entry = childSchedule.find(e => e.dayOfWeek === day && e.startTime === time);
                        row.push(entry ? entry.subject : '');
                    }
                    scheduleBody.push(row);
                }
                
                autoTable(doc, {
                    head: [scheduleColumns],
                    body: scheduleBody,
                    startY: 30,
                    theme: 'grid',
                    headStyles: { fillColor: '#3B82F6', textColor: '#FFFFFF', fontStyle: 'bold', halign: 'center', font: 'Helvetica' },
                    styles: { font: 'Helvetica', fontSize: BODY_FONT_SIZE, cellPadding: 2, valign: 'middle', minCellHeight: 15, halign: 'center' },
                    columnStyles: { 0: { fontStyle: 'bold', halign: 'center' } },
                    didParseCell: (data) => {
                        if (data.section === 'body' && data.column.index > 0) {
                            const entry = childSchedule.find(e => e.dayOfWeek === weekdaysForColumns[data.column.index - 1] && e.startTime === (data.row.cells[0]?.text?.[0] || ''));
                            if (entry && entry.color) {
                                data.cell.styles.fillColor = entry.color;
                                data.cell.styles.textColor = '#FFFFFF';
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    },
                    didDrawPage: (data) => addHeader(doc, 'Agenda Escolar', child.name)
                });
            }
            isFirstPage = false;
        }
    }

    if (isFirstPage) {
        let title = "Relatório de Rotinas";
        if (options.includeMissions && !options.includeSchool) title = "Rotina Semanal de Missões";
        if (!options.includeMissions && options.includeSchool) title = "Agenda Escolar";

        addHeader(doc, title, familyName);
        doc.setFontSize(BODY_FONT_SIZE);
        doc.setTextColor(TEXT_COLOR_LIGHT);
        doc.text("Nenhuma rotina encontrada para os heróis neste contexto.", PAGE_MARGIN, 40);
    }
    
    addFooter(doc);
    const safeFamilyName = familyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`rotinas_mini_herois_${safeFamilyName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
