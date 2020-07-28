# OData(V4) Server

[![npm (scoped)](https://img.shields.io/npm/v/@odata/server?label=@odata/server)](https://www.npmjs.com/package/@odata/server)
[![npm (scoped)](https://img.shields.io/npm/v/@odata/parser?label=@odata/parser)](https://www.npmjs.com/package/@odata/parser)
[![npm (scoped)](https://img.shields.io/npm/v/@odata/metadata?label=@odata/metadata)](https://www.npmjs.com/package/@odata/metadata)

[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/Soontao/odata-v4-server/Node%20CI?label=nodejs)](https://github.com/Soontao/odata-v4-server/actions?query=workflow%3A%Node+CI%22)
[![Codecov](https://codecov.io/gh/Soontao/odata-v4-server/branch/master/graph/badge.svg)](https://codecov.io/gh/Soontao/odata-v4-server)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=Soontao_odata-v4-server&metric=security_rating)](https://sonarcloud.io/dashboard?id=Soontao_odata-v4-server)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=Soontao_odata-v4-server&metric=reliability_rating)](https://sonarcloud.io/dashboard?id=Soontao_odata-v4-server)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=Soontao_odata-v4-server&metric=sqale_index)](https://sonarcloud.io/dashboard?id=Soontao_odata-v4-server)

NodeJS OData(V4) Server Implementation 

## Features

* OASIS Standard OData Version 4.0 server
* usable as a standalone server, as an Express router, as a node.js stream or as a library
* expose service document and service metadata - $metadata
* setup metadata using decorators or [@odata/metadata](https://github.com/Soontao/odata-v4-metadata)
* supported data types are Edm primitives, complex types, navigation properties
* support `create`, `read`, `update`, and `delete` entity sets, action imports, function imports, collection and entity bound actions and functions
* support for full OData query language using [@odata/parser](https://github.com/Soontao/odata-v4-parser)
  * filtering entities - `$filter`
  * sorting - `$orderby`
  * paging - `$skip` and `$top`
  * projection of entities - `$select`
  * expanding entities - `$expand`
  * count records - `$count`
* support async controller functions using Promise, async/await or ES6 generator functions

## Controller and server functions parameter injection decorators

* @odata.key
* ~~@odata.filter~~ -- **just use @odata.query**
* @odata.query
* @odata.context
* @odata.body
* ~~@odata.result~~ -- **NOT stable**
* ~~@odata.stream~~ -- **NOT stable**