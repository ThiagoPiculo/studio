
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ChildProfile, MissionInstance, SchoolScheduleEntry, Weekday } from './types';
import { weekdayLabels, allWeekdays } from './types';
import { getDayToWeekday, isMissionScheduledForDate, parseTime, getPeriodOfDay } from './calendar-utils';
import { format, startOfWeek, addDays } from 'date-fns';

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
    
    // Add a line separator
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
    
    // Set the default font for the entire document
    doc.setFont('Helvetica');

    let isFirstPage = true;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    for (const child of children) {
        const childMissions = missions.filter(m => m.childId === child.id && m.status === 'pending');
        const childSchedule = schedule.filter(s => s.childId === child.id);

        const hasMissionsToPrint = options.includeMissions && childMissions.length > 0;
        const hasSchoolToPrint = options.includeSchool && childSchedule.length > 0;

        if (!hasMissionsToPrint && !hasSchoolToPrint) {
            continue;
        }

        // --- Missions Page ---
        if (hasMissionsToPrint) {
            if (!isFirstPage) doc.addPage('a4', 'landscape');
            addHeader(doc, 'Rotina Semanal de Missões', child.name);
            
            const missionColumns = allWeekdays.map(day => weekdayLabels[day].long);
            const missionRows = [];

            const missionsByDayAndPeriod: Record<Weekday, { Manhã: string[], Tarde: string[], Noite: string[] }> = {
                MO: { Manhã: [], Tarde: [], Noite: [] },
                TU: { Manhã: [], Tarde: [], Noite: [] },
                WE: { Manhã: [], Tarde: [], Noite: [] },
                TH: { Manhã: [], Tarde: [], Noite: [] },
                FR: { Manhã: [], Tarde: [], Noite: [] },
                SA: { Manhã: [], Tarde: [], Noite: [] },
                SU: { Manhã: [], Tarde: [], Noite: [] },
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
            
            const formattedRowData = Object.entries(missionsByDayAndPeriod).reduce((acc, [dayKey, periods]) => {
                const periodContent = (Object.entries(periods) as [('Manhã'|'Tarde'|'Noite'), string[]][])
                    .filter(([, missions]) => missions.length > 0)
                    .map(([periodName, missions]) => `[${periodName}]\n${missions.join('\n')}`)
                    .join('\n\n');
                
                acc[dayKey as Weekday] = periodContent;
                return acc;
            }, {} as Record<Weekday, string>);
            
            missionRows.push(allWeekdays.map(day => formattedRowData[day]));

            autoTable(doc, {
                head: [missionColumns],
                body: missionRows as any,
                startY: 30,
                theme: 'grid',
                headStyles: { fillColor: PRIMARY_COLOR, textColor: '#FFFFFF', fontStyle: 'bold', halign: 'center', font: 'Helvetica' },
                styles: { fontSize: BODY_FONT_SIZE, cellPadding: 2, valign: 'top', font: 'Helvetica' },
                didParseCell: function(data) {
                    if (data.section === 'body' && data.cell.text) {
                        // Ensure correct font is set before manual drawing
                        doc.setFont('Helvetica');
                        const cellText = Array.isArray(data.cell.text) ? data.cell.text.join('\n') : data.cell.text;
                        const lines = cellText.split('\n');
                        const styledLines = lines.map(line => {
                            if (line.startsWith('[') && line.endsWith(']')) {
                                return { content: line.replace(/\[(.*?)\]/g, '$1'), styles: { fontStyle: 'bold', textColor: TEXT_COLOR_DARK } };
                            }
                            return { content: line, styles: { fontStyle: 'normal', textColor: TEXT_COLOR_LIGHT } };
                        });
                        data.cell.text = styledLines as any;
                    }
                },
                didDrawPage: (data) => {
                    addHeader(doc, 'Rotina Semanal de Missões', child.name);
                    data.cursor.y = 30;
                }
            });
            isFirstPage = false;
        }

        // --- School Schedule Page ---
        if (hasSchoolToPrint) {
            if (!isFirstPage) doc.addPage('a4', 'landscape');
            addHeader(doc, 'Agenda Escolar', child.name);

            const scheduleColumns = ['Horário', ...allWeekdays.map(day => weekdayLabels[day].long)];
            const scheduleBody: string[][] = [];
            const scheduleTimeSlots = new Set<string>();

            childSchedule.forEach(entry => {
                scheduleTimeSlots.add(entry.startTime);
            });
            
            const sortedScheduleTimes = Array.from(scheduleTimeSlots).sort();

            for (const time of sortedScheduleTimes) {
                const row = [time];
                for (const day of allWeekdays) {
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
                columnStyles: { 0: { fontStyle: 'bold' } },
                 didParseCell: function (data) {
                    const entry = childSchedule.find(e => e.dayOfWeek === allWeekdays[data.column.index - 1] && e.startTime === (data.row.cells[0]?.text[0] || ''));
                    if (entry && entry.color) {
                       data.cell.styles.fillColor = entry.color;
                       data.cell.styles.textColor = '#FFFFFF';
                       data.cell.styles.fontStyle = 'bold';
                    }
                },
                didDrawPage: (data) => {
                    addHeader(doc, 'Agenda Escolar', child.name);
                    data.cursor.y = 30;
                }
            });
            isFirstPage = false;
        }
    }

    if (isFirstPage) {
        let title = "Relatório de Rotinas";
        if(options.includeMissions && !options.includeSchool) title = "Rotina Semanal de Missões";
        if(!options.includeMissions && options.includeSchool) title = "Agenda Escolar";

        addHeader(doc, title, familyName);
        doc.setFontSize(BODY_FONT_SIZE);
        doc.setTextColor(TEXT_COLOR_LIGHT);
        doc.text("Nenhuma rotina encontrada para os heróis neste contexto.", PAGE_MARGIN, 40);
    }
    
    addFooter(doc);
    const safeFamilyName = familyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`rotinas_mini_herois_${safeFamilyName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
