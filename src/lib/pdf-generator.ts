
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ChildProfile, MissionInstance, SchoolScheduleEntry, Weekday } from './types';
import { weekdayLabels, allWeekdays } from './types';
import { getDayToWeekday, isMissionScheduledForDate, parseTime } from './calendar-utils';
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
    doc.setFontSize(8);
    doc.setTextColor(TEXT_COLOR_LIGHT);

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const date = new Date().toLocaleDateString('pt-BR');
        doc.text(`Gerado em: ${date}`, PAGE_MARGIN, doc.internal.pageSize.height - 10);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - PAGE_MARGIN, doc.internal.pageSize.height - 10, { align: 'right' });
    }
}

// --- Main PDF Generation Function ---

export async function generateFamilyRoutinePDF(
    children: ChildProfile[],
    missions: MissionInstance[],
    schedule: SchoolScheduleEntry[],
    familyName: string
) {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });
    
    let isFirstPage = true;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    for (const child of children) {
        const childMissions = missions.filter(m => m.childId === child.id && m.status === 'pending');
        const childSchedule = schedule.filter(s => s.childId === child.id);

        if (childMissions.length === 0 && childSchedule.length === 0) {
            continue;
        }

        // --- Missions Page ---
        if (childMissions.length > 0) {
            if (!isFirstPage) doc.addPage('a4', 'landscape');
            addHeader(doc, 'Rotina Semanal de Missões', child.name);
            
            const missionColumns = ['Horário', ...allWeekdays.map(day => weekdayLabels[day].long)];
            const missionRows = [];
            const timeSlots = new Set<string>();

            childMissions.forEach(m => {
                const date = m.isRecurring ? m.startDate?.toDate() : m.dueDate?.toDate();
                if(date) timeSlots.add(format(date, 'HH:mm'));
            });

            const sortedTimeSlots = Array.from(timeSlots).sort();
            
            for(const time of sortedTimeSlots){
                const row: (string | { content: string, styles: { fontStyle: 'bold' } })[] = [{ content: time, styles: { fontStyle: 'bold' } }];
                 for(const day of daysOfWeek){
                    const dayKey = getDayToWeekday[day.getDay()];
                    const missionsForSlot = childMissions.filter(m => {
                        const missionDate = m.isRecurring ? m.startDate?.toDate() : m.dueDate?.toDate();
                        return missionDate && format(missionDate, 'HH:mm') === time && isMissionScheduledForDate(m, day);
                    });
                    row.push(missionsForSlot.map(m => `${m.emoji || '🎯'} ${m.title}`).join('\n'));
                 }
                 missionRows.push(row);
            }

            autoTable(doc, {
                head: [missionColumns],
                body: missionRows,
                startY: 30,
                theme: 'grid',
                headStyles: { fillColor: PRIMARY_COLOR, textColor: '#FFFFFF', fontStyle: 'bold', halign: 'center', font: 'Helvetica' },
                styles: { font: 'Helvetica', fontSize: BODY_FONT_SIZE, cellPadding: 2, valign: 'middle' },
                columnStyles: { 0: { fontStyle: 'bold', halign: 'center' } },
                didDrawPage: (data) => {
                    addHeader(doc, 'Rotina Semanal de Missões', child.name);
                    data.cursor.y = 30;
                }
            });
            isFirstPage = false;
        }

        // --- School Schedule Page ---
        if (childSchedule.length > 0) {
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
                styles: { font: 'Helvetica', fontSize: BODY_FONT_SIZE, cellPadding: 2, valign: 'middle', minCellHeight: 15 },
                columnStyles: { 0: { fontStyle: 'bold', halign: 'center' } },
                 didParseCell: function (data) {
                    const entry = childSchedule.find(e => e.dayOfWeek === allWeekdays[data.column.index - 1] && e.startTime === data.row.cells[0].text[0]);
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
        addHeader(doc, 'Relatório de Rotinas', familyName);
        doc.setFontSize(BODY_FONT_SIZE);
        doc.setTextColor(TEXT_COLOR_LIGHT);
        doc.text("Nenhuma rotina de missão ou escolar encontrada para os heróis desta aliança.", PAGE_MARGIN, 40);
    }
    
    addFooter(doc);
    const safeFamilyName = familyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`rotinas_mini_herois_${safeFamilyName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
