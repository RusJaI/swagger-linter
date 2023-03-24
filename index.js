#!/usr/bin/env node

import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { Command } from 'commander';
import { bundleAndLoadRuleset } from "@stoplight/spectral-ruleset-bundler/with-loader";
import Parsers from "@stoplight/spectral-parsers";
import spectralCore from "@stoplight/spectral-core";
import Table from "cli-table";
import chalk from "chalk";
const { Spectral, Document } = spectralCore;
import spectralRuntime from "@stoplight/spectral-runtime";
const { fetch } = spectralRuntime;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Collect provided args
const program = new Command();
program
  .option("-f, --swaggerFile [value]", "path to Swagger or OpenAPI definition that needs to be validated")
  .parse(process.argv);

const {
    swaggerFile
} = program.opts();

// load API specification file that was provided as a command line argument
const apiDefinition = fs.readFileSync(swaggerFile, "utf-8");

const table = new Table({
    head: ["Path", "Error Message"],
    style: {
        head: ["cyan"],
        border: ["grey"]
    }
})

const myDocument = new Document(
  apiDefinition,
  Parsers.Yaml,
);

const spectral = new Spectral();
const rulesetFilepath = path.join(__dirname, ".spectral.yaml"); // load ruleset file from root directory
spectral.setRuleset(await bundleAndLoadRuleset(rulesetFilepath, { fs, fetch }));

spectral.run(myDocument).then(result => {
    // Iterate the results and select only those with severity of 0 (i.e. errors)
    result = result.filter(r => r.severity === 0);
    
    // Replace the path field with a string representation of the path
    result.forEach(r => r.path = r.path.join('.'));

    // Iterate over path field and if the same path is repeated fully or partially, retain the first occurrence and remove the rest
    result = result.filter((r, i, a) => a.findIndex(t => r.path.includes(t.path)) === i);

    // Remove code, severity and range fields from the result as those add no value to the output
    result.forEach(r => { delete r.code; delete r.severity; delete r.range; });

    if (result.length > 0) {
        console.log(chalk.red.bold("\nValidation Failed\n"));
        console.log(chalk.red.bold(result.length) + chalk.red(" error(s) found in the API definition\n"));
        result.forEach(r => table.push([r.path, r.message]));
        console.log(table.toString());
    } else {
        console.log(chalk.green.bold("\nValidation Passed\n"));
    }
});
