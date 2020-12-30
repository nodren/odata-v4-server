export declare enum EdmType {
    String = "Edm.String",
    Byte = "Edm.Byte",
    SByte = "Edm.SByte",
    Int16 = "Edm.Int64",
    Int32 = "Edm.Int32",
    Int64 = "Edm.Int64",
    Decimal = "Edm.Decimal",
    Double = "Edm.Double",
    Single = "Edm.Single",
    Date = "Edm.Date",
    DateTimeOffset = "Edm.DateTimeOffset",
    Boolean = "Edm.Boolean",
    Guid = "Edm.Guid",
    null = "null",
    TimeOfDay = "Edm.TimeOfDay",
    Duration = "Edm.Duration"
}
export declare class Literal {
    constructor(type: string, value: string);
    static convert(type: string, value: string): any;
    'Edm.String'(value: string): string;
    'Edm.Byte'(value: string): number;
    'Edm.SByte'(value: string): number;
    'Edm.Int16'(value: string): number;
    'Edm.Int32'(value: string): number;
    'Edm.Int64'(value: string): number;
    'Edm.Decimal'(value: string): number;
    'Edm.Double'(value: string): number;
    'Edm.Single'(value: string): number;
    'Edm.Boolean'(value: string): boolean;
    'Edm.Guid'(value: string): string;
    'Edm.Date'(value: string): string;
    'Edm.DateTimeOffset'(value: string): Date;
    'null'(value: string): any;
    'Edm.TimeOfDay'(value: string): Date;
    'Edm.Duration'(value: string): number;
}
