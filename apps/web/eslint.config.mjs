import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import rootConfig from '../../eslint.config.mjs';

export default defineConfig([nextVitals, rootConfig]);
