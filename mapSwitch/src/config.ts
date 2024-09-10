import { type ImmutableObject } from 'seamless-immutable'

export interface Config {
  exampleConfigProperty: string,
  url: any,
  lookupTable: any
}

export type IMConfig = ImmutableObject<Config>
