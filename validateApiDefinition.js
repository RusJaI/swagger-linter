import * as fs from "node:fs";
import { bundleAndLoadRuleset } from "@stoplight/spectral-ruleset-bundler/with-loader";
import Parsers from "@stoplight/spectral-parsers";
const { Spectral, Document } = spectralCore;
import spectralRuntime from "@stoplight/spectral-runtime";
import spectralCore from "@stoplight/spectral-core";
const { fetch } = spectralRuntime;
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import Table from "cli-table";
import chalk from "chalk";

let rulesetFilepath = "";

// Populate the ruleset file path depending on the validation level
async function populateRulesetFilepath(validationLevel) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  if (validationLevel == 1) {
    rulesetFilepath = path.join(__dirname, "/Rulesets/level1.spectral.yaml");
  } else if (validationLevel == 2) {
    rulesetFilepath = path.join(__dirname, "/Rulesets/level2.spectral.yaml");
  }
}

export const validateDefinition = async (apiDefinition, fileName, validationLevel) => {
  const myDocument = new Document(apiDefinition, Parsers.Yaml);

  // Load ruleset file depending on the validation level
  await populateRulesetFilepath(validationLevel);

  const spectral = new Spectral();
  spectral.setRuleset(
    await bundleAndLoadRuleset(rulesetFilepath, { fs, fetch })
  );

  return spectral.run(myDocument).then(async (result) => {
    let level1WarnList = [];

    // Iterate the results and select only those with severity of 0 (i.e. errors)
    result = result.filter((r) => r.severity === 0);

    // Replace the path field with a string representation of the path
    result.forEach((r) => (r.path = r.path.join(".")));

    // Iterate over path field and if the same path is repeated fully or partially,
    // retain the first occurrence and remove the rest
    result = result.filter(
      (r, i, a) => a.findIndex((t) => r.path.includes(t.path)) === i
    );

    // Remove code, severity and range fields from the result as those add no value to the output
    result.forEach((r) => {
      delete r.severity;
      delete r.range;
    });

    // If validation level is 1, only return linter errors that need to be fixed in order for the API definition to be accepted by APIM 4.0.0
    if (validationLevel === 1) {
      let warnList;

      // Disable validation errors based on rule code
      const rulesToDisable = [
        "oas2-discriminator",
        "operation-operationId-unique",
        "oas2-valid-schema-example",
        "oas3-valid-schema-example",
        "path-params",
        "openapi-tags-uniqueness",
      ];
      [result, warnList] = disableErrorsBasedOnRuleCode(result, rulesToDisable);
      level1WarnList = [...level1WarnList, ...warnList];

      // Disable validation errors based on start of error message
      const errorsToDisableWithStartAndEndMatch = [
        ['Property "', '" is not expected to be here.'], // Supress property not expected to be present errors
      ];
      [result, warnList] = disableErrorsThatStartAndEndWithProvidedMessage(result, errorsToDisableWithStartAndEndMatch);
      level1WarnList = [...level1WarnList, ...warnList];

      // Disable validation errors based on end of error message
      const errorsToDisable = [
        '" property must have required property "schema".', // Supress required schema property missing validation errors
        '" property must have required property "name".', // Supress required name property missing validation errors
        '" property must have required property "description".', // Supress required description property missing validation errors
      ];
      [result, warnList] = disableErrorsThatEndsWithProvidedMessage(result, errorsToDisable);
      level1WarnList = [...level1WarnList, ...warnList];

      // Disable validation errors based on full error message
      const errorMessages = [
        '"get" property must have required property "responses".', // Supress required responses property missing validation errors for get method
        '"put" property must have required property "responses".', // Supress required responses property missing validation errors for put method
        '"post" property must have required property "responses".', // Supress required responses property missing validation errors for post method
      ];
      [result, warnList] = disableErrorsThatMatchProvidedMessage(result, errorMessages);
      level1WarnList = [...level1WarnList, ...warnList];

      // Disbale validation errors that has partial match of the error message
      const errorMessagesToDisable = [
        '" property must not have duplicate items (items ##', // Supress duplicate items related validation errors
        '"responses" property must not be valid.', // Supress responses property related validation errors
        '" property must be equal to one of the allowed values', // Supress propterty value not equal to allowed values validation errors
        "Invalid security securityDefinitions.", // Supress invalid security definitions validation errors
        '"schema" property must have required property "type".', // Supress schema property related errors
      ];
      [result, warnList] = disableErrorsWithPartialErrorMessageMatch(result, errorMessagesToDisable);
      level1WarnList = [...level1WarnList, ...warnList];

      // Disable validation errors based on path
      const pathsToIgnore = [
        "info.contact.email", // Supress email validation errors
      ];
      [result, warnList] = disableErrorsBasedOnPath(result, pathsToIgnore);
      level1WarnList = [...level1WarnList, ...warnList];

      result = disableHostValidation(result); // Supress host validation errors
      result = disableBasePathValidation(result); // Supress basePath validation errors
    }

    console.log("\n\u25A1 Validating " + fileName + " using validation level " + validationLevel + " ...\n");
    if (result.length > 0) {
      // Output table format for Errors
      const table = new Table({
        head: ["Rule", "Path", "Error Message"],
        style: {
          head: ["cyan"],
          border: ["grey"],
        },
      });

      result.forEach((r) => table.push([r.code, r.path, r.message]));
      
      console.log(
        chalk.red.bold(result.length) +
        chalk.red(" error(s) found in the API definition\n")
      );

      await new Promise(resolve => {
        console.log(table.toString());
        resolve();
      });
      
      await logL1Warnings(validationLevel, level1WarnList);

      console.log(chalk.red.bold("\nValidation Failed\n"));

      return false;
    } else {
      await logL1Warnings(validationLevel, level1WarnList);
      console.log(chalk.green.bold("\nValidation Passed\n"));
      return true;
    }
  });
};

// Function to disable host property validation
const disableHostValidation = (result) => {
  return result.filter((r) => {
    return !(r.message === '"host" property must match pattern "^[^{}/ :\\\\]+(?::\\d+)?$".');
  });
};

// Function to disable basePath property validation
const disableBasePathValidation = (result) => {
  return result.filter((r) => {
    return !(r.message === '"basePath" property must match pattern "^/".');
  });
}

// Function to disable validation errors based on path
const disableErrorsBasedOnPath = (result, pathsToIgnore) => {
  const warnList = [];
  const resultList = result.filter((r) => {
    const shouldIgnore = pathsToIgnore.some((path) => {
      return r.path === path && r.code !== 'oas3-schema';
    });
    return !(shouldIgnore);
  });
  return [resultList, warnList];
}

// Function to disable validation errors with any of the provided error messages
const disableErrorsThatMatchProvidedMessage = (result, errorsToDisable) => {
  const warnList = [];
  const resultList = result.filter((r) => {
    const shouldIgnore = errorsToDisable.some((errorMessage) => {
      return r.message === errorMessage && r.code !== 'oas3-schema';
    });
    shouldIgnore ? warnList.push(r) : null;
    return !(shouldIgnore);
  });
  return [resultList, warnList];
}

// // Function to disable validation errors that start with any of the provided error messages
// const disableErrorsThatStartsWithProvidedMessage = (result, errorsToDisable) => {
//   const warnList = [];
//   const resultList = result.filter((r) => {
//     const shouldIgnore = errorsToDisable.some((errorMessage) => {
//       return r.message.startsWith(errorMessage);
//     });
//     shouldIgnore ? warnList.push(r) : null;
//     return !(shouldIgnore);
//   });
// }

// Function to disable validation errors that end with any of the provided error messages
const disableErrorsThatEndsWithProvidedMessage = (result, errorsToDisable) => {
  const warnList = [];
  const resultList = result.filter((r) => {
    const shouldIgnore = errorsToDisable.some((errorMessage) => {
      return r.message.endsWith(errorMessage) && r.code !== 'oas3-schema';
    });
    shouldIgnore ? warnList.push(r) : null;
    return !(shouldIgnore);
  });
  return [resultList, warnList];
}

// Function to disable validation errors that start and end with any of the provided error messages
const disableErrorsThatStartAndEndWithProvidedMessage = (result, errorsToDisable) => {
  const warnList = [];
  const resultList = result.filter((r) => {
    const shouldIgnore = errorsToDisable.some(([startMessage, endMessage]) => {
      return r.message.startsWith(startMessage) && r.message.endsWith(endMessage) && r.code !== 'oas3-schema';
    });
    shouldIgnore ? warnList.push(r) : null;
    return !(shouldIgnore);
  });
  return [resultList, warnList];
}

// Function to disable validation errors that has any of the provided substrings in the error message
const disableErrorsWithPartialErrorMessageMatch = (result, errorMessagesToDisable) => {
  const warnList = [];
  const resultList = result.filter((r) => {
    const isErrorInErrorMessageToDisable = errorMessagesToDisable.some((errorMessage) => {
      return r.message.includes(errorMessage) && r.code !== 'oas3-schema';
    });
    isErrorInErrorMessageToDisable ? warnList.push(r) : null;
    return !(isErrorInErrorMessageToDisable);
  });
  return [resultList, warnList];
}

// Function to disable validation errors with rule code that matches with any element within rulesToDisable
const disableErrorsBasedOnRuleCode = (result, rulesToDisable) => {
  const warnList = [];
  const resultList = result.filter((r) => {
    const isRuleCodeInRulesToDisable = rulesToDisable.some((ruleCode) => {
      return r.code === ruleCode && r.code !== 'oas3-schema';
    });
    isRuleCodeInRulesToDisable ? warnList.push(r) : null;
    return !isRuleCodeInRulesToDisable;
  });
  return [resultList, warnList];
}

// Function to log output of L1 warnings
const logL1Warnings = async (validationLevel, level1WarnList) => {
  if (validationLevel === 1 && level1WarnList.length > 0) {
    // Output table format for L1 Warnings
    const warnTable = new Table({
      head: ["Rule", "Path", "Error Message"],
      style: {
        head: ["cyan"],
        border: ["grey"],
      },
    })

    level1WarnList.forEach((r) => warnTable.push([r.code, r.path, r.message]));
  
    await new Promise(resolve => {
      console.log(chalk.yellowBright.bold("\n~ L1 Warnings ~"));
      console.log(chalk.yellowBright.bold(level1WarnList.length) + chalk.yellowBright(" warning(s) found in the API definition"));
      console.log("\n\u2757 The following warnings are not errors but are recommended to be fixed for better API definition quality.\n");
      console.log(warnTable.toString());
      resolve();
    });
  }
}
