## API Definition Validator

- npm package to validate Swagger definitions or OpenAPI definitions

You can validate API definition(s) using either validation level 1 or 2;
- **Validation level 1**: validate API definition(s) as in WSO2 API Manager 4.2.0 when Relaxed Validation enabled
- **Validation level 2**: validate API definition(s) as in WSO2 API Manager 4.2.0


For more information on this visit the blog post :
[Validating OpenAPI Definitions for WSO2 API Manager 4.2.0 with Swagger Linter 420](https://medium.com/@rusirij/validating-openapi-definitions-for-wso2-api-manager-4-2-0-with-swagger-linter-420-7a1e72f58bda)

## If you are building the source code and use this

Use Node version 16

Clone this repo and run the following commnds

`npm i`

`npm link`

Validate provided Swagger or OpenAPI definition

`swagger-linter_420 -f [path to API definition JSON or YAML] -l [validation level 1 or 2]`

or

Validate a directory of Swagger definitions and/or OpenAPI definitions

`swagger-linter_420 -d [path to directory with API definitions] -l [validation level 1 or 2]`

## If you are using npm package directly

(URL : https://www.npmjs.com/package/swagger-linter_420)

Open a terminal in your working directory. Follow the below steps using node version 16

- Install the npm package using the command ```npm i swagger-linter_420```
- Enter the following command

    ```npm link swagger-linter_420```
- Tryout the tool using the following commands providing appropriate values for file/directory path and validation level :

    i. If you are validating a single file :

        swagger-linter_420 -f [path to API definition JSON or YAML] -l [validation level 1 or 2]

    or

    ii. If you are validating a directory of openAPI files :

        swagger-linter_420 -d [path to directory with API definitions] -l [validation level 1 or 2]

## Release Notes

  - ### Version 1.0.7
    From version 1.0.7 onwards, you can use the following argument to export validation results into a CSV file: 
        
      `--format csv`

    ##### Usage Example 
    To run the tool and save the results in a CSV file, use the command format as follows :
            
          swagger-linter_420 -f [path to API definition JSON or YAML] -l [validation level 1 or 2] --format csv