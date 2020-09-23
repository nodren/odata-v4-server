import { buildMessage, Contains, IsBoolean, IsDate, IsDateString, isDateString, IsDefined, IsEmail, IsEmpty, IsEnum, IsInt, IsNumber, IsNumberString, IsOptional, IsPhoneNumber, IsString, IsUrl, IsUUID, MaxLength, MinLength, ValidateBy, ValidationOptions } from 'class-validator';
import 'reflect-metadata';


/**
 * Checks if value is defined (!== undefined, !== null).
 */
export function isDefined(value: any): boolean {
  return value !== undefined && value !== null;
}

export function IsDateOrDateString(validationOptions?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'IS_DATE_OR_DATE_STRING',
      validator: {
        validate: (value): boolean => isDateString(value) || value instanceof Date,
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property should be date object or ISO date string`,
          validationOptions
        )
      }
    },
    validationOptions
  );
}

export const Assert = {
  IsDefined,
  NotNull: IsDefined,
  IsString,
  IsNumber,
  IsInt,
  IsEnum,
  IsPhoneNumber,
  IsUrl,
  IsOptional,
  IsDate,
  IsDateString,
  IsBoolean,
  IsNumberString,
  IsDateOrDateString,
  IsEmail,
  IsEmpty,
  Contains,
  IsUUID,
  MaxLength,
  MinLength
};
