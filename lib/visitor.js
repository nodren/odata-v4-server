"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourcePathVisitor = exports.ODATA_TYPENAME = exports.ODATA_TYPE = void 0;
const lexer_1 = require("@odata/parser/lib/lexer");
const qs = require("qs");
const Edm = require("./edm");
const literal_1 = require("./literal");
exports.ODATA_TYPE = '@odata.type';
exports.ODATA_TYPENAME = '@odata.type.name';
class ResourcePathVisitor {
    constructor(serverType, entitySets) {
        this.includes = {};
        this.navigation = [];
        this.path = '';
        this.alias = {};
        this.serverType = serverType;
        this.entitySets = entitySets;
    }
    async Visit(node, context, type) {
        this.ast = this.ast || node;
        if (!type) {
            type = this.serverType;
        }
        context = context || {};
        if (node) {
            node[exports.ODATA_TYPE] = type;
            let visitor;
            switch (node.type) {
                case 'PrimitiveFunctionImportCall':
                case 'PrimitiveCollectionFunctionImportCall':
                case 'ComplexFunctionImportCall':
                case 'ComplexCollectionFunctionImportCall':
                case 'EntityFunctionImportCall':
                case 'EntityCollectionFunctionImportCall':
                    visitor = this.VisitFunctionImportCall;
                    break;
                case 'BoundPrimitiveFunctionCall':
                case 'BoundPrimitiveCollectionFunctionCall':
                case 'BoundComplexFunctionCall':
                case 'BoundComplexCollectionFunctionCall':
                case 'BoundEntityFunctionCall':
                case 'BoundEntityCollectionFunctionCall':
                    visitor = this.VisitBoundFunctionCall;
                    break;
                case 'PrimitiveProperty':
                case 'PrimitiveKeyProperty':
                case 'PrimitiveCollectionProperty':
                case 'ComplexProperty':
                case 'ComplexCollectionProperty':
                case 'EntityNavigationProperty':
                case 'EntityCollectionNavigationProperty':
                    visitor = this.VisitProperty;
                    break;
                case 'QualifiedEntityTypeName':
                case 'QualifiedComplexTypeName':
                    visitor = this.VisitQualifiedTypeName;
                    break;
                default:
                    visitor = this[`Visit${node.type}`];
            }
            if (visitor) {
                await visitor.call(this, node, context, type);
            }
        }
        return this;
    }
    async VisitODataUri(node, context) {
        var _a;
        await this.Visit(node.value.resource, context);
        await this.Visit(node.value.query, context, (_a = this.navigation[this.navigation.length - 1]) === null || _a === void 0 ? void 0 : _a.node[exports.ODATA_TYPE]);
        this.navigation.forEach((it) => {
            if (it.params) {
                for (const prop in it.params) {
                    if (typeof it.params[prop] == 'function') {
                        it.params[prop] = it.params[prop]();
                    }
                }
            }
        });
    }
    async VisitQueryOptions(node, context, type) {
        await Promise.all(node.value.options.map(async (option) => await this.Visit(option, Object.assign({}, context), type)));
    }
    VisitSelect(node, context, type) {
        this.select = {};
        node.value.items.forEach((item) => this.Visit(item, context));
    }
    VisitSelectItem(node, context, type) {
        let select = this.select;
        node.raw.split('/').forEach((part) => {
            select = select[part] = select[part] || {};
        });
    }
    async VisitFilter(node, context, type) {
        context = Object.assign({ filter: true }, context);
        await this.Visit(node.value, context, type);
    }
    async VisitAndExpression(node, context, type) {
        await this.Visit(node.value.left, context, type);
        await this.Visit(node.value.right, context, type);
    }
    async VisitOrExpression(node, context, type) {
        await this.Visit(node.value.left, context, type);
        await this.Visit(node.value.right, context, type);
    }
    async VisitBoolParenExpression(node, context, type) {
        await this.Visit(node.value, context, type);
    }
    async VisitCommonExpression(node, context, type) {
        await this.Visit(node.value, context, type);
    }
    async VisitFirstMemberExpression(node, context, type) {
        const firstMemberContext = { ...context, isFirstMemberExpression: true };
        await this.Visit(node.value, firstMemberContext, type);
        if (firstMemberContext.qualifiedType && firstMemberContext.qualifiedTypeName) {
            type = firstMemberContext.qualifiedType || type;
            node.raw = node.raw.split('/').pop();
        }
        context.type = Edm.getType(type, node.raw, this.serverType.container);
        context.typeName = Edm.getTypeName(type, node.raw, this.serverType.container);
        context.deserializer = Edm.getURLDeserializer(type, node.raw, context.type, this.serverType.container);
        if (Edm.isEnumType(type, node.raw)) {
            const containerType = Object.getPrototypeOf(this.serverType.container).constructor;
            const enumType = context.type;
            const prop = node.raw;
            let enumName = context.typeName;
            let enumNamespace = containerType.namespace;
            if (enumName.indexOf('.') > 0) {
                enumNamespace = enumName.slice(0, enumName.lastIndexOf('.'));
                enumName = enumName.slice(enumName.lastIndexOf('.') + 1);
            }
            context.typeName = Edm.getTypeName(containerType, enumName, this.serverType.container) ||
                Edm.getTypeName(containerType, `${enumNamespace}.${enumName}`, this.serverType.container) ||
                'Edm.Int32';
        }
    }
    async VisitMemberExpression(node, context, type) {
        if (node.value && node.value.name && node.value.value) {
            await this.Visit(node.value.name, context, type);
            await this.Visit(node.value.value, context, type);
        }
        else {
            await this.Visit(node.value, context, type);
        }
    }
    async VisitPropertyPathExpression(node, context, type) {
        if (node.value.current && node.value.next) {
            await this.Visit(node.value.current, context, type);
            await this.Visit(node.value.next, context, type);
        }
        else {
            await this.Visit(node.value, context, type);
        }
    }
    async VisitNotExpression(node, context, type) {
        await this.Visit(node.value, context, type);
    }
    async VisitEqualsExpression(node, context, type) {
        await this.Visit(node.value.left, context, type);
        await this.Visit(node.value.right, context, type);
    }
    async VisitNotEqualsExpression(node, context, type) {
        await this.Visit(node.value.left, context, type);
        await this.Visit(node.value.right, context, type);
    }
    async VisitLesserThanExpression(node, context, type) {
        await this.Visit(node.value.left, context, type);
        await this.Visit(node.value.right, context, type);
    }
    async VisitLesserOrEqualsExpression(node, context, type) {
        await this.Visit(node.value.left, context, type);
        await this.Visit(node.value.right, context, type);
    }
    async VisitGreaterThanExpression(node, context, type) {
        await this.Visit(node.value.left, context, type);
        await this.Visit(node.value.right, context, type);
    }
    async VisitGreaterOrEqualsExpression(node, context, type) {
        await this.Visit(node.value.left, context, type);
        await this.Visit(node.value.right, context, type);
    }
    async VisitHasExpression(node, context, type) {
        await this.Visit(node.value.left, context, type);
        await this.Visit(node.value.right, context, type);
    }
    async VisitExpand(node, context, type) {
        await Promise.all(node.value.items.map(async (item) => {
            const part = item.value.path.value[0];
            const expandPath = part.raw;
            let visitor = this.includes[expandPath];
            if (!visitor) {
                visitor = new ResourcePathVisitor(node[exports.ODATA_TYPE], this.entitySets);
                this.includes[expandPath] = visitor;
            }
            await visitor.Visit(item, Object.assign({}, context), type);
        }));
    }
    async VisitExpandItem(node, context, type) {
        await this.Visit(node.value.path, context, type);
        type = this.navigation[this.navigation.length - 1].node[exports.ODATA_TYPE] || type;
        if (node.value.options) {
            this.ast = new lexer_1.Token(node);
            this.ast.type = lexer_1.TokenType.QueryOptions;
            this.ast.raw = node.value.options.map((n) => n.raw).join('&');
            this.query = qs.parse(this.ast.raw);
            await Promise.all(node.value.options.map(async (item) => await this.Visit(item, Object.assign({}, context), type)));
        }
        if (node.value.ref) {
            await this.Visit(node.value.ref, Object.assign({}, context), type);
        }
        if (node.value.count) {
            await this.Visit(node.value.count, Object.assign({}, context), type);
        }
    }
    async VisitExpandPath(node, context, type) {
        for (const item of node.value) {
            await this.Visit(item, Object.assign({}, context), type);
            type = item[exports.ODATA_TYPE] || type;
        }
        for (let i = this.navigation.length - 1; i >= 0; i--) {
            const nav = this.navigation[i];
            if (nav.type == lexer_1.TokenType.EntityCollectionNavigationProperty || nav.type == lexer_1.TokenType.EntityNavigationProperty) {
                this.navigationProperty = nav.name;
                break;
            }
        }
    }
    VisitId(node) {
        this.id = node.value;
    }
    VisitInlineCount(node) {
        this.inlinecount = literal_1.Literal.convert(node.value.value, node.value.raw);
    }
    async VisitAliasAndValue(node, context) {
        await this.Visit(node.value.value.value, context);
        this.alias[node.value.alias.value.name] = context.literal;
        delete context.literal;
    }
    async VisitResourcePath(node, context) {
        await this.Visit(node.value.resource, context);
        await this.Visit(node.value.navigation, context, context[exports.ODATA_TYPE]);
        delete context[exports.ODATA_TYPE];
    }
    VisitSingletonEntity(node) {
        this.singleton = node.raw;
    }
    VisitEntitySetName(node, context) {
        node[exports.ODATA_TYPE] = context[exports.ODATA_TYPE] = this.entitySets[node.value.name].prototype.elementType;
        this.navigation.push({ name: node.value.name, type: node.type, node });
        this.path += `/${node.value.name}`;
    }
    VisitCountExpression(node) {
        this.navigation.push({
            name: '$count',
            type: node.type,
            params: {},
            node
        });
        this.path += '/$count';
    }
    ;
    async VisitCollectionNavigation(node, context, type) {
        context.isCollection = true;
        await this.Visit(node.value.name, context, type);
        await this.Visit(node.value.path, context, type);
        delete context.isCollection;
    }
    async VisitCollectionNavigationPath(node, context, type) {
        await this.Visit(node.value.predicate, context, type);
        await this.Visit(node.value.navigation, context, type);
    }
    async VisitSimpleKey(node, _, type) {
        const lastNavigationPart = this.navigation[this.navigation.length - 1];
        node[exports.ODATA_TYPENAME] = Edm.getTypeName(type, node.value.key, this.serverType.container);
        node[exports.ODATA_TYPE] = Edm.getType(type, node.value.key, this.serverType.container);
        let value = literal_1.Literal.convert(node.value.value.value, node.value.value.raw);
        const deserializer = Edm.getURLDeserializer(type, node.value.key, node[exports.ODATA_TYPE], this.serverType.container);
        if (typeof deserializer == 'function') {
            value = await deserializer(value);
        }
        lastNavigationPart.key = [{
                name: node.value.key,
                value,
                raw: node.value.value.raw,
                node
            }];
        this.path += '(\\(([^,]+)\\))';
    }
    async VisitCompoundKey(node, _, type) {
        this.path += '(\\(';
        const lastNavigationPart = this.navigation[this.navigation.length - 1];
        lastNavigationPart.key = await Promise.all(node.value.map(async (pair, i) => {
            this.path += i == node.value.length - 1 ? '([^,]+)' : '([^,]+,)';
            node[exports.ODATA_TYPENAME] = Edm.getTypeName(type, pair.value.key.value.name, this.serverType.container);
            node[exports.ODATA_TYPE] = Edm.getType(type, pair.value.key.value.name, this.serverType.container);
            let value = literal_1.Literal.convert(pair.value.value.value, pair.value.value.raw);
            const deserializer = Edm.getURLDeserializer(type, pair.value.key.value.name, node[exports.ODATA_TYPE], this.serverType.container);
            if (typeof deserializer == 'function') {
                value = await deserializer(value);
            }
            return {
                name: pair.value.key.value.name,
                value,
                raw: pair.value.value.raw,
                node
            };
        }));
        this.path += '\\))';
    }
    VisitQualifiedTypeName(node, context, type) {
        const children = Edm.getChildren(node[exports.ODATA_TYPE]);
        const child = children.find((t) => `${t.namespace}.${t.name}` == node.raw);
        if (child) {
            node[exports.ODATA_TYPE] = child;
            node[exports.ODATA_TYPENAME] = node.raw;
            if (context.isFirstMemberExpression) {
                context.qualifiedType = child;
                context.qualifiedTypeName = node.raw;
            }
            else {
                this.navigation.push({
                    name: node.raw,
                    type: node.type,
                    node
                });
                this.path += `/${node.raw}`;
            }
        }
    }
    async VisitSingleNavigation(node, context, type) {
        context.isCollection = false;
        if (node.value.name) {
            await this.Visit(node.value.name, context, type);
        }
        await this.Visit(node.value.path, context, type);
        delete context.isCollection;
    }
    async VisitPropertyPath(node, context, type) {
        await this.Visit(node.value.path, context, type);
        await this.Visit(node.value.navigation, context, type);
    }
    VisitProperty(node, _) {
        node[exports.ODATA_TYPENAME] = Edm.getTypeName(node[exports.ODATA_TYPE], node.value.name, this.serverType.container);
        node[exports.ODATA_TYPE] = Edm.getType(node[exports.ODATA_TYPE], node.value.name, this.serverType.container);
        this.navigation.push({ name: node.value.name, type: node.type, node });
        this.path += `/${node.value.name}`;
    }
    ;
    VisitValueExpression(node) {
        this.navigation.push({
            name: '$value',
            type: node.type,
            params: {},
            node
        });
        this.path += '/$value';
    }
    VisitRefExpression(node) {
        this.navigation.push({
            name: '$ref',
            type: node.type,
            params: {},
            node
        });
        this.path += '/$ref';
    }
    async VisitBoundOperation(node, context, type) {
        await this.Visit(node.value.operation, context, type);
        await this.Visit(node.value.navigation, context, type);
    }
    VisitBoundActionCall(node) {
        const part = {
            type: node.type,
            name: node.raw,
            node
        };
        this.navigation.push(part);
        this.path += `/${part.name}`;
    }
    async VisitBoundFunctionCall(node, context, type) {
        const part = {
            type: node.type,
            name: `${node.value.call.value.namespace}.${node.value.call.value.name}`,
            params: {},
            node
        };
        this.navigation.push(part);
        this.path += `/${part.name}`;
        this.path += '(\\(';
        if (context.isCollection) {
            // @ts-ignore
            type = this.serverType.getController(type);
        }
        context.parameters = Edm.getParameters(type, part.name.split('.').pop());
        await Promise.all(node.value.params.value.map(async (param, i) => {
            await this.Visit(param, context);
            if (i < node.value.params.value.length - 1) {
                this.path += ',';
            }
        }));
        delete context.parameters;
        this.path += '\\))';
    }
    async VisitFunctionImportCall(node, context) {
        const part = {
            type: node.type,
            name: node.value.import.value.name,
            params: {},
            node
        };
        this.navigation.push(part);
        this.path += `/${part.name}`;
        this.path += '(\\(';
        context.parameters = Edm.getParameters(node[exports.ODATA_TYPE], part.name);
        await Promise.all(node.value.params.map(async (param) => await this.Visit(param, Object.assign({}, context))));
        delete context.parameters;
        this.path += '\\))';
    }
    async VisitFunctionParameter(node, context) {
        const edmParam = context.parameters.find((p) => p.name == [
            node.value.name.value.name
        ]);
        const deserializer = (edmParam && Edm.getURLDeserializer(node[exports.ODATA_TYPE], edmParam.name, edmParam.type, this.serverType.container)) || ((_) => _);
        context = Object.assign({}, context);
        await this.Visit(node.value.value, context, edmParam && edmParam.type);
        const params = this.navigation[this.navigation.length - 1].params;
        params[node.value.name.value.name] = ((literal) => (_) => deserializer(typeof literal == 'function' ? literal() : literal))(context.literal);
        this.path += `${node.value.name.value.name}=([^,]+)`;
        delete context.literal;
    }
    VisitActionImportCall(node) {
        const part = {
            type: node.value.type,
            name: node.value.value.name,
            node
        };
        this.navigation.push(part);
        this.path += `/${part.name}`;
    }
    VisitParameterAlias(node, context) {
        context.literal = ((name) => (_) => this.alias[name])(node.value.name);
    }
    async VisitLiteral(node, context, type) {
        let literal = literal_1.Literal.convert(node.value, node.raw);
        if (node.value != context.typeName) {
            node.raw = await (context.deserializer || ((_) => _))(literal);
            node.value = context.typeName;
            literal = node.raw;
        }
        context.literal = literal;
    }
    VisitObject(node, context, type) {
        context.literal = JSON.parse(node.raw);
    }
    async VisitEnum(node, context, type) {
        const enumName = node.value.name.raw.split('.');
        context.enumName = enumName.pop();
        context.enumNamespace = enumName.join('.');
        await this.Visit(node.value.value, context, type);
    }
    async VisitEnumValue(node, context, type) {
        await this.Visit(node.value.values[0], context, type);
    }
    async VisitEnumerationMember(node, context, type) {
        if (context.filter && type) {
            node.type = lexer_1.TokenType.EnumMemberValue;
            const deserializer = Edm.getURLDeserializer(type, context.typeName, context.type, this.serverType.container);
            if (deserializer) {
                node.raw = await deserializer(node.value.name);
                node.value = node.raw;
            }
            else {
                const { enumNamespace, enumName } = context;
                const qualifiedEnumTypeName = `${enumNamespace}.${enumName}`;
                if (!(context.type || context.typeName) && enumNamespace && enumName) {
                    context.type = this.serverType.container[qualifiedEnumTypeName] || this.serverType.container[context.enumName];
                    const containerType = Object.getPrototypeOf(this.serverType.container).constructor;
                    context.typeName =
                        Edm.getTypeName(containerType, qualifiedEnumTypeName, this.serverType.container) ||
                            Edm.getTypeName(containerType, enumName, this.serverType.container) ||
                            'Edm.Int32';
                }
                node[exports.ODATA_TYPE] = context.type;
                node[exports.ODATA_TYPENAME] = context.typeName;
                node.raw = `${context.type && context.type[node.value.name]}`;
                node.value = context.typeName;
            }
        }
        else {
            context.literal = (type && type[node.value.name]) || node.value.name;
        }
    }
    VisitEnumMemberValue(node, context, type) {
        context.literal = literal_1.Literal.convert(node.value, node.raw);
    }
    async VisitRootExpression(node, context, type) {
        const rootValue = await this.serverType.execute(node.raw.replace('$root/', ''), 'GET');
        node.type = lexer_1.TokenType.Literal;
        node.value = rootValue.elementType;
        node.raw = await Edm.escape(rootValue.body.value, node.value);
        await this.Visit(node, context, type);
    }
}
exports.ResourcePathVisitor = ResourcePathVisitor;
//# sourceMappingURL=visitor.js.map