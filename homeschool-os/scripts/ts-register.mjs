// Registers the type-stripping loader so scripts can import the same .ts
// modules the application uses, rather than a second copy of the parser.
import { register } from 'node:module';
register('./ts-loader.mjs', import.meta.url);
