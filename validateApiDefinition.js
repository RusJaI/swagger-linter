import * as fs from "node:fs";
import os from 'os';
import { bundleAndLoadRuleset } from "@stoplight/spectral-ruleset-bundler/with-loader";
import Parsers from "@stoplight/spectral-parsers";
const { Spectral, Document } = spectralCore;
import spectralRuntime from "@stoplight/spectral-runtime";
import spectralCore from "@stoplight/spectral-core";
import { spawn } from "child_process";
const { fetch } = spectralRuntime;
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import chalk from "chalk";
import {
  disableHostValidation,
  disableBasePathValidation,
  disableExtraInfoValidation,
  logL1Warnings,
  logErrorOutput,
  extractJavaClientOutput,
  improveErrorMessages,
} from "./util.js";

let rulesetFilepath = "";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jarPath = path.join(__dirname, '/java-client/apim-swagger-validator-1.0.0.jar');

// Populate the ruleset file path depending on the validation level
async function populateRulesetFilepath(validationLevel) {
  if (validationLevel == 1) {
    rulesetFilepath = path.join(__dirname, "/Rulesets/level1.spectral.yaml");
  } else if (validationLevel == 2) {
    rulesetFilepath = path.join(__dirname, "/Rulesets/level2.spectral.yaml");
  }
}

export const validateDefinition = async (apiDefinition, fileName, validationLevel, pathToDefinitionForJavaClient = fileName) => {

  // Run the spectral linter validation
  const myDocument = new Document(apiDefinition, Parsers.Yaml);

  // Load ruleset file depending on the validation level
  await populateRulesetFilepath(validationLevel);

  const spectral = new Spectral();
  spectral.setRuleset(
    await bundleAndLoadRuleset(rulesetFilepath, { fs, fetch })
  );

  if (validationLevel === 1) {
    return spectral.run(myDocument).then(async (result) => {
      let level1WarnList = [];
  
      // Run the Java client to validate the API definition
      const pathToDef = 'location:' + pathToDefinitionForJavaClient;
      const validationLevelForJavaClient = 1;
      const javaArgs = ['-jar', jarPath, pathToDef, validationLevelForJavaClient];
  
      const tempFileName = `output-${Date.now()}.txt`; // Generate a unique temporary file name
      const tempFilePath = path.join(os.tmpdir(), tempFileName);
      const writeStream = fs.createWriteStream(tempFilePath);
  
      const jarProcess = spawn('java', javaArgs);
      jarProcess.stdout.pipe(writeStream);
      jarProcess.stderr.on('data', (data) => {
        console.error(data.toString());
      });
  
      const javaClientOutput = await new Promise((resolve, reject) => {
        jarProcess.on('close', () => {
          const javaClientStdout = fs.readFileSync(tempFilePath, 'utf8'); // Read the contents of the temporary file
  
          // Analyse java client output to check whether the provided API definition is accepted by APIM 4.0.0
          let isValid;
          const regex = /Total Successful Files Count (\d+)/;
          const match = javaClientStdout.match(regex);
          if (match) {
            const successfulFileCount = parseInt(match[1], 10);
            successfulFileCount === 1 ? (isValid = true) : (isValid = false);
            fs.unlinkSync(tempFilePath); // Delete the temporary file
            resolve([isValid, javaClientStdout]);
          } else {
            console.log(`Failed to get the successful file count from the java client output`);
            reject(new Error('Invalid Java client output'));
          }
        });
      });
  
      const [isValid, javaClientStdout] = await javaClientOutput;
  
      console.log("\n\u25A1 Validating " + fileName + " using validation level " + validationLevel + " ...\n");
  
      // Iterate the results and select only those with severity of 0 (i.e. errors)
      result = result.filter((r) => r.severity === 0);
  
      // Replace the path field with a string representation of the path
      result.forEach((r) => (r.path = r.path.join(".")));
  
      // Remove code, severity and range fields from the result as those add no value to the output
      result.forEach((r) => {
        delete r.severity;
        delete r.range;
      });
  
      let warnList;

      // Supress host validation errors
      [result, warnList] = disableHostValidation(result);
      level1WarnList = [...level1WarnList, ...warnList];

      // Supress basePath validation errors
      [result, warnList] = disableBasePathValidation(result);
      level1WarnList = [...level1WarnList, ...warnList];

      // Supress extra extraInfo errors
      [result, warnList] = disableExtraInfoValidation(result);
      level1WarnList = [...level1WarnList, ...warnList];

      improveErrorMessages(result);
  
      if (isValid) {
        if (result.length > 0 || level1WarnList.length > 0) {
          console.log(
            "\u2757 Validation passed with the below-listed errors, using may lead to functionality issues. API Manager 4.0.0 will " +
            chalk.green("ACCEPT") + " this API definition.\n"
          );
        }
  
        await logErrorOutput(result);
        await logL1Warnings(validationLevel, level1WarnList);
  
        console.log(chalk.green.bold("\nValidation Passed\n"));
      } else {
        console.log("\u2757 Validation failed with the below-listed errors. API Manager 4.0.0 will " +
        chalk.red("NOT ACCEPT") + " this API definition.\n");
  
        if (result.length > 0 || level1WarnList.length > 0) {
          await logErrorOutput(result);
          await logL1Warnings(validationLevel, level1WarnList);
        } else {
          extractJavaClientOutput(javaClientStdout)
        }
  
        console.log(chalk.red.bold("\nValidation Failed\n"));
      }
      return isValid;
    });
  } else {
    return spectral.run(myDocument).then(async (result) => {
      console.log("\n\u25A1 Validating " + fileName + " using validation level " + validationLevel + " ...\n");
      // Iterate the results and select only those with severity of 0 (i.e. errors)
      result = result.filter((r) => r.severity === 0);

      // Replace the path field with a string representation of the path
      result.forEach((r) => (r.path = r.path.join(".")));
  
      // Remove code, severity and range fields from the result as those add no value to the output
      result.forEach((r) => {
        delete r.severity;
        delete r.range;
      });

      improveErrorMessages(result);
      
      if (result.length > 0) {
        await logErrorOutput(result);
        console.log(chalk.red.bold("\nValidation Failed\n"));
        return false;
      } else {
        console.log(chalk.green.bold("\nValidation Passed\n"));
        return true;
      }
    });
  }
};
