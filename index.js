#!/usr/bin/env node

import * as fs from "node:fs";
import { Command } from 'commander';
import chalk from "chalk";
import { validateDefinition } from './validateApiDefinition.js';


// Collect provided args
const program = new Command();
program
  .option(
    "-f, --swaggerFile [value]",
    "Path to Swagger or OpenAPI definition that needs to be validated"
  )
  .option(
    "-d, --swaggerDirectory [value]",
    "Path to the directory that contains the Swagger or OpenAPI definitions that need to be validated"
  )
  .option(
    "-l, --validationLevel [value]",
    "Validation level: 1 or 2 (default is 2)\n\t\t\t\t \
    1 - validate as in WSO2 API Manager 4.0.0\n\t\t\t\t \
    2 - validation enabled"
  )
  .parse(process.argv);

const {
    swaggerFile = "",
    swaggerDirectory = "",
    validationLevel = 2
} = program.opts();

// Check if the validation level is valid
const level = parseInt(validationLevel);
if (level !== 1 && level !== 2) {
    console.error(chalk.red.bold("Error: ") + "Invalid validation level detected. Provided validation level: " + level + " (Should be either 1 or 2)");
    process.exit(1);
}

if (swaggerFile !== "" && swaggerDirectory === "") {
    // Load API specification file that was provided as a command line argument
    try {
        let apiDefinition = fs.readFileSync(swaggerFile, "utf-8");
        validateDefinition(apiDefinition, swaggerFile, level);
    } catch (err) {
        if (err.code === "ENOENT") {
            console.error(chalk.red.bold("Error: ") + "File not found: " + swaggerFile);
        } else {
            console.error(chalk.red.bold("Error: ") + "Unable to read file: " + swaggerFile);
        }
        process.exit(1);
    }
} else if (swaggerDirectory !== "" && swaggerFile === "") {
    // Load API specification files that are present in the directory that was provided as a command line argument
    fs.readdir(swaggerDirectory, (err, files) => {
        if (err) {
            if (err.code === "ENOENT") {
                console.error(chalk.red.bold("Error: ") + "Directory not found: " + swaggerDirectory);
            } else {
                console.error(chalk.red.bold("Error: ") + "Unable to read directory: " + swaggerDirectory);
            }
            process.exit(1);
        } else {
            files.forEach((file) => {
                if (file.endsWith(".yaml") || file.endsWith(".yml") || file.endsWith(".json")) {
                    // Read the contents of the file
                    fs.readFile(swaggerDirectory + '/' + file, 'utf8', (err, data) => {
                        if (err) {
                            console.error(chalk.red.bold("Error: ") + "Unable to read file: " + file);
                            process.exit(1);
                        }
                        validateDefinition(data, file, level);
                    });
                }
            });
        }
    });
} else if (swaggerDirectory !== "" && swaggerFile !== "") {
    console.error(chalk.yellow("Warn: ") + "Please provide either a swagger file (-f) or a directory (-d)");
    process.exit(1);
} else {
    console.error(chalk.red.bold("Error: ") + "No API definition/directory provided to validate");
    process.exit(1);
}
