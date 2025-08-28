'use server';
/**
 * @fileoverview This file is the entrypoint for Genkit actions.
 */

import { genkitNext } from '@genkit-ai/next';
import '@/ai/flows/generate-image-flow';
import '@/ai/flows/generate-schedule';

export const { POST } = genkitNext();
