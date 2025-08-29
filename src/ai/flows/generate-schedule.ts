
'use server';

import type { OnboardingFormValues } from '@/components/dashboard/onboarding/OnboardingForm';
import { predefinedMissionGroups } from '@/lib/predefined-missions';
import type { ScheduleItem, Weekday, MissionCategory } from '@/lib/types';
import { addMinutes, format, subMinutes } from 'date-fns';
import { generateScheduleFlow } from './generate-schedule-flow';

// This file is now a wrapper or can be deprecated.
// For now, let's make it call the real flow.

export async function generateSchedule(input: OnboardingFormValues): Promise<{ schedule: ScheduleItem[] }> {
    const essentialRoutines = input.essentialRoutines || [];
    
    const extraActivitiesString = (input.extraActivities || [])
        .map(a => `${a.name} (${(a.days || []).join(', ')}) às ${a.time}`)
        .join('; ');

    const generateScheduleInput = {
        childName: input.name,
        childAge: new Date().getFullYear() - new Date(input.birthDate).getFullYear(),
        schoolShift: input.schoolShift,
        schoolStartTime: input.schoolShiftStart,
        schoolEndTime: input.schoolShiftEnd,
        wakeUpTime: input.wakeUpTime!,
        lunchTime: input.lunchTime!,
        dinnerTime: input.dinnerTime!,
        sleepTime: input.sleepTime!,
        extraActivities: extraActivitiesString,
        essentialRoutines: essentialRoutines,
    };
    
    // Call the actual Genkit flow
    const result = await generateScheduleFlow(generateScheduleInput);

    const scheduleWithDetails = result.schedule.map(item => {
        const details = predefinedMissionGroups.flatMap(g => g.items).find(i => i.title === item.activity);
        return {
            ...item,
            type: 'essential_routine', // All AI generated are essential for now
            category: details?.suggestedAppCategory || 'essential_routines',
            emoji: details?.emoji || '⭐',
        } as ScheduleItem;
    });

    return {
        schedule: scheduleWithDetails
    };
}
