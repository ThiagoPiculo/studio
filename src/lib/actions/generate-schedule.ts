
'use server';

import type { OnboardingFormValues } from '@/components/dashboard/onboarding/OnboardingForm';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem, Weekday, MissionCategory } from '@/lib/types';
import { addMinutes, format, subMinutes } from 'date-fns';

// Helper para converter "HH:mm" para minutos desde o início do dia
const parseTime = (time: string): number => {
  if (!time || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

// Helper para converter minutos para "HH:mm"
const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
    const mins = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${mins}`;
}

const findMissionDetails = (title: string) => {
  return predefinedMissionGroups.flatMap(g => g.items).find(i => i.title === title);
};

export async function generateSchedule(input: OnboardingFormValues): Promise<{ schedule: ScheduleItem[] }> {
  const finalSchedule: ScheduleItem[] = [];
  const occupiedSlots: { start: number; end: number; activity: string }[] = [];
  const weekdays: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];
  const MIN_FREE_TIME_SLOT = 30;

  // Helper para adicionar um item à agenda e marcar o slot como ocupado
  const addAndOccupy = (item: Omit<ScheduleItem, 'type' | 'category' | 'emoji'>, type: ScheduleItem['type'], category: MissionCategory, emoji: string) => {
      finalSchedule.push({ ...item, type, category, emoji });
      if (item.startTime && item.endTime && item.days) {
          item.days.forEach(day => {
              occupiedSlots.push({ start: parseTime(item.startTime!), end: parseTime(item.endTime!), activity: item.activity });
          });
      }
  };

  // --- LÓGICA PARA TURNO DA TARDE ---
  if (input.schoolShift === 'afternoon' && input.schoolShiftStart && input.schoolShiftEnd) {
    const schoolStartMinutes = parseTime(input.schoolShiftStart);
    const schoolEndMinutes = parseTime(input.schoolShiftEnd);

    // 1. ANCHORS
    const wakeUpTime = formatTime(subMinutes(new Date(`1970-01-01T${input.schoolShiftStart}`), 300).getTime() / 60000);
    const lunchTime = formatTime(subMinutes(new Date(`1970-01-01T${input.schoolShiftStart}`), 45).getTime() / 60000);
    const dinnerTime = formatTime(addMinutes(new Date(`1970-01-01T${input.schoolShiftEnd}`), 30).getTime() / 60000);
    const sleepTime = formatTime(addMinutes(new Date(`1970-01-01T${input.schoolShiftEnd}`), 270).getTime() / 60000);

    // 2. FIXED SLOTS (Escola e Atividades Extras)
    addAndOccupy({ activity: 'Escola', startTime: input.schoolShiftStart, endTime: input.schoolShiftEnd, days: weekdays }, 'school_entry', 'school', '🏫');
    
    (input.extraActivities || []).forEach(activity => {
      const details = findMissionDetails(activity.name);
      if (details) {
        addAndOccupy({
          activity: activity.name,
          startTime: activity.time,
          endTime: formatTime(parseTime(activity.time) + 60),
          days: activity.days as Weekday[],
        }, 'extra_activity', details.suggestedAppCategory, details.emoji);
      }
    });

    // Adiciona horários de tela se definidos
    if (input.screenTimeBefore) {
        const details = findMissionDetails('Hora livre para brincar'); // Using a generic one
        if (details) addAndOccupy({ activity: 'Tempo de Tela', startTime: input.screenTimeBefore, endTime: formatTime(parseTime(input.screenTimeBefore) + 60), days: weekdays }, 'essential_routine', 'hobbies', '📱');
    }
    if (input.screenTimeAfter) {
        const details = findMissionDetails('Hora livre para brincar');
        if (details) addAndOccupy({ activity: 'Tempo de Tela', startTime: input.screenTimeAfter, endTime: formatTime(parseTime(input.screenTimeAfter) + 60), days: weekdays }, 'essential_routine', 'hobbies', '📱');
    }


    // 3. ROUTINE SLOTS
    const routineRules = [
      { title: 'Hora de acordar', startTime: wakeUpTime, duration: 10 },
      { title: 'Arrumar a cama', startTime: formatTime(parseTime(wakeUpTime) + 10), duration: 5 },
      { title: 'Tomar café da manhã', startTime: formatTime(parseTime(wakeUpTime) + 15), duration: 15 },
      { title: 'Escovar os dentes (após acordar)', startTime: formatTime(parseTime(wakeUpTime) + 30), duration: 5 },
      { title: 'Fazer a lição de casa', startTime: '09:00', duration: 55 },
      { title: 'Organizar a mochila para amanhã', startTime: '09:55', duration: 5 },
      { title: 'Tomar banho', startTime: '12:00', duration: 15 },
      { title: 'Almoçar', startTime: lunchTime, duration: 20 },
      { title: 'Escovar os dentes (após almoço)', startTime: formatTime(parseTime(lunchTime) + 20), duration: 5 },
      { title: 'Sair para escola', startTime: formatTime(schoolStartMinutes - 20), duration: 20 },
      { title: 'Jantar', startTime: dinnerTime, duration: 15 },
      { title: 'Escovar os dentes (após jantar)', startTime: formatTime(parseTime(dinnerTime) + 15), duration: 5 },
      { title: 'Hora de dormir', startTime: sleepTime, duration: 20 },
    ];

    routineRules.forEach(rule => {
      const details = findMissionDetails(rule.title);
      if (details && (input.essentialRoutines || []).includes(rule.title)) {
        addAndOccupy({
          activity: rule.title,
          startTime: rule.startTime,
          endTime: formatTime(parseTime(rule.startTime) + rule.duration),
          days: weekdays,
        }, 'essential_routine', details.suggestedAppCategory, details.emoji);
      }
    });
    
    // 4. PREENCHER ESPAÇOS VAZIOS
    const sortedSlots = occupiedSlots.sort((a, b) => a.start - b.start);
    const dayStart = parseTime('08:00'); 
    const dayEnd = parseTime('22:00');
    let lastEnd = dayStart;

    sortedSlots.forEach(slot => {
        const freeTimeStart = lastEnd;
        const freeTimeEnd = slot.start;
        const duration = freeTimeEnd - freeTimeStart;

        if (duration >= MIN_FREE_TIME_SLOT) { 
            const details = findMissionDetails('Hora livre para brincar');
            if (details) {
                addAndOccupy({
                    activity: 'Hora livre para brincar',
                    startTime: formatTime(freeTimeStart),
                    endTime: formatTime(freeTimeEnd),
                    days: weekdays,
                }, 'essential_routine', details.suggestedAppCategory, details.emoji);
            }
        }
        lastEnd = Math.max(lastEnd, slot.end);
    });

    if (dayEnd > lastEnd) {
         const duration = dayEnd - lastEnd;
         if (duration >= MIN_FREE_TIME_SLOT) {
            const details = findMissionDetails('Hora livre para brincar');
            if (details) {
                addAndOccupy({
                    activity: 'Hora livre para brincar',
                    startTime: formatTime(lastEnd),
                    endTime: formatTime(dayEnd),
                    days: weekdays,
                }, 'essential_routine', details.suggestedAppCategory, details.emoji);
            }
         }
    }


  } else if (input.schoolShift) {
      throw new Error(`O modo de geração de rotina para o turno "${input.schoolShift}" ainda está em desenvolvimento. Por favor, tente o turno da tarde.`);
  }

  return {
    schedule: finalSchedule,
  };
}
