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
  } else {
    // TODO: validation level 0 is not supported yet
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

  spectral.run(myDocument).then((result) => {
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

    disableHostValidation(result);

    console.log("\n\u25A1 Validating " + fileName);
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
      console.log(table.toString());
    } else {
      console.log(chalk.green.bold("\nValidation Passed\n"));
    }
  });
};

// Function to disable host property validation
const disableHostValidation = (result) => {
  result.forEach((r) => {
    if (
      r.message ===
        '"host" property must match pattern "^[^{}/ :\\]+(?::d+)?$".' ||
      r.message == 'Property "host" is not expected to be here.'
    ) {
      result.splice(result.indexOf(r), 1);
    }
  });
};
