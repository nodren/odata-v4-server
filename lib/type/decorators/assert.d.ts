import { ODataMethod } from '@odata/parser';
import 'reflect-metadata';
import { EColumnOptions } from './odata';
interface BigNumberValidateOptions {
    integerOnly?: boolean;
    precision?: number;
}
export interface ConstraintOption {
    presence?: {
        allowEmpty?: boolean;
        message?: string;
    };
    type?: 'array' | 'integer' | 'number' | 'string' | 'date' | 'boolean';
    /**
     * The inclusion validator is useful for validating input from a dropdown for example.
     * It checks that the given value exists in the list given by the `within` option.
     */
    inclusion?: {
        within: any[];
        message?: string;
    };
    /**
     * The exclusion validator is useful for restriction certain values.
     * It checks that the given value is not in the list given by the within option.
     */
    exclusion?: {
        within: any[];
        message?: string;
    };
    /**
     * The format validator will validate a value against a regular expression of your choosing.
     */
    format?: {
        pattern?: RegExp;
        message?: string;
    };
    length?: {
        minimum?: number;
        maximum?: number;
        is?: number;
        notValid?: string;
        wrongLength?: string;
        tooLong?: string;
        tooShort?: string;
    };
    numericality?: {
        greaterThan?: number;
        greaterThanOrEqualTo?: number;
        lessThan?: number;
        divisibleBy?: number;
        onlyInteger?: boolean;
        strict?: boolean;
        odd?: boolean;
        even?: boolean;
        notValid?: string;
        notInteger?: string;
        notGreaterThan?: string;
        notGreaterThanOrEqualTo?: string;
        notEqualTo?: string;
        notLessThan?: string;
        notLessThanOrEqualTo?: string;
        notDivisibleBy?: string;
        notOdd?: string;
        notEven?: string;
    };
    bigNumber?: BigNumberValidateOptions;
    email?: {
        message?: string;
    };
    /**
     * This datetime validator can be used to validate dates and times.
     * Since date parsing in javascript is very poor some additional work is required to make this work.
     */
    datetime?: {
        /**
         * The date cannot be before this time.
         * This argument will be parsed using the parse function, just like the value.
         * The default error must be no earlier than %{date}
         */
        earliest?: string;
        latest?: string;
        /**
         * If true, only dates (not datetimes) will be allowed.
         * The default error is must be a valid date
         */
        dateOnly?: boolean;
    };
}
export declare function Validate(validateOptions: ConstraintOption): PropertyDecorator;
export declare function getValidateOptions(target: any, propertyKey: any): ConstraintOption;
export declare function columnToValidateRule(options: EColumnOptions, method: ODataMethod): ConstraintOption;
export {};
