import Table from "cli-table";
import chalk from "chalk";

// Function to disable host property validation
export const disableHostValidation = (result) => {
  return result.filter((r) => {
    return !(
      r.message ===
      '"host" property must match pattern "^[^{}/ :\\\\]+(?::\\d+)?$".'
    );
  });
};

// Function to disable basePath property validation
export const disableBasePathValidation = (result) => {
  return result.filter((r) => {
    return !(r.message === '"basePath" property must match pattern "^/".');
  });
};

// Function to disable validation errors based on path
export const disableErrorsBasedOnPath = (result, pathsToIgnore) => {
  const warnList = [];
  const resultList = result.filter((r) => {
    const shouldIgnore = pathsToIgnore.some((path) => {
      return r.path === path && r.code !== "oas3-schema";
    });
    return !shouldIgnore;
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
      return r.message === errorMessage && r.code !== "oas3-schema";
    });
    shouldIgnore ? warnList.push(r) : null;
    return !shouldIgnore;
  });
  return [resultList, warnList];
};

// Function to disable validation errors that end with any of the provided error messages
export const disableErrorsThatEndsWithProvidedMessage = (
  result,
  errorsToDisable
) => {
  const warnList = [];
  const resultList = result.filter((r) => {
    const shouldIgnore = errorsToDisable.some((errorMessage) => {
      return r.message.endsWith(errorMessage) && r.code !== "oas3-schema";
    });
    shouldIgnore ? warnList.push(r) : null;
    return !shouldIgnore;
  });
  return [resultList, warnList];
};

// Function to disable validation errors that start and end with any of the provided error messages
export const disableErrorsThatStartAndEndWithProvidedMessage = (
  result,
  errorsToDisable
) => {
  const warnList = [];
  const resultList = result.filter((r) => {
    const shouldIgnore = errorsToDisable.some(([startMessage, endMessage]) => {
      return (
        r.message.startsWith(startMessage) &&
        r.message.endsWith(endMessage) &&
        r.code !== "oas3-schema"
      );
    });
    shouldIgnore ? warnList.push(r) : null;
    return !shouldIgnore;
  });
  return [resultList, warnList];
};

// Function to disable validation errors that has any of the provided substrings in the error message
export const disableErrorsWithPartialErrorMessageMatch = (
  result,
  errorMessagesToDisable
) => {
  const warnList = [];
  const resultList = result.filter((r) => {
    const isErrorInErrorMessageToDisable = errorMessagesToDisable.some(
      (errorMessage) => {
        return r.message.includes(errorMessage) && r.code !== "oas3-schema";
      }
    );
    isErrorInErrorMessageToDisable ? warnList.push(r) : null;
    return !isErrorInErrorMessageToDisable;
  });
  return [resultList, warnList];
};

// Function to disable validation errors with rule code that matches with any element within rulesToDisable
export const disableErrorsBasedOnRuleCode = (result, rulesToDisable) => {
  const warnList = [];
  const resultList = result.filter((r) => {
    const isRuleCodeInRulesToDisable = rulesToDisable.some((ruleCode) => {
      return r.code === ruleCode && r.code !== "oas3-schema";
    });
    isRuleCodeInRulesToDisable ? warnList.push(r) : null;
    return !isRuleCodeInRulesToDisable;
  });
  return [resultList, warnList];
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
}
