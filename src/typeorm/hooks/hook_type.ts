

export enum HookType {
  beforeCreate = 'odata.hook:beforeCreate',
  beforeUpdate = 'odata.hook:beforeUpdate',
  beforeDelete = 'odata.hook:beforeDelete',
  afterLoad = 'odata.hook:afterLoad',
  afterSave = 'odata.event:afterSave'
}

/**
 * events type hook
 */
export const HookEvents = [HookType.afterSave];
