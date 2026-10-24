import { z } from 'zod';

// Fallback messages in Spanish (e.g. a wrong type sent to the API). Schemas still set their
// own friendlier messages; this only covers what they do not.
z.config(z.locales.es());
