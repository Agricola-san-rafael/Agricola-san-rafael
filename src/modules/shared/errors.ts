export class AppError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autenticado") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "No autorizado") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "No encontrado") {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Datos inválidos") {
    super(message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflicto") {
    super(message, 409);
  }
}

export class StockInsuficienteError extends ConflictError {
  kilosFaltantes: number;

  constructor(kilosFaltantes: number) {
    super(`Stock insuficiente: faltan ${kilosFaltantes} kg`);
    this.kilosFaltantes = kilosFaltantes;
  }
}
