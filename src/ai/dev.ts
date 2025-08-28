import { config } from 'dotenv';
config();

// Flows are imported here to be registered with Genkit
import './flows/generate-schedule-flow';
import './flows/generate-image-flow';
