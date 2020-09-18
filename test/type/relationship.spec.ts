import { IncKeyProperty, ODataModel, ODataNavigation, OptionalProperty } from '../../src';
import { shutdown } from '../utils/server';
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

    const { server, client } = await createServerAndClient(conn, Node);

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
      await shutdown(server);
    }


  });

});
