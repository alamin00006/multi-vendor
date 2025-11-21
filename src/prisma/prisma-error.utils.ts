import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface ErrorHandlingOptions {
  entity?: string;
  uniqueFieldMap?: { [key: string]: string };
  foreignKeyMap?: { [key: string]: string };
  customMessages?: { [errorCode: string]: string };
}

@Injectable()
export class PrismaErrorHandler {
  /**
   * Handles Prisma errors dynamically with customizable messages
   */
  handleError(
    error: any,
    options: ErrorHandlingOptions = {},
    defaultMessage?: string,
  ): never {
    const {
      entity = 'record',
      uniqueFieldMap = {},
      foreignKeyMap = {},
      customMessages = {},
    } = options;

    // Handle Prisma known errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const message = this.getPrismaErrorMessage(
        error,
        entity,
        uniqueFieldMap,
        foreignKeyMap,
        customMessages,
      );
      throw this.createException(error.code, message);
    }

    // Handle Prisma validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      throw new BadRequestException(
        `Invalid data provided for ${entity} operation`,
      );
    }

    // Handle other Prisma errors
    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error('Unknown Prisma error:', error);
      throw new InternalServerErrorException(
        `An unexpected database error occurred while processing ${entity}`,
      );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error('Prisma initialisation error:', error);
      throw new InternalServerErrorException('Database connection failed');
    }

    if (error instanceof Prisma.PrismaClientRustPanicError) {
      console.error('Prisma Rust panic:', error);
      throw new InternalServerErrorException('Database system error');
    }

    // If it's already a NestJS HTTP exception, re-throw it
    if (error?.status && error?.response) {
      throw error;
    }

    // Generic error fallback
    console.error(`Unexpected error in ${entity} operation:`, error);
    throw new InternalServerErrorException(
      defaultMessage || `Failed to process ${entity}`,
    );
  }

  /**
   * Gets appropriate error message for Prisma known errors
   */
  private getPrismaErrorMessage(
    error: Prisma.PrismaClientKnownRequestError,
    entity: string,
    uniqueFieldMap: { [key: string]: string },
    foreignKeyMap: { [key: string]: string },
    customMessages: { [errorCode: string]: string },
  ): string {
    // Check for custom message first
    if (customMessages[error.code]) {
      return customMessages[error.code];
    }

    switch (error.code) {
      case 'P2002':
        return this.getUniqueConstraintMessage(error, entity, uniqueFieldMap);

      case 'P2025':
        return `${this.capitalize(entity)} not found`;

      case 'P2003':
        return this.getForeignKeyMessage(error, entity, foreignKeyMap);

      case 'P2014':
        return `Invalid ${entity} ID provided`;

      case 'P2016':
        return `${this.capitalize(entity)} not found`;

      case 'P2015':
        return `Related record not found for ${entity}`;

      case 'P2000':
        return `The provided value is too long for ${entity} field`;

      case 'P2001':
        return `The ${entity} record searched for does not exist`;

      case 'P2004':
        return `A constraint failed on the database for ${entity}`;

      case 'P2028':
        return `Transaction error occurred for ${entity}`;

      default:
        return `${this.capitalize(entity)} operation failed`;
    }
  }

  /**
   * Creates appropriate HTTP exception based on error code
   */
  private createException(errorCode: string, message: string) {
    switch (errorCode) {
      case 'P2002':
        return new ConflictException(message);
      case 'P2025':
      case 'P2016':
      case 'P2001':
        return new NotFoundException(message);
      case 'P2000':
      case 'P2003':
      case 'P2014':
      case 'P2004':
        return new BadRequestException(message);
      default:
        return new InternalServerErrorException(message);
    }
  }

  /**
   * Extracts meaningful message from unique constraint violation
   */
  private getUniqueConstraintMessage(
    error: Prisma.PrismaClientKnownRequestError,
    entity: string,
    uniqueFieldMap: { [key: string]: string },
  ): string {
    const meta = error.meta as { target?: string[] };
    const target = meta?.target?.[0];

    // Safe check for target existence before using as index
    if (target && uniqueFieldMap[target]) {
      return uniqueFieldMap[target];
    }

    // Default field messages with safe access
    const defaultFieldMessages: { [key: string]: string } = {
      name: `${this.capitalize(entity)} name already exists`,
      email: `${this.capitalize(entity)} email already exists`,
      phone: `${this.capitalize(entity)} phone number already exists`,
      code: `${this.capitalize(entity)} code already exists`,
      username: `${this.capitalize(entity)} username already exists`,
    };

    // Safe access to default messages
    if (target && defaultFieldMessages[target]) {
      return defaultFieldMessages[target];
    }

    return `${this.capitalize(entity)} with provided data already exists`;
  }

  /**
   * Provides meaningful foreign key constraint messages
   */
  private getForeignKeyMessage(
    error: Prisma.PrismaClientKnownRequestError,
    entity: string,
    foreignKeyMap: { [key: string]: string },
  ): string {
    const meta = error.meta as { field_name?: string };
    const field = meta?.field_name;

    // Safe check for field existence before using as index
    if (field && foreignKeyMap[field]) {
      return foreignKeyMap[field];
    }

    // Default foreign key messages with safe access
    const defaultFieldMessages: { [key: string]: string } = {
      managerId: 'Assigned manager does not exist',
      userId: 'Referenced user does not exist',
      branchId: 'Referenced branch does not exist',
      categoryId: 'Referenced category does not exist',
      createdById: 'Referenced creator does not exist',
    };

    // Safe access to default messages
    if (field && defaultFieldMessages[field]) {
      return defaultFieldMessages[field];
    }

    return `Related record not found for ${entity}`;
  }

  /**
   * Capitalizes the first letter of a string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Checks if error is a Prisma known request error
   */
  isPrismaError(error: any): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError;
  }
}
