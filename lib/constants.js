"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerType = exports.InjectKey = exports.HttpHeaderConstants = void 0;
var HttpHeaderConstants;
(function (HttpHeaderConstants) {
    HttpHeaderConstants["HttpHeaderAccept"] = "accept";
    HttpHeaderConstants["HttpHeaderODataVersion"] = "OData-Version";
    HttpHeaderConstants["HttpHeaderAcceptCharset"] = "accept-charset";
    HttpHeaderConstants["ODataValueMaxVersion"] = "odata-maxversion";
    HttpHeaderConstants["HttpContentTypeJson"] = "application/json";
    HttpHeaderConstants["HttpContentTypeTextXml"] = "text/xml";
    HttpHeaderConstants["HttpContentTypeXml"] = "xml";
    HttpHeaderConstants["HttpContentTypeAny"] = "*/*";
    HttpHeaderConstants["HttpCharsetUTF8"] = "utf-8";
    HttpHeaderConstants["ODataValueMetadata"] = "odata.metadata";
    HttpHeaderConstants["ODataValueVersion40"] = "4.0";
})(HttpHeaderConstants = exports.HttpHeaderConstants || (exports.HttpHeaderConstants = {}));
/**
 * the key which support to injection
 */
var InjectKey;
(function (InjectKey) {
    InjectKey["ServerType"] = "global:server_type";
    InjectKey["Configuration"] = "global:configuration";
    InjectKey["ProcessorOption"] = "request:processor_option";
    InjectKey["Request"] = "request:request";
    InjectKey["Response"] = "request:response";
    InjectKey["RequestContext"] = "odata:contextparameter";
    InjectKey["RequestTxId"] = "request:transaction:uuid";
    InjectKey["RequestTransaction"] = "odata:tx_contextparameter";
    InjectKey["RequestMethod"] = "request:method";
    InjectKey["RequestEntityType"] = "odata:typeparameter";
    InjectKey["RequestEntityKey"] = "odata:keyparameters";
    InjectKey["RequestEntityQuery"] = "odata:queryparameter";
    InjectKey["RequestBody"] = "odata:bodyparameter";
    InjectKey["HookContext"] = "request:hook:context";
    InjectKey["DatabaseHelper"] = "global:db_helper";
    InjectKey["GlobalConnection"] = "global:connection";
    InjectKey["TransactionConnection"] = "request:tx_connection";
    InjectKey["TransactionQueryRunner"] = "request:tx_queryRunner";
    // copy from odata
    InjectKey["ODataEntitySets"] = "odata:entitysets";
    InjectKey["ODataMethod"] = "odata:method";
    InjectKey["ODataKeyParameters"] = "odata:keyparameters";
    InjectKey["ODataLinkParameters"] = "odata:linkparameters";
    InjectKey["ODataQueryParameter"] = "odata:queryparameter";
    InjectKey["ODataFilterParameter"] = "odata:filterparameter";
    InjectKey["ODataBodyParameter"] = "odata:bodyparameter";
    InjectKey["ODataContextParameter"] = "odata:contextparameter";
    InjectKey["ODataStreamParameter"] = "odata:streamparameter";
    InjectKey["ODataResultParameter"] = "odata:resultparameter";
    InjectKey["ODataIdParameter"] = "odata:idparameter";
    InjectKey["ODataTypeParameter"] = "odata:typeparameter";
    InjectKey["ODataNamespace"] = "odata:namespace";
    InjectKey["ODataTxContextParameter"] = "odata:tx_contextparameter";
    InjectKey["ODataInjectContainer"] = "odata:inject_container";
    InjectKey["ODataTypedService"] = "odata:service";
    InjectKey["InjectODataService"] = "odata:service_instance";
})(InjectKey = exports.InjectKey || (exports.InjectKey = {}));
var ServerType;
(function (ServerType) {
    ServerType["base"] = "base";
    ServerType["typed"] = "typed";
})(ServerType = exports.ServerType || (exports.ServerType = {}));
//# sourceMappingURL=constants.js.map