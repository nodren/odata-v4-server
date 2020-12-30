export declare enum HookType {
    beforeCreate = "odata.hook:beforeCreate",
    beforeUpdate = "odata.hook:beforeUpdate",
    beforeDelete = "odata.hook:beforeDelete",
    afterLoad = "odata.hook:afterLoad",
    afterCreate = "odata.event:afterCreate",
    afterUpdate = "odata.event:afterUpdate",
    afterDelete = "odata.event:afterDelete"
}
/**
 * events type hook
 */
export declare const HookEvents: HookType[];
