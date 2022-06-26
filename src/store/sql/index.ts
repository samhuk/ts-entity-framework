import { toDict } from '../../helpers/dict'
import { capitalize, objectPropsToCamelCase } from '../../helpers/string'
import { DataFormat, DataFormatDeclarations } from '../../dataFormat/types'
import { RelationDeclarations, Relation, RelationType, RelationsDict, ExtractRelevantRelations } from '../../relations/types'
import { createDbStoreBase } from '../base/db'
import { StoreBase } from '../base/types'
import {
  Store,
  OneToOneFromOneFunctionName,
  OneToOneToOneFunctionName,
  OneToManyFromOneFunctionName,
  OneToManyToManyFunctionName,
  ManyToManyFieldRef1FunctionName,
  ManyToManyFieldRef2FunctionName,
  ManyToManyFieldRef1FunctionDict,
  ManyToManyFieldRef2FunctionDict,
  OneToManyFromOneFunctionDict,
  OneToManyToManyFunctionDict,
  OneToOneFromOneFunctionDict,
  OneToOneToOneFunctionDict,
  RelationGetterFunctionsDict,
} from '../types'
import {
  createOneToOneFromOneRelationSelectSql,
  createOneToOneToOneRelationSelectSql,
  createOneToManyFromOneRelationSelectSql,
  createOneToManyToManyRelationSelectSql,
  createManyToManyFieldRef1RelationSelectSql,
  createManyToManyFieldRef2RelationSelectSql,
} from './relationSelectors'
import { DbStoreOptions } from './types'

export const getRelationsRelevantToDataFormat = <
  T extends DataFormatDeclarations,
  K extends Relation<T>[],
  L extends T[number]['name']
>(relationList: K, dataFormatName: L): ExtractRelevantRelations<L, K>[] => (
  relationList.filter(d => (
    (d.type === RelationType.ONE_TO_ONE && d.fromOneField.formatName === dataFormatName)
    || (d.type === RelationType.ONE_TO_ONE && d.toOneField.formatName === dataFormatName)
    || (d.type === RelationType.ONE_TO_MANY && d.fromOneField.formatName === dataFormatName)
    || (d.type === RelationType.ONE_TO_MANY && d.toManyField.formatName === dataFormatName)
    || (d.type === RelationType.MANY_TO_MANY && d.fieldRef1.formatName === dataFormatName)
    || (d.type === RelationType.MANY_TO_MANY && d.fieldRef2.formatName === dataFormatName)
  )) as ExtractRelevantRelations<L, K>[]
  )

/**
 * Finds all of the relations where this data format requires a foreign key. This will be the
 * case if this data format is being referenced as the "to many" of any "one to many" relations
 * or as the "to one" of any "one to one" relations.
 */
const getRelevantRelationsForForeignKeys = <
  T extends DataFormatDeclarations,
  K extends RelationDeclarations<T>,
  L extends T[number]['name']
>(
    relationsDict: RelationsDict<T, K>,
    dataFormat: Extract<T[number], { name: L }>,
  ) => Object.values(relationsDict)
    .filter(r => {
      const _r = r as Relation<T>
      return (_r.type === RelationType.ONE_TO_MANY && _r.toManyField.formatName === dataFormat.name)
        || (_r.type === RelationType.ONE_TO_ONE && _r.toOneField.formatName === dataFormat.name)
    }) as Relation<T, RelationType.ONE_TO_MANY | RelationType.ONE_TO_ONE>[]

export const createEntityDbStore = <
  T extends DataFormatDeclarations,
  K extends RelationDeclarations<T>,
  // The chosen data format declaration name
  L extends T[number]['name'],
>(options: DbStoreOptions<T, K, L>): Store<T, K, L> => {
  type TLocalDataFormatDeclaration = Extract<T[number], { name: L }>
  const relationList = Object.values(options.relations) as Relation<T>[]
  const relevantRelations = getRelationsRelevantToDataFormat(relationList, options.dataFormatName)

  // @ts-ignore
  const localDataFormat = options.dataFormats[options.dataFormatName] as DataFormat<TLocalDataFormatDeclaration>

  // -- Relevant relations for each type

  const relationsForOneToOneFromOne = relevantRelations.filter(r => (
    r.type === RelationType.ONE_TO_ONE && localDataFormat.name === r.fromOneField.formatName
  )) as Relation<T, RelationType.ONE_TO_ONE>[]

  const relationsForOneToOneToOne = relevantRelations.filter(r => (
    r.type === RelationType.ONE_TO_ONE && localDataFormat.name === r.toOneField.formatName
  )) as Relation<T, RelationType.ONE_TO_ONE>[]

  const relationsForOneToManyFromOne = relevantRelations.filter(r => (
    r.type === RelationType.ONE_TO_MANY && localDataFormat.name === r.fromOneField.formatName
  )) as Relation<T, RelationType.ONE_TO_MANY>[]

  const relationsForOneToManyToMany = relevantRelations.filter(r => (
    r.type === RelationType.ONE_TO_MANY && localDataFormat.name === r.toManyField.formatName
  )) as Relation<T, RelationType.ONE_TO_MANY>[]

  const relationsForManyToManyFieldRef1 = relevantRelations.filter(r => (
    r.type === RelationType.MANY_TO_MANY && localDataFormat.name === r.fieldRef1.formatName
  )) as Relation<T, RelationType.MANY_TO_MANY>[]

  const relationsForManyToManyFieldRef2 = relevantRelations.filter(r => (
    r.type === RelationType.MANY_TO_MANY && localDataFormat.name === r.fieldRef2.formatName
  )) as Relation<T, RelationType.MANY_TO_MANY>[]

  // -- Function names for each relation for each type

  const functionNamesForOneToOneFromOne = relationsForOneToOneFromOne.map(r => (
    r.getRelatedToOneFieldRecordsStoreName
    ?? `getRelated${capitalize(r.toOneField.formatName)}RecordOn${capitalize(r.toOneField.fieldName)}`
  )) as OneToOneFromOneFunctionName<typeof relationsForOneToOneFromOne[number]>[]

  const functionNamesForOneToOneToOne = relationsForOneToOneToOne.map(r => (
    r.getRelatedFromOneFieldRecordsStoreName
    ?? `getRelated${capitalize(r.fromOneField.formatName)}RecordOn${capitalize(r.fromOneField.fieldName)}`
  )) as OneToOneToOneFunctionName<typeof relationsForOneToOneToOne[number]>[]

  const functionNamesForOneToManyFromOne = relationsForOneToManyFromOne.map(r => (
    r.getRelatedToManyFieldRecordsStoreName
    ?? `getRelated${capitalize(r.toManyField.formatName)}RecordsOn${capitalize(r.toManyField.fieldName)}`
  )) as OneToManyFromOneFunctionName<typeof relationsForOneToManyFromOne[number]>[]

  const functionNamesForOneToManyToMany = relationsForOneToManyToMany.map(r => (
    r.getRelatedFromOneFieldRecordsStoreName
    ?? `getRelated${capitalize(r.fromOneField.formatName)}RecordOn${capitalize(r.fromOneField.fieldName)}`
  )) as OneToManyToManyFunctionName<typeof relationsForOneToManyToMany[number]>[]

  const functionNamesForManyToManyFieldRef1 = relationsForManyToManyFieldRef1.map(r => (
    r.getRelatedFieldRef2RecordsStoreName
    ?? `getRelated${capitalize(r.fieldRef2.formatName)}RecordsOn${capitalize(r.fieldRef2.fieldName)}`
  )) as ManyToManyFieldRef1FunctionName<typeof relationsForManyToManyFieldRef1[number]>[]

  const functionNamesForManyToManyFieldRef2 = relationsForManyToManyFieldRef2.map(r => (
    r.getRelatedFieldRef1RecordsStoreName
    ?? `getRelated${capitalize(r.fieldRef1.formatName)}RecordsOn${capitalize(r.fieldRef1.fieldName)}`
  )) as ManyToManyFieldRef2FunctionName<typeof relationsForManyToManyFieldRef2[number]>[]

  // -- Getter function dicts for each type

  const functionsForOneToOneFromOne = toDict(functionNamesForOneToOneFromOne, (functionName, i) => {
    const relation = relationsForOneToOneFromOne[i]
    const sql = createOneToOneFromOneRelationSelectSql(options.dataFormats, relation)

    return {
      key: functionName,
      value: async (linkedFieldValue: any) => (
        objectPropsToCamelCase(options.db.queryGetFirstRow(sql, [linkedFieldValue]))
      ),
    }
  }) as unknown as OneToOneFromOneFunctionDict<T, K, L>

  const functionsForOneToOneToOne = toDict(functionNamesForOneToOneToOne, (functionName, i) => {
    const relation = relationsForOneToOneToOne[i]
    const sql = createOneToOneToOneRelationSelectSql(options.dataFormats, relation)

    return {
      key: functionName,
      value: async (linkedFieldValue: any) => (
        objectPropsToCamelCase(options.db.queryGetFirstRow(sql, [linkedFieldValue]))
      ),
    }
  }) as unknown as OneToOneToOneFunctionDict<T, K, L>

  const functionsForOneToManyFromOne = toDict(functionNamesForOneToManyFromOne, (functionName, i) => {
    const relation = relationsForOneToManyFromOne[i]
    const sql = createOneToManyFromOneRelationSelectSql(options.dataFormats, relation)

    return {
      key: functionName,
      value: async (linkedFieldValue: any) => {
        const result = await options.db.queryGetRows(sql, [linkedFieldValue])
        return result.map(objectPropsToCamelCase)
      },
    }
  }) as unknown as OneToManyFromOneFunctionDict<T, K, L>

  const functionsForOneToManyToMany = toDict(functionNamesForOneToManyToMany, (functionName, i) => {
    const relation = relationsForOneToManyToMany[i]
    const sql = createOneToManyToManyRelationSelectSql(options.dataFormats, relation)

    return {
      key: functionName,
      value: async (linkedFieldValue: any) => (
        objectPropsToCamelCase(options.db.queryGetFirstRow(sql, [linkedFieldValue]))
      ),
    }
  }) as unknown as OneToManyToManyFunctionDict<T, K, L>

  const functionsForManyToManyFieldRef1 = toDict(functionNamesForManyToManyFieldRef1, (functionName, i) => {
    const relation = relationsForManyToManyFieldRef1[i]

    const sql = createManyToManyFieldRef1RelationSelectSql(options.dataFormats, relation)

    return {
      key: functionName,
      value: async (localFieldValue: any) => {
        const result = await options.db.queryGetRows(sql, [localFieldValue])
        return result.map(objectPropsToCamelCase)
      },
    }
  }) as unknown as ManyToManyFieldRef1FunctionDict<T, K, L>

  const functionsForManyToManyFieldRef2 = toDict(functionNamesForManyToManyFieldRef2, (functionName, i) => {
    const relation = relationsForManyToManyFieldRef2[i]

    const sql = createManyToManyFieldRef2RelationSelectSql(options.dataFormats, relation)

    return {
      key: functionName,
      value: async (localFieldValue: any) => {
        const result = await options.db.queryGetRows(sql, [localFieldValue])
        return result.map(objectPropsToCamelCase)
      },
    }
  }) as unknown as ManyToManyFieldRef2FunctionDict<T, K, L>

  const relationsStore: RelationGetterFunctionsDict<T, K, L> = {
    ...functionsForOneToOneFromOne,
    ...functionsForOneToOneToOne,
    ...functionsForOneToManyFromOne,
    ...functionsForOneToManyToMany,
    ...functionsForManyToManyFieldRef1,
    ...functionsForManyToManyFieldRef2,
  }

  const baseStore: StoreBase<TLocalDataFormatDeclaration> = createDbStoreBase({
    db: options.db,
    dataFormat: localDataFormat,
  })

  // @ts-ignore
  const relevantRelationsForForeignKeys = getRelevantRelationsForForeignKeys(options.relations, localDataFormat)
  const createTableSql = localDataFormat.sql.createCreateTableSql(relevantRelationsForForeignKeys)

  return {
    ...baseStore,
    ...relationsStore,
    provision: () => options.db.queryGetRows(createTableSql)
      .then(() => true),
    unprovision: () => options.db.queryGetRows(`drop table if exists ${localDataFormat.sql.tableName}`)
      .then(() => true),
  } as unknown as Store<T, K, L>
}