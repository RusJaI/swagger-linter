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
    "Validation level: relaxed, linter or apim (default is apim)\n\t\t\t\t \
    relaxed - validate only verify whether the swagger/openAPI definition is returned by the validator\n\t\t\t\t \
    linter - validate as per spectral linter rules used in API Manager 4.2.0\n\t\t\t\t \
    apim - validate as in WSO2 API Manager 4.2.0"
  )
  .parse(process.argv);

const {
    swaggerFile = "",
    swaggerDirectory = "",
    validationLevel = "apim"
} = program.opts();

// Check if the validation level is valid
const level = validationLevel;
if (level !== "relaxed".toLowerCase() && level !== "linter".toLowerCase() && level !== "apim".toLowerCase()) {
    console.error(chalk.red.bold("Error: ") + "Invalid validation level detected. Provided validation level: " + level + " (Should be relaxed, linter or apim)");
    process.exit(1);
}

if (swaggerFile !== "" && swaggerDirectory === "") {
    // Load API specification file that was provided as a command line argument
    try {
        let apiDefinition = fs.readFileSync(swaggerFile, "utf-8");
        validateDefinition(apiDefinition, swaggerFile, level.toLowerCase());
    } catch (err) {
        if (err.code === "ENOENT") {
            console.error(chalk.red.bold("Error: ") + "File not found: " + swaggerFile);
        } else {
            console.error(chalk.red.bold("Error: ") + "Unable to read file: " + swaggerFile);
        }
        process.exit(1);
    }
} else if (swaggerDirectory !== "" && swaggerFile === "") {
    let validFileCount = 0;
    let invalidFileCount = 0;

    const dirReads = [];
    const dirReadPromise = new Promise((resolve, reject) => {
        // Load API specification files that are present in the directory that was provided as a command line argument
        fs.readdir(swaggerDirectory, async (err, files) => {
            if (err) {
                if (err.code === "ENOENT") {
                    console.error(chalk.red.bold("Error: ") + "Directory not found: " + swaggerDirectory);
                } else {
                    console.error(chalk.red.bold("Error: ") + "Unable to read directory: " + swaggerDirectory);
                }
                reject(err);
            }
            const fileReads = [];
            for (const file of files) {
                if (file.endsWith(".yaml") || file.endsWith(".yml") || file.endsWith(".json")) {
                    const fileReadPromise = new Promise((resolve, reject) => {
                        fs.readFile(swaggerDirectory + '/' + file, 'utf8', async (err, data) => {
                            if (err) {
                                console.error(chalk.red.bold("Error: ") + "Unable to read file: " + file);
                                reject(err);
                            }
                            const pathToDefinitionForJavaClient = swaggerDirectory + '/' + file;      
                            const isDefinitionValid = await validateDefinition(data, file, level.toLowerCase(), pathToDefinitionForJavaClient);
                            if (isDefinitionValid) {
                                validFileCount++;
                            } else {
                                invalidFileCount++;
                            }
                            resolve();
                        });
                    });
                    fileReads.push(fileReadPromise);
                }
            }
            await Promise.all(fileReads);
            resolve();
        });
    });
    dirReads.push(dirReadPromise);
    await Promise.all(dirReads);

    console.log(chalk.bgCyan.bold("\n~ SUMMARY ~\n"));
    console.log(chalk.cyan.bold("Total File Count: ") + (validFileCount + invalidFileCount));
    console.log(chalk.cyan.bold("Valid API Definitions: ") + validFileCount);
    console.log(chalk.cyan.bold("Invalid API Definitions: ") + invalidFileCount + "\n");

} else if (swaggerDirectory !== "" && swaggerFile !== "") {
    console.error(chalk.yellow("Warn: ") + "Please provide either a swagger file (-f) or a directory (-d)");
    process.exit(1);
} else {
    console.error(chalk.red.bold("Error: ") + "No API definition/directory provided to validate");
    process.exit(1);
}
