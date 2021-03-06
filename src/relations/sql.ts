import { camelCaseToSnakeCase } from '../helpers/string'
import { DataFormatDeclarations, FieldRef } from '../dataFormat/types'
import { RelationDeclaration, RelationType } from './types'

export const createManyToManyJoinTableName = (r: RelationDeclaration<DataFormatDeclarations, RelationType.MANY_TO_MANY>) => {
  const tableName1 = camelCaseToSnakeCase(r.fieldRef1.formatName)
  const tableName2 = camelCaseToSnakeCase(r.fieldRef2.formatName)
  return `${tableName1}_to_${tableName2}`
}

export const createManyToManyJoinTableFieldRef1ColumnName = (r: RelationDeclaration<DataFormatDeclarations, RelationType.MANY_TO_MANY>) => {
  const tableName1 = camelCaseToSnakeCase(r.fieldRef1.formatName)
  const fieldName1 = camelCaseToSnakeCase(r.fieldRef1.fieldName)
  return `${tableName1}_${fieldName1}`
}

export const createManyToManyJoinTableFieldRef2ColumnName = (r: RelationDeclaration<DataFormatDeclarations, RelationType.MANY_TO_MANY>) => {
  const tableName2 = camelCaseToSnakeCase(r.fieldRef2.formatName)
  const fieldName2 = camelCaseToSnakeCase(r.fieldRef2.fieldName)
  return `${tableName2}_${fieldName2}`
}

/**
 * Creates the join table "create table" sql text required for the
 * given many-to-many relation.
 */
export const createManyToManyJoinTableSql = (r: RelationDeclaration<DataFormatDeclarations, RelationType.MANY_TO_MANY>) => {
  const tableName1 = camelCaseToSnakeCase(r.fieldRef1.formatName)
  const tableName2 = camelCaseToSnakeCase(r.fieldRef2.formatName)
  const fieldName1 = camelCaseToSnakeCase(r.fieldRef1.fieldName)
  const fieldName2 = camelCaseToSnakeCase(r.fieldRef2.fieldName)
  const columnName1 = `${tableName1}_${fieldName1}`
  const columnName2 = `${tableName2}_${fieldName2}`

  const tableName = `${tableName1}_to_${tableName2}`

  const fkeyName1 = `${tableName}_${columnName1}_fkey`
  const fkeyName2 = `${tableName}_${columnName2}_fkey`

  return (
    `CREATE TABLE IF NOT EXISTS public.${tableName}
(
    id SERIAL PRIMARY KEY,
    ${columnName1} integer NOT NULL,
    ${columnName2} integer NOT NULL,
    CONSTRAINT ${fkeyName1} FOREIGN KEY (${columnName1})
        REFERENCES public.${tableName1} (${fieldName1}) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT ${fkeyName2} FOREIGN KEY (${columnName2})
        REFERENCES public.${tableName2} (${fieldName2}) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.${tableName}
    OWNER to postgres;`
  )
}

const createForeignKeySql = (
  localFieldRef: FieldRef,
  foreignFieldRef: FieldRef,
) => {
  const localTableName = camelCaseToSnakeCase(localFieldRef.formatName)
  const foreignTableName = camelCaseToSnakeCase(foreignFieldRef.formatName)
  const localColumnName = camelCaseToSnakeCase(localFieldRef.fieldName)
  const foreignColumnName = camelCaseToSnakeCase(foreignFieldRef.fieldName)
  const foreignKeyName = `${localTableName}_to_${foreignTableName}_${localColumnName}_fkey`
  return (
    `  constraint ${foreignKeyName} foreign key (${localColumnName})
    references public.${foreignTableName} (${foreignColumnName}) match simple
    on update no action
    on delete no action`
  )
}

/**
 * Creates the "constraint ... foreign key (...)" sql text required for the
 * given one-to-many relation.
 */
export const createOneToManyForeignKeySql = (r: RelationDeclaration<DataFormatDeclarations, RelationType.ONE_TO_MANY>) => (
  createForeignKeySql(
    r.toManyField,
    r.fromOneField,
  )
)

/**
 * Creates the "constraint ... foreign key (...)" sql text required for the
 * given one-to-one relation.
 */
export const createOneToOneForeignKeySql = (r: RelationDeclaration<DataFormatDeclarations, RelationType.ONE_TO_ONE>) => (
  createForeignKeySql(
    r.toOneField,
    r.fromOneField,
  )
)
