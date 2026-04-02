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

