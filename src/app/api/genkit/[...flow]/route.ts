'use server';
/**
 * @fileoverview This file is the entrypoint for Genkit actions.
 */

import { genkitNext } from '@genkit-ai/next';
import '@/ai/actions/generate-schedule';
import '@/ai/flows/generate-image-flow';


export const { POST } = genkitNext();
