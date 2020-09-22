import { IncKeyProperty, ODataModel, ODataNavigation, OptionalProperty, UUIDKeyProperty } from '../../src';
import { createServerAndClient, createTmpConnection } from './utils';


describe('RelationShip Test Suite', () => {

  it('should support cycle reference for self', async () => {


    @ODataModel()
    class Node {
      @IncKeyProperty()
      id: number;
      @OptionalProperty()
      nextId: number;
      @ODataNavigation({ type: 'ManyToOne', entity: () => Node, foreignKey: 'nextId' })
      nextNode: Node;
    }

    const conn = await createTmpConnection({
      name: 'relationship_test',
      entityPrefix: 'unit_rel_01_',
      entities: [Node]
    });

    const { client, shutdownServer } = await createServerAndClient(conn, Node);

    try {

      const nodes = client.getEntitySet<Node>('Nodes');
      const node = await nodes.create({});

      expect(node.id).not.toBeUndefined();
      await nodes.update(node.id, { nextId: node.id });
      const updatedNode = await nodes.retrieve(node.id, client.newParam().expand('nextNode'));
      expect(updatedNode.id).toBe(updatedNode.nextId);
      expect(updatedNode.nextNode.id).toBe(updatedNode.nextId);

      const node2 = await nodes.create({});
      // throw error when deep merge
      await expect(() => nodes.update(node2.id, { nextNode: node2 })).rejects.toThrow();

    } finally {
      await shutdownServer();
    }


  });

  it('should support uuid filter', async () => {

    @ODataModel()
    class UUIDObject {
      @UUIDKeyProperty() id: string;
      @OptionalProperty() name: string;
      @ODataNavigation({ type: 'OneToMany', entity: () => UUIDObject2, targetForeignKey: 'obj1Id' }) obj2s: Array<UUIDObject2>
    }

    @ODataModel()
    class UUIDObject2 {
      @UUIDKeyProperty() id: string;
      @OptionalProperty() name: string;
      @OptionalProperty() obj1Id: string;
      @ODataNavigation({ type: 'ManyToOne', entity: () => UUIDObject, foreignKey: 'obj1Id' }) obj1: UUIDObject
    }

    const conn = await createTmpConnection({
      name: 'relationship_uuid_expand_test',
      entityPrefix: 'unit_rel_02_',
      entities: [UUIDObject, UUIDObject2]
    });

    const { client, shutdownServer } = await createServerAndClient(conn, UUIDObject, UUIDObject2);

    try {

      const object1s = client.getEntitySet<UUIDObject>('UUIDObjects');
      const object2s = client.getEntitySet<UUIDObject2>('UUIDObject2s');

      const anObject1 = await object1s.create({ name: 'name1' });
      expect(anObject1.id).not.toBeUndefined();

      const items = await object1s.find({ id: anObject1.id });
      expect(items).toHaveLength(1);

      const anObject2 = await object2s.create({ name: 'name2', obj1Id: anObject1.id });
      expect(anObject2).not.toBeUndefined();

      const items2 = await object2s.query(client.newParam().expand('obj1'));
      expect(items2).toHaveLength(1);
      expect(items2[0].obj1.name).toBe(anObject1.name);

      const items1 = await object1s.query(client.newParam().expand('obj2s'));
      expect(items1).toHaveLength(1);
      expect(items1[0].obj2s).toHaveLength(1);
      expect(items1[0].obj2s[0].id).toBe(anObject2.id);

    } finally {
      await shutdownServer();
    }

  });

});
