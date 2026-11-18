# Conventions

- Identifiers are plain `string` values everywhere. Decision record 4
  chose this over wrapper classes and branded types, because the API,
  the database and the reports share the same values.
- One exported class or one rule file per module.
