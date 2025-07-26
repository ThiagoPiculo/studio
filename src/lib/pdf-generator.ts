
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ChildProfile, MissionInstance, SchoolScheduleEntry, Weekday } from './types';
import { formatRecurrenceSummary } from './calendar-utils';
import { weekdayLabels, allWeekdays } from './types';
import { getInitials } from './utils';
import { format } from 'date-fns';

// --- PDF Styling Constants ---
const PRIMARY_COLOR = '#7C3AED'; // Equivalent to hsl(250, 80%, 58%)
const TEXT_COLOR_DARK = '#333333';
const TEXT_COLOR_LIGHT = '#666666';
const HEADER_FONT_SIZE = 22;
const TITLE_FONT_SIZE = 16;
const SUBTITLE_FONT_SIZE = 14;
const BODY_FONT_SIZE = 10;
const PAGE_MARGIN = 20;

// --- Helper Functions ---

function addHeader(doc: jsPDF, familyName: string) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(HEADER_FONT_SIZE);
    doc.setTextColor(PRIMARY_COLOR);
    doc.text('Mini Herois', PAGE_MARGIN, 22);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(SUBTITLE_FONT_SIZE);
    doc.setTextColor(TEXT_COLOR_DARK);
    const title = `Relatório de Rotinas - Aliança ${familyName}`;
    doc.text(title, doc.internal.pageSize.width - PAGE_MARGIN, 22, { align: 'right' });
    
    // Add a line separator
    doc.setDrawColor(PRIMARY_COLOR);
    doc.setLineWidth(0.5);
    doc.line(PAGE_MARGIN, 28, doc.internal.pageSize.width - PAGE_MARGIN, 28);
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
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });
    
    let isFirstPage = true;

    for (const child of children) {
        const childMissions = missions.filter(m => m.childId === child.id && m.status === 'pending');
        const childSchedule = schedule.filter(s => s.childId === child.id);

        if (childMissions.length === 0 && childSchedule.length === 0) {
            continue; // Skip child if they have no routines
        }

        if (!isFirstPage) {
            doc.addPage();
        }
        
        // Add Header
        addHeader(doc, familyName);
        let startY = 40;

        // --- Child Header ---
        doc.setFontSize(TITLE_FONT_SIZE);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(TEXT_COLOR_DARK);
        doc.text(`Visão Geral do Herói: ${child.name}`, PAGE_MARGIN, startY);
        startY += 8;

        // --- Missions Section ---
        if (childMissions.length > 0) {
            doc.setFontSize(SUBTITLE_FONT_SIZE);
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(TEXT_COLOR_LIGHT);
            doc.text('Rotina de Missões', PAGE_MARGIN, startY);
            
            const missionBody = childMissions
                .sort((a,b) => a.title.localeCompare(b.title))
                .map(mission => ([
                    { content: mission.emoji ? `${mission.emoji} ${mission.title}` : mission.title },
                    { content: formatRecurrenceSummary(mission) },
                    { content: `${mission.starsReward} ★ / ${mission.xpReward} XP` },
                ]));
            
            autoTable(doc, {
                head: [['Missão', 'Recorrência', 'Recompensa']],
                body: missionBody,
                startY: startY + 2,
                theme: 'striped',
                headStyles: { fillColor: PRIMARY_COLOR },
                styles: { font: 'Helvetica', fontSize: BODY_FONT_SIZE },
                didDrawPage: (data) => {
                    addHeader(doc, familyName);
                    // Reset Y position for content on new page
                    data.cursor.y = 40;
                }
            });
            startY = (doc as any).lastAutoTable.finalY + 10;
        }

        // --- School Schedule Section ---
        if (childSchedule.length > 0) {
            if (startY > 250) { // Check if new section fits
                doc.addPage();
                addHeader(doc, familyName);
                startY = 40;
            }

            doc.setFontSize(SUBTITLE_FONT_SIZE);
            doc.setFont('Helvetica', 'bold');
            doc.setTextColor(TEXT_COLOR_LIGHT);
            doc.text('Rotina Escolar', PAGE_MARGIN, startY);

            const scheduleByDay: { [key in Weekday]?: SchoolScheduleEntry[] } = {};
            childSchedule.forEach(entry => {
                if (!scheduleByDay[entry.dayOfWeek]) {
                    scheduleByDay[entry.dayOfWeek] = [];
                }
                scheduleByDay[entry.dayOfWeek]!.push(entry);
            });
            
            const scheduleBody = allWeekdays
                .filter(day => scheduleByDay[day])
                .map(day => {
                    const entries = scheduleByDay[day]!.sort((a, b) => a.startTime.localeCompare(b.startTime));
                    const activities = entries.map(e => `${e.startTime} - ${e.endTime}: ${e.subject}`).join('\n');
                    return [weekdayLabels[day].long, activities];
                });

            autoTable(doc, {
                head: [['Dia da Semana', 'Aulas e Atividades']],
                body: scheduleBody,
                startY: startY + 2,
                theme: 'grid',
                headStyles: { fillColor: '#3B82F6' }, // A different color for distinction
                styles: { font: 'Helvetica', fontSize: BODY_FONT_SIZE },
                didDrawPage: (data) => {
                    addHeader(doc, familyName);
                    data.cursor.y = 40;
                }
            });
             startY = (doc as any).lastAutoTable.finalY + 10;
        }

        isFirstPage = false;
    }

    // Se nenhuma criança tiver rotinas, adicione uma página em branco com uma mensagem
    if (isFirstPage) {
        addHeader(doc, familyName);
        doc.setFontSize(BODY_FONT_SIZE);
        doc.setTextColor(TEXT_COLOR_LIGHT);
        doc.text("Nenhuma rotina de missão ou escolar encontrada para os heróis desta aliança.", PAGE_MARGIN, 50);
    }
    
    addFooter(doc);
    const safeFamilyName = familyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`rotina_mini_herois_${safeFamilyName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
