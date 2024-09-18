import Table from "cli-table";
import chalk from "chalk";

// Function to disable host property validation
export const disableHostValidation = (result) => {
  const warnList = [];
  const resultList = result.filter((r) => {
    if (
      r.message ===
      '"host" property must match pattern "^[^{}/ :\\\\]+(?::\\d+)?$".'
    ) {
      r.message =
        r.message + ' You can retain this property by using the "x-" prefix.';
      warnList.push(r);
      return false;
    } else {
      return true;
    }
  });
  return [resultList, warnList];
};

// Function to disable basePath property validation
export const disableBasePathValidation = (result) => {
  const warnList = [];
  const resultList = result.filter((r) => {
    if (r.message === '"basePath" property must match pattern "^/".') {
      r.message =
        r.message + ' You can retain this property by using the "x-" prefix.';
      warnList.push(r);
      return false;
    } else {
      return true;
    }
  });
  return [resultList, warnList];
};

// Function to disable extraInfo property validation
export const disableExtraInfoValidation = (result) => {
  const warnList = [];
  const resultList = result.filter((r) => {
    if (
      r.message === 'Property "extraInfo" is not expected to be here.' &&
      r.code === "oas2-schema"
    ) {
      r.message =
        r.message + ' You can retain this property by using the "x-" prefix.';
      warnList.push(r);
      return false;
    } else {
      return true;
    }
  });
  return [resultList, warnList];
};

// Function to disable validation errors with any of the provided error messages
export const disableErrorsThatMatchProvidedMessage = (
  result,
  errorsToDisable
) => {
  const warnList = [];
  const resultList = result.filter((r) => {
    const shouldIgnore = errorsToDisable.some((errorMessage) => {
      return r.message === errorMessage;
    });
    shouldIgnore ? warnList.push(r) : null;
    return !shouldIgnore;
  });
  return [resultList, warnList];
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

// Function to log output of L1 warnings
export const logL1Warnings = async (validationLevel, level1WarnList) => {
  if (validationLevel === 1 && level1WarnList.length > 0) {
    // Output table format for L1 Warnings
    const warnTable = new Table({
      head: ["Rule", "Path", "Error Message"],
      style: {
        head: ["cyan"],
        border: ["grey"],
      },
    });

    level1WarnList.forEach((r) => warnTable.push([r.code, r.path, r.message]));

    await new Promise((resolve) => {
      console.log(chalk.yellowBright.bold("\n~ L1 Warnings ~"));
      console.log(
        chalk.yellowBright.bold(level1WarnList.length) +
        chalk.yellowBright(" warning(s) found in the API definition")
      );
      console.log(warnTable.toString());
      resolve();
    });
  }
};

// Function to log error ouptput
export const logErrorOutput = async (result) => {
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
  }
};

// Function to extract java client output if spectral linter shows no errors for an API definition that the java client identified as errorneous
export const extractJavaClientOutput = async (javaClientOutput) => {
  console.log(javaClientOutput);
};
