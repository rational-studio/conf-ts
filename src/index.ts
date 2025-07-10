import { program } from "commander";
import { compile } from "./compiler";

program
  .version("0.0.1")
  .description("A TypeScript to JSON/YAML compiler")
  .option("-f, --format <format>", "Output format (json or yaml)", "json")
  .option("--loose", "Enable loose mode for type casting", false)
  .argument("<inputFiles...>", "Input TypeScript files")
  .action((inputFiles, options) => {
    const output = compile(inputFiles, options.format, options.loose);
    process.stdout.write(output);
  });

program.parse(process.argv);
