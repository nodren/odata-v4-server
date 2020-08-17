

/**
 * the key which support to injection
 */
export enum InjectKey {
  ServerType = 'global:server_type',
  Configuration = 'global:configuration',

  ProcessorOption = 'request:processor_option',
  RequestContext = 'request:request_context',
  RequestTxId = 'request:transaction:uuid',
  RequestTransaction = 'request:transaction',
  RequestMethod = 'request:method',
  RequestEntityType = 'request:entity_type',
  RequestEntityKey = 'request:entity_key',
  RequestEntityQuery = 'request:entity_query',
  RequestBody = 'request:body',

  HookContext = 'request:hook:context',

  DatabaseHelper = 'global:db_helper',

  GlobalConnection = 'global:connection',
  Connection = 'request:connection',
  QueryRunner = 'request:queryRunner',


  // copy from odata
  ODataEntitySets = 'odata:entitysets',
  ODataMethod = 'odata:method',
  ODataKeyParameters = 'odata:keyparameters',
  ODataLinkParameters = 'odata:linkparameters',
  ODataQueryParameter = 'odata:queryparameter',
  ODataFilterParameter = 'odata:filterparameter',
  ODataBodyParameter = 'odata:bodyparameter',
  ODataContextParameter = 'odata:contextparameter',
  ODataStreamParameter = 'odata:streamparameter',
  ODataResultParameter = 'odata:resultparameter',
  ODataIdParameter = 'odata:idparameter',
  ODataTypeParameter = 'odata:typeparameter',
  ODataNamespace = 'odata:namespace',
  ODataTxContextParameter = 'odata:tx_contextparameter',
  ODataInjectContainer = 'odata:inject_container',
  ODataTypedService = 'odata:service',
}


export enum ServerType {
  base = 'base',
  typed = 'typed'
}
