import { Token, TokenType } from '@odata/parser/lib/lexer';
import { ODataController } from './controller';
import { ODataServer } from './server';
export interface KeyValuePair {
    name: string;
    value: any;
    raw?: string;
    node: Token;
}
export interface NavigationPart {
    name: string;
    type: TokenType;
    key?: KeyValuePair[];
    params?: any;
    node: Token;
}
export interface ISelect {
    [property: string]: ISelect;
}
export declare const ODATA_TYPE = "@odata.type";
export declare const ODATA_TYPENAME = "@odata.type.name";
export declare class ResourcePathVisitor {
    private serverType;
    private entitySets;
    navigation: NavigationPart[];
    select: ISelect;
    alias: any;
    path: string;
    singleton: string;
    inlinecount: boolean;
    id: string;
    ast: Token;
    navigationProperty: string;
    query: any;
    includes: {
        [navigationProperty: string]: ResourcePathVisitor;
    };
    constructor(serverType: typeof ODataServer, entitySets: {
        [entitySet: string]: typeof ODataController;
    });
    Visit(node: Token, context?: any, type?: any): Promise<ResourcePathVisitor>;
    protected VisitODataUri(node: Token, context: any): Promise<void>;
    protected VisitQueryOptions(node: Token, context: any, type: any): Promise<void>;
    protected VisitSelect(node: Token, context: any, type: any): void;
    protected VisitSelectItem(node: Token, context: any, type: any): void;
    protected VisitFilter(node: Token, context: any, type: any): Promise<void>;
    protected VisitAndExpression(node: Token, context: any, type: any): Promise<void>;
    protected VisitOrExpression(node: Token, context: any, type: any): Promise<void>;
    protected VisitBoolParenExpression(node: Token, context: any, type: any): Promise<void>;
    protected VisitCommonExpression(node: Token, context: any, type: any): Promise<void>;
    protected VisitFirstMemberExpression(node: Token, context: any, type: any): Promise<void>;
    protected VisitMemberExpression(node: Token, context: any, type: any): Promise<void>;
    protected VisitPropertyPathExpression(node: Token, context: any, type: any): Promise<void>;
    protected VisitNotExpression(node: Token, context: any, type: any): Promise<void>;
    protected VisitEqualsExpression(node: Token, context: any, type: any): Promise<void>;
    protected VisitNotEqualsExpression(node: Token, context: any, type: any): Promise<void>;
    protected VisitLesserThanExpression(node: Token, context: any, type: any): Promise<void>;
    protected VisitLesserOrEqualsExpression(node: Token, context: any, type: any): Promise<void>;
    protected VisitGreaterThanExpression(node: Token, context: any, type: any): Promise<void>;
    protected VisitGreaterOrEqualsExpression(node: Token, context: any, type: any): Promise<void>;
    protected VisitHasExpression(node: Token, context: any, type: any): Promise<void>;
    protected VisitExpand(node: Token, context: any, type: any): Promise<void>;
    protected VisitExpandItem(node: Token, context: any, type: any): Promise<void>;
    protected VisitExpandPath(node: Token, context: any, type: any): Promise<void>;
    protected VisitId(node: Token): void;
    protected VisitInlineCount(node: Token): void;
    protected VisitAliasAndValue(node: Token, context: any): Promise<void>;
    protected VisitResourcePath(node: Token, context: any): Promise<void>;
    protected VisitSingletonEntity(node: Token): void;
    protected VisitEntitySetName(node: Token, context: any): void;
    protected VisitCountExpression(node: Token): void;
    protected VisitCollectionNavigation(node: Token, context: any, type: any): Promise<void>;
    protected VisitCollectionNavigationPath(node: Token, context: any, type: any): Promise<void>;
    protected VisitSimpleKey(node: Token, _: any, type: any): Promise<void>;
    protected VisitCompoundKey(node: Token, _: any, type: any): Promise<void>;
    protected VisitQualifiedTypeName(node: Token, context: any, type: any): void;
    protected VisitSingleNavigation(node: Token, context: any, type: any): Promise<void>;
    protected VisitPropertyPath(node: Token, context: any, type: any): Promise<void>;
    protected VisitProperty(node: Token, _: any): void;
    protected VisitValueExpression(node: Token): void;
    protected VisitRefExpression(node: Token): void;
    protected VisitBoundOperation(node: Token, context: any, type: any): Promise<void>;
    protected VisitBoundActionCall(node: Token): void;
    protected VisitBoundFunctionCall(node: Token, context: any, type: any): Promise<void>;
    protected VisitFunctionImportCall(node: Token, context: any): Promise<void>;
    protected VisitFunctionParameter(node: Token, context: any): Promise<void>;
    protected VisitActionImportCall(node: Token): void;
    protected VisitParameterAlias(node: Token, context: any): void;
    protected VisitLiteral(node: Token, context: any, type: any): Promise<void>;
    protected VisitObject(node: Token, context: any, type: any): void;
    protected VisitEnum(node: Token, context: any, type: any): Promise<void>;
    protected VisitEnumValue(node: Token, context: any, type: any): Promise<void>;
    protected VisitEnumerationMember(node: Token, context: any, type: any): Promise<void>;
    protected VisitEnumMemberValue(node: Token, context: any, type: any): void;
    protected VisitRootExpression(node: Token, context: any, type: any): Promise<void>;
}
