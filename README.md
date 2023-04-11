## API Definition Validator

- npm package to validate Swagger definitions or OpenAPI definitions

You can validate API definition(s) using either validation level 1 or 2;
- **Validation level 1**: validate API definition(s) as in WSO2 API Manager 4.0.0
- **Validation level 2**: Fully validate API definition(s)

## Usage

Clone this repo and run the following commnds

`npm i`

`npm link`

Validate provided Swagger or OpenAPI definition

`swagger-linter -f [path to API definition JSON or YAML] -l [validation level 1 or 2]`

or

Validate a directory of Swagger definitions and/or OpenAPI definitions

`swagger-linter -d [path to directory with API definitions] -l [validation level 1 or 2]`

#### Ignored validation rules for level 1

- host (oas2-schema): "host" property must match pattern "^[^{}/ :\\]+(?::\d+)?$".
- basePath (oas2-schema): "basePath" property must match pattern "^/".
- extraInfo (oas2-schema): Property "extraInfo" is not expected to be here.
