
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ChildProfile, MissionInstance, SchoolScheduleEntry, Weekday } from './types';
import { formatRecurrenceSummary } from './calendar-utils';
import { weekdayLabels } from './types';

// Função para adicionar o logo e o cabeçalho
function addHeader(doc: jsPDF, familyName: string) {
    // Logo (Simulado - você pode adicionar uma imagem base64 aqui)
    doc.setFont('Quicksand', 'bold');
    doc.setFontSize(24);
    doc.setTextColor('#7C3AED'); // Cor primária
    doc.text('Mini Herois', 20, 20);

    doc.setFont('Quicksand', 'normal');
    doc.setFontSize(16);
    doc.setTextColor('#333333');
    doc.text(`Rotina da Família ${familyName}`, 20, 30);
}

// Função para adicionar o rodapé
function addFooter(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor('#666666');

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const date = new Date().toLocaleDateString('pt-BR');
        doc.text(`Gerado em: ${date}`, 20, doc.internal.pageSize.height - 10);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    }
}

// Função principal de geração do PDF
export async function generateFamilyRoutinePDF(
    children: ChildProfile[],
    missions: MissionInstance[],
    schedule: SchoolScheduleEntry[],
    familyName: string
) {
    const doc = new jsPDF();

    // Registrar as fontes (necessário se não forem fontes padrão do PDF)
    // Para simplificar, vamos usar as fontes padrão, mas a estilização pode ser adicionada
    doc.setFont('Helvetica', 'normal');

    addHeader(doc, familyName);

    let startY = 40;

    // Seção de Missões
    doc.setFontSize(18);
    doc.setTextColor('#333333');
    doc.text('Rotina de Missões', 20, startY);
    startY += 10;

    children.forEach(child => {
        const childMissions = missions.filter(m => m.childId === child.id && m.status === 'pending');
        if (childMissions.length === 0) return;

        doc.setFontSize(14);
        doc.setTextColor('#555555');
        doc.text(`Herói: ${child.name}`, 20, startY);
        startY += 7;

        childMissions.forEach(mission => {
            if (startY > 270) {
                doc.addPage();
                startY = 20;
            }
            doc.setFontSize(12);
            doc.setFont('Helvetica', 'bold');
            doc.text(`- ${mission.title}`, 25, startY);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor('#666666');
            let missionDetails = `   Recorrência: ${formatRecurrenceSummary(mission)}\n`;
            missionDetails += `   Recompensa: ${mission.starsReward} ⭐ / ${mission.xpReward} XP`;
            if (mission.description) {
                 missionDetails += `\n   Descrição: ${mission.description}`;
            }

            const splitText = doc.splitTextToSize(missionDetails, 160);
            doc.text(splitText, 25, startY + 5);
            startY += doc.getTextDimensions(splitText).h + 8;
        });
        startY += 5;
    });

    // Seção da Rotina Escolar
    if (startY > 250) {
        doc.addPage();
        startY = 20;
    } else {
        startY += 10;
    }

    doc.setFontSize(18);
    doc.setTextColor('#333333');
    doc.text('Rotina Escolar', 20, startY);
    startY += 10;

    children.forEach(child => {
        const childSchedule = schedule.filter(s => s.childId === child.id);
        if (childSchedule.length === 0) return;
        
        if (startY > 250) {
          doc.addPage();
          startY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor('#555555');
        doc.text(`Herói: ${child.name}`, 20, startY);
        startY += 10;

        const scheduleByDay: { [key in Weekday]?: SchoolScheduleEntry[] } = {};
        childSchedule.forEach(entry => {
            if (!scheduleByDay[entry.dayOfWeek]) {
                scheduleByDay[entry.dayOfWeek] = [];
            }
            scheduleByDay[entry.dayOfWeek]!.push(entry);
        });
        
        const tableBody = Object.entries(weekdayLabels)
            .filter(([key]) => scheduleByDay[key as Weekday])
            .map(([key, { long }]) => {
                const entries = scheduleByDay[key as Weekday]!.sort((a, b) => a.startTime.localeCompare(b.startTime));
                const activities = entries.map(e => `${e.startTime} - ${e.endTime}: ${e.subject}`).join('\n');
                return [long, activities];
            });

        autoTable(doc, {
            head: [['Dia da Semana', 'Atividades']],
            body: tableBody,
            startY: startY,
            theme: 'striped',
            headStyles: { fillColor: [124, 58, 237] }, // Cor primária
            didDrawPage: (data) => {
                // Para garantir que o cabeçalho seja redesenhado em novas páginas da tabela
                addHeader(doc, familyName);
            }
        });

        startY = (doc as any).lastAutoTable.finalY + 15;
    });

    addFooter(doc);
    doc.save(`rotina_familia_${familyName.toLowerCase().replace(/\s/g, '_')}.pdf`);
}
