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
      result = disableHostValidation(result); // Supress host validation errors
      result = disableBasePathValidation(result); // Supress basePath validation errors
      
      // Supress required schema property missing validation errors
      result = disableErrorsThatEndsWithProvidedMessage(
        result,
        '" property must have required property "schema".'
      );

      // Supress required name property missing validation errors
      result = disableErrorsThatEndsWithProvidedMessage(
        result,
        '" property must have required property "name".'
      );
      
      // Supress property not expected to be present errors
      result = disableErrorsThatStartAndEndWithProvidedMessage(
        result,
        'Property "',
        '" is not expected to be here.'
      );

      // Supress required responses property missing validation errors for get, put and post methods
      const httpMethods = ["get", "put", "post"]
      httpMethods.forEach((method) => {
        result = disableErrorsThatMatchProvidedMessage(
          result,
          '"' + method + '" property must have required property "responses".'
        )
      });

      result = disableEmailValidation(result); // Supress email validation errors
      
      // Supress invalid security definitions validation errors
      result = disableErrorsThatMatchProvidedMessage(result, "Invalid security securityDefinitions.");
      // Supress required description property missing validation errors
      result = disableErrorsThatEndsWithProvidedMessage(result, '" property must have required property "description".');
      // Supress duplicate items related validation errors
      result = disableErrorsThatContainsProvidedMessage(
        result,
        '" property must not have duplicate items (items ##'
      );

      // Supress responses property related validation errors
      result = disableErrorsThatContainsProvidedMessage(result, '"responses" property must not be valid.');
      // Supress propterty value not equal to allowed values validation errors
      result = disableErrorsThatContainsProvidedMessage(result, '" property must be equal to one of the allowed values');
      // Supress schema property related errors
      result = disableErrorsThatMatchProvidedMessage(result, '"schema" property must have required property "type".');
    }

    console.log("\n\u25A1 Validating " + fileName + " using validation level " + validationLevel + " ...");
    if (result.length > 0) {
      console.log(chalk.red.bold("\nValidation Failed\n"));
      console.log(
        chalk.red.bold(result.length) +
          chalk.red(" error(s) found in the API definition\n")
      );

      // Output table format
      const table = new Table({
        head: ["Rule", "Path", "Error Message"],
        style: {
          head: ["cyan"],
          border: ["grey"],
        },
      });

      result.forEach((r) => table.push([r.code, r.path, r.message]));
      
      await new Promise(resolve => {
        console.log(table.toString());
        resolve();
      });
      return false;
    } else {
      console.log(chalk.green.bold("\nValidation Passed\n"));
      return true;
    }
  });
};

// Function to disable host property validation
const disableHostValidation = (result) => {
  return result.filter((r) => {
    return !(r.message === '"host" property must match pattern "^[^{}/ :\\\\]+(?::\\d+)?$".' ||
      r.message == 'Property "host" is not expected to be here.'
    );
  });
};

// Function to disable basePath property validation
const disableBasePathValidation = (result) => {
  return result.filter((r) => {
    return !(
      r.message ===
        '"basePath" property must match pattern "^/".' ||
      r.message == 'Property "basePath" is not expected to be here.'
    );
  });
}

// Function to disable email property validation
const disableEmailValidation = (result) => {
  return result.filter((r) => {
    return !(r.path === "info.contact.email");
  });
}

// Function to disable validation errors with the provided error message
const disableErrorsThatMatchProvidedMessage = (result, errorMessage) => {
  return result.filter((r) => {
    return !(r.message === errorMessage);
  });
}

// Function to disable validation errors that start with the provided error message
const disableErrorsThatStartsWithProvidedMessage = (result, errorMessage) => {
  return result.filter((r) => {
    return !(r.message.startsWith(errorMessage));
  });
}

// Function to disable validation errors that end with the provided error message
const disableErrorsThatEndsWithProvidedMessage = (result, errorMessage) => {
  return result.filter((r) => {
    return !(r.message.endsWith(errorMessage));
  });
}

// Function to disable validation errors that start and end with the provided error messages
const disableErrorsThatStartAndEndWithProvidedMessage = (result, startMessage, endMessage) => {
  return result.filter((r) => {
    return !(r.message.startsWith(startMessage) && r.message.endsWith(endMessage));
  });
}

// Function to disable validation errors that has the provided substring in the error message
const disableErrorsThatContainsProvidedMessage = (result, errorMessage) => {
  return result.filter((r) => {
    return !(r.message.includes(errorMessage));
  });
}
