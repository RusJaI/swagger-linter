## API Definition Validator

- npm package to validate Swagger definitions or OpenAPI definitions

You can validate API definition(s) using either validation level 1 or 2;
- **Validation level 1**: validate API definition(s) as in WSO2 API Manager 4.2.0 when Relaxed Validation enabled
- **Validation level 2**: validate API definition(s) as in WSO2 API Manager 4.2.0

## Usage

Use Node version 16 

Clone this repo and run the following commnds

`npm i`

`npm link`

Validate provided Swagger or OpenAPI definition

`swagger-linter_420 -f [path to API definition JSON or YAML] -l [validation level 1 or 2]`

or

Validate a directory of Swagger definitions and/or OpenAPI definitions

`swagger-linter_420 -d [path to directory with API definitions] -l [validation level 1 or 2]`
