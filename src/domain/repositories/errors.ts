export class RepositoryConflictError extends Error {
  readonly code = "CONFLICT" as const;

  constructor(message: string) {
    super(message);
    this.name = "RepositoryConflictError";
  }
}

export class RepositoryNotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;

  constructor(message: string) {
    super(message);
    this.name = "RepositoryNotFoundError";
  }
}

export class CriteriaInUseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CriteriaInUseError";
  }
}

export class LocationInUseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocationInUseError";
  }
}

export class NoCriteriaDefinedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoCriteriaDefinedError";
  }
}

export class RosterDeletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RosterDeletionError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}
