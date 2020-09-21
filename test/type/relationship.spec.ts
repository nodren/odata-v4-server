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

    const { server, client, shutdownServer } = await createServerAndClient(conn, Node);

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
    }

    const conn = await createTmpConnection({
      name: 'relationship_test',
      entityPrefix: 'unit_rel_01_',
      entities: [UUIDObject]
    });

    const { client, shutdownServer } = await createServerAndClient(conn, UUIDObject);

    try {

      const objects = client.getEntitySet<UUIDObject>('UUIDObjects');

      const { id } = await objects.create({ name: 'name1' });
      expect(id).not.toBeUndefined();

      const items = await objects.find({ id });
      expect(items).toHaveLength(1);

    } finally {
      await shutdownServer();
    }

  });

});
