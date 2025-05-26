import { config } from 'dotenv';
config();

import '@/ai/flows/answer-questions.ts';
import '@/ai/flows/streaming-responses.ts';
import '@/ai/flows/generate-profile.ts';
// import '@/ai/flows/generate-logo-image.ts'; // Removed as it's no longer needed
