import { program } from 'commander';

import { compile } from './compiler';

program
  .version('0.0.1')
  .description('A TypeScript to JSON/YAML compiler')
  .option('-f, --format <format>', 'Output format (json or yaml)', 'json')
  .option('--macro', 'Enable macro mode for type casting', false)
  .argument('<inputFiles...>', 'Input TypeScript files')
  .action((inputFiles, options) => {
    const output = compile(inputFiles, options.format, options.macro);
    process.stdout.write(output);
  });

program.parse(process.argv);
