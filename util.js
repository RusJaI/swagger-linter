import fs from "fs";
import Table from "cli-table";
import chalk from "chalk";
import path from "path";
import { AsyncParser } from "@json2csv/node"; // Updated to use the new `@json2csv` library

// Define a file to store the output
const OUTPUT_FILE = "output.csv";

//Define global variable to manage the file write
let fileExists = fs.existsSync(OUTPUT_FILE);

// Function to initialize or append to the CSV file
export const writeToCsv = async (fileName, data) => {

  const csvData = data.map((row) => ({
    fileName,
    Rule: row.code || "",
    Path: row.path || "",
    ErrorMessage: row.message || row.ErrorMessage || "",
  }));

  const opts = { header: !fileExists }; // Add headers only if the file doesn't exist
  const asyncParser = new AsyncParser(opts);

  try {
    // Generate the CSV string
    const csv = await asyncParser.parse(csvData).promise();

    if (fileExists) {
      // Append without headers
      fs.appendFileSync(OUTPUT_FILE, "\n" + csv);
    } else {
      // Write with headers
      fs.writeFileSync(OUTPUT_FILE, csv);
      fileExists = fs.existsSync(OUTPUT_FILE);
    }
  } catch (err) {
    console.error("Error generating CSV:", err);
  }
};

// Function to improve error messages to reflect that "x-" prefix can be used to retain properties
export const improveErrorMessages = (result) => {
  result.forEach((r) => {
    if (
      r.message === 'Property "host" is not expected to be here.' ||
      r.message === 'Property "basePath" is not expected to be here.' ||
      r.message === 'Property "extraInfo" is not expected to be here.'
    ) {
      r.message =
        r.message + ' You can retain this property by using the "x-" prefix.';
    }
  });
  return result;
};

// Function to log error output
export const logErrorOutput = async (result, fileName, format) => {
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

    await new Promise((resolve) => {
      console.log(table.toString());
      resolve();
    });
    if (format === "csv")
      await writeToCsv(fileName, result);
  }
};

// Function to extract Java client output if the spectral linter shows no errors
export const extractJavaClientOutput = async (javaClientOutput, fileName, format) => {
  console.log(javaClientOutput);
  // Convert to a CSV-compatible structure
  const result = javaClientOutput.split("\n").map((line) => {
    const [id, ...errorMessage] = line.split(/\s+/);
    return { code: id, message: errorMessage.join(" "), path: "" };
  });

  // Write to CSV
  if (format === "csv")
    await writeToCsv(fileName, result);
};
