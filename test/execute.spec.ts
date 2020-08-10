import * as fs from 'fs';
import * as path from 'path';
import * as streamBuffers from 'stream-buffers';
import { NotImplementedError, ODataServer } from '../src';
import { Category } from './model/model';
import { testFactory } from './server.spec';
import { Foobar, TestServer } from './test.model';


const extend = Object.assign;
const categories = require('./model/categories');
const products = require('./model/products');

function createTestFactory(it) {
  return function createTest(testcase: string, server: typeof ODataServer, command: string, compare: any, body?: any) {
    it(`${testcase} (${command})`, () => {
      const test = command.split(' ');
      return server.execute(test.slice(1).join(' '), test[0], body).then((result) => {
        expect(result).toMatchObject(compare);
      });
    });
  };
}

const createTest: any = createTestFactory(it);
createTest.only = createTestFactory(it.only);

describe('OData execute', () => {
  testFactory(createTest);

  it("should update foobar's foo property ", () => TestServer.execute('/EntitySet(1)/foo', 'PUT', {
    foo: 'PUT'
  }).then((result) => {
    expect(result).toEqual({
      statusCode: 204
    });

    return TestServer.execute('/EntitySet(1)', 'GET').then((result) => {
      expect(result).toMatchObject({
        statusCode: 200,
        body: {
          '@odata.context': 'http://localhost/$metadata#EntitySet/$entity',
          '@odata.id': 'http://localhost/EntitySet(1)',
          '@odata.editLink': 'http://localhost/EntitySet(1)',
          id: 1,
          foo: 'PUT'
        },
        elementType: Foobar,
        contentType: 'application/json'
      });
    });
  }));

  it("should delete foobar's foo property ", () => TestServer.execute('/EntitySet(1)/foo', 'DELETE').then((result) => {
    expect(result).toEqual({
      statusCode: 204
    });

    return TestServer.execute('/EntitySet(1)', 'GET').then((result) => {
      expect(result).toMatchObject({
        statusCode: 200,
        body: {
          '@odata.context': 'http://localhost/$metadata#EntitySet/$entity',
          '@odata.id': 'http://localhost/EntitySet(1)',
          '@odata.editLink': 'http://localhost/EntitySet(1)',
          id: 1,
          foo: null
        },
        elementType: Foobar,
        contentType: 'application/json'
      });
    });
  }));

  it("should delta update foobar's foo property ", () => TestServer.execute('/EntitySet(1)/foo', 'PATCH', {
    foo: 'bar'
  }).then((result) => {
    expect(result).toEqual({
      statusCode: 204
    });

    return TestServer.execute('/EntitySet(1)', 'GET').then((result) => {
      expect(result).toMatchObject({
        statusCode: 200,
        body: {
          '@odata.context': 'http://localhost/$metadata#EntitySet/$entity',
          '@odata.id': 'http://localhost/EntitySet(1)',
          '@odata.editLink': 'http://localhost/EntitySet(1)',
          id: 1,
          foo: 'bar'
        },
        elementType: Foobar,
        contentType: 'application/json'
      });
    });
  }));

  it('should create product reference on category', () => TestServer.execute("/Categories('578f2baa12eaebabec4af28e')/Products('578f2b8c12eaebabec4af242')/$ref", 'POST').then((result) => {
    expect(result).toEqual({
      statusCode: 204
    });
    return TestServer.execute("/Products('578f2b8c12eaebabec4af242')/Category", 'GET').then((result) => {
      expect(result).toMatchObject({
        statusCode: 200,
        body: extend({
          '@odata.context': 'http://localhost/$metadata#Categories/$entity'
        }, categories.filter((category) => category._id.toString() == '578f2baa12eaebabec4af28e').map((category) => extend({
          '@odata.id': `http://localhost/Categories('${category._id}')`
        }, category))[0]
        ),
        elementType: Category,
        contentType: 'application/json'
      });
    });
  }));

  it('should delete product reference on category', () => TestServer.execute("/Categories('578f2baa12eaebabec4af28e')/Products('578f2b8c12eaebabec4af242')/$ref", 'DELETE').then((result) => {
    expect(result).toEqual({
      statusCode: 204
    });
    return TestServer.execute("/Products('578f2b8c12eaebabec4af242')/Category", 'GET').then((result) => {
      throw new Error('Category reference should be deleted.');
    }, (err) => {
      expect(err.name).toEqual('ResourceNotFoundError');
    });;
  }));

  it('should update product reference on category', () => TestServer.execute("/Categories('578f2baa12eaebabec4af28d')/Products('578f2b8c12eaebabec4af242')/$ref", 'PUT').then((result) => {
    expect(result).toEqual({
      statusCode: 204
    });
    return TestServer.execute("/Products('578f2b8c12eaebabec4af242')/Category", 'GET').then((result) => {
      expect(result).toMatchObject({
        statusCode: 200,
        body: extend({
          '@odata.context': 'http://localhost/$metadata#Categories/$entity'
        }, categories.filter((category) => category._id.toString() == '578f2baa12eaebabec4af28d').map((category) => extend({
          '@odata.id': `http://localhost/Categories('${category._id}')`
        }, category))[0]
        ),
        elementType: Category,
        contentType: 'application/json'
      });
    });
  }));

  it('should delete product reference on category by ref id', () => TestServer.execute("/Categories('578f2baa12eaebabec4af28b')/Products/$ref?$id=http://localhost/Products('578f2b8c12eaebabec4af284')", 'DELETE').then((result) => {
    expect(result).toEqual({
      statusCode: 204
    });

    return TestServer.execute("/Products('578f2b8c12eaebabec4af284')/Category", 'GET').then((result) => {
      throw new Error('Category reference should be deleted.');
    }, (err) => {
      expect(err.name).toEqual('ResourceNotFoundError');
    });
  }));

  it('should delta update product reference on category', () => TestServer.execute("/Categories('578f2baa12eaebabec4af28b')/Products('578f2b8c12eaebabec4af284')/$ref", 'PATCH').then((result) => {
    expect(result).toEqual({
      statusCode: 204
    });
    return TestServer.execute("/Products('578f2b8c12eaebabec4af284')/Category", 'GET').then((result) => {
      expect(result).toMatchObject({
        statusCode: 200,
        body: extend({
          '@odata.context': 'http://localhost/$metadata#Categories/$entity'
        }, categories.filter((category) => category._id.toString() == '578f2baa12eaebabec4af28b').map((category) => extend({
          '@odata.id': `http://localhost/Categories('${category._id}')`
        }, category))[0]
        ),
        elementType: Category,
        contentType: 'application/json'
      });
    });
  }));

  it('should create category reference on product', () => TestServer.execute("/Products('578f2b8c12eaebabec4af286')/Category/$ref", 'POST', {
    '@odata.id': "http://localhost/Categories(categoryId='578f2baa12eaebabec4af28c')"
  }).then((result) => {
    expect(result).toEqual({
      statusCode: 204
    });
    return TestServer.execute("/Products('578f2b8c12eaebabec4af286')/Category", 'GET').then((result) => {
      expect(result).toMatchObject({
        statusCode: 200,
        body: extend({
          '@odata.context': 'http://localhost/$metadata#Categories/$entity'
        }, categories.filter((category) => category._id.toString() == '578f2baa12eaebabec4af28c').map((category) => extend({
          '@odata.id': `http://localhost/Categories('${category._id}')`
        }, category))[0]
        ),
        elementType: Category,
        contentType: 'application/json'
      });
    });
  }));

  it('should delete category reference on product', () => TestServer.execute("/Products('578f2b8c12eaebabec4af286')/Category/$ref", 'DELETE', {
    '@odata.id': "http://localhost/Categories('578f2baa12eaebabec4af28c')"
  }).then((result) => {
    expect(result).toEqual({
      statusCode: 204
    });

    return TestServer.execute("/Products('578f2b8c12eaebabec4af286')/Category", 'GET').then((result) => {
      throw new Error('Category reference should be deleted.');
    }, (err) => {
      expect(err.name).toEqual('ResourceNotFoundError');
    });
  }));

  it('should update category reference on product', () => TestServer.execute("/Products('578f2b8c12eaebabec4af286')/Category/$ref", 'PUT', {
    '@odata.id': "http://localhost/Categories(categoryId='578f2baa12eaebabec4af289')"
  }).then((result) => {
    expect(result).toEqual({
      statusCode: 204
    });
    return TestServer.execute("/Products('578f2b8c12eaebabec4af286')/Category", 'GET').then((result) => {
      expect(result).toMatchObject({
        statusCode: 200,
        body: extend({
          '@odata.context': 'http://localhost/$metadata#Categories/$entity'
        }, categories.filter((category) => category._id.toString() == '578f2baa12eaebabec4af289').map((category) => extend({
          '@odata.id': `http://localhost/Categories('${category._id}')`
        }, category))[0]
        ),
        elementType: Category,
        contentType: 'application/json'
      });
    });
  }));

  describe('Execute parameter is object', () => {
    it("should update foobar's foo property ", () => {
      const context: any = {};
      context.url = '/EntitySet(1)/foo';
      context.method = 'PUT';
      return TestServer.execute(context, { foo: 'PUT' }).then((result) => {
        expect(result).toEqual({
          statusCode: 204
        });
        const ctx: any = {};
        ctx.url = '/EntitySet(1)';
        ctx.method = 'GET';
        return TestServer.execute(ctx).then((result) => {
          expect(result).toMatchObject({
            statusCode: 200,
            body: {
              '@odata.context': 'http://localhost/$metadata#EntitySet/$entity',
              '@odata.id': 'http://localhost/EntitySet(1)',
              '@odata.editLink': 'http://localhost/EntitySet(1)',
              id: 1,
              foo: 'PUT'
            },
            elementType: Foobar,
            contentType: 'application/json'
          });
        });
      });
    });

    it("should delta update foobar's foo property ", () => {
      const context: any = {};
      context.url = '/EntitySet(1)/foo';
      context.method = 'PATCH';
      context.body = { foo: 'bar' };
      return TestServer.execute(context).then((result) => {
        expect(result).toEqual({
          statusCode: 204
        });
        const ctx: any = {};
        ctx.url = '/EntitySet(1)';
        ctx.method = 'GET';
        return TestServer.execute(ctx).then((result) => {
          expect(result).toMatchObject({
            statusCode: 200,
            body: {
              '@odata.context': 'http://localhost/$metadata#EntitySet/$entity',
              '@odata.id': 'http://localhost/EntitySet(1)',
              '@odata.editLink': 'http://localhost/EntitySet(1)',
              id: 1,
              foo: 'bar'
            },
            elementType: Foobar,
            contentType: 'application/json'
          });
        });
      });
    });
  });

  const d = describe.skip;

  // if (platform() == "linux") {
  //   d = describe
  // }

  d('Stream properties', () => {
    it('stream property POST', () => {
      const readableStrBuffer = new streamBuffers.ReadableStreamBuffer();
      readableStrBuffer.put('tmp.png');
      return TestServer.execute('/ImagesControllerEntitySet(1)/Data', 'POST', readableStrBuffer).then((result) => {
        readableStrBuffer.stop();
        expect(result).toEqual({
          statusCode: 204
        });
      });
    });

    it('stream property GET', () => {
      const writableStrBuffer = new streamBuffers.WritableStreamBuffer();
      return TestServer.execute({
        url: '/ImagesControllerEntitySet(1)/Data',
        method: 'GET',
        response: writableStrBuffer
      }).then((_) => {
        expect(writableStrBuffer.getContentsAsString()).toEqual('tmp.png');
      });
    });

    it('stream property with ODataStream POST', () => TestServer.execute('/ImagesControllerEntitySet(1)/Data2', 'POST', fs.createReadStream(path.join(__dirname, 'fixtures', 'logo_odata.png'))).then((result) => {
      expect(result).toMatchObject({
        statusCode: 204
      });
      expect(fs.readFileSync(path.join(__dirname, 'fixtures', 'logo_odata.png'))).toEqual(fs.readFileSync(path.join(__dirname, 'fixtures', 'tmp.png')));
      if (fs.existsSync(path.join(__dirname, 'fixtures', 'tmp.png'))) {
        fs.unlinkSync(path.join(__dirname, 'fixtures', 'tmp.png'));
      }
    }));

    it('stream property with ODataStream GET', (done) => {
      const tmp = fs.createWriteStream(path.join(__dirname, 'fixtures', 'tmp.png'));
      tmp.on('open', (_) => {
        TestServer.execute({
          url: '/ImagesControllerEntitySet(1)/Data2',
          method: 'GET',
          response: tmp
        }).then((_) => {
          expect(fs.readFileSync(path.join(__dirname, 'fixtures', 'tmp.png'))).toEqual(fs.readFileSync(path.join(__dirname, 'fixtures', 'logo_odata.png')));
          try {
            if (fs.existsSync(path.join(__dirname, 'fixtures', 'tmp.png'))) {
              fs.unlinkSync(path.join(__dirname, 'fixtures', 'tmp.png'));
            }
            done();
          } catch (err) {
            done(err);
          }
        }, done);
      }).on('error', done);
    });

    it('should return 204 after POST Data2 using generator function that yields stream', () => TestServer.execute('/Images2ControllerEntitySet(1)/Data2', 'POST', fs.createReadStream(path.join(__dirname, 'fixtures', 'logo_odata.png'))).then((result) => {
      expect(result).toMatchObject({
        statusCode: 204
      });
      expect(fs.readFileSync(path.join(__dirname, 'fixtures', 'logo_odata.png'))).toEqual(fs.readFileSync(path.join(__dirname, 'fixtures', 'tmp.png')));
      if (fs.existsSync(path.join(__dirname, 'fixtures', 'tmp.png'))) {
        fs.unlinkSync(path.join(__dirname, 'fixtures', 'tmp.png'));
      }
    }));

    it('should return 200 after GET Data2 using generator function that yields stream', (done) => {
      const tmp = fs.createWriteStream(path.join(__dirname, 'fixtures', 'tmp.png'));
      tmp.on('open', (_) => {
        TestServer.execute({
          url: '/Images2ControllerEntitySet(1)/Data2',
          method: 'GET',
          response: tmp
        }).then((_) => {
          expect(fs.readFileSync(path.join(__dirname, 'fixtures', 'tmp.png'))).toEqual(fs.readFileSync(path.join(__dirname, 'fixtures', 'logo_odata.png')));
          try {
            if (fs.existsSync(path.join(__dirname, 'fixtures', 'tmp.png'))) {
              fs.unlinkSync(path.join(__dirname, 'fixtures', 'tmp.png'));
            }
            done();
          } catch (err) {
            done(err);
          }
        }, done);
      }).on('error', done);
    });
  });

  describe('Media entity', () => {
    it('media entity POST', () => {
      const readableStrBuffer = new streamBuffers.ReadableStreamBuffer();
      readableStrBuffer.put('tmp.mp3');
      return TestServer.execute('/MusicControllerEntitySet(1)/$value', 'POST', readableStrBuffer).then((result) => {
        expect(result).toEqual({
          statusCode: 204
        });
      });
    });
  });

  describe('Not implemented error', () => {
    it('should return not implemented error', () => TestServer.execute('/EntitySet', 'GET').then(() => {
      try {
        throw new NotImplementedError();
      } catch (err) {
        expect(err.message).toEqual('Not implemented.');
      }
    }));
  });

  describe('Non existent entity', () => {
    it('should return cannot read property node error', () => TestServer.execute('/NonExistent', 'GET')
      .then((result) => {})
      .catch((err) => {
        expect(err.message).toEqual("Cannot read property 'node' of undefined");
      }));
  });
});
