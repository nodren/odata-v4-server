import { TestServer, Foobar, AuthenticationServer, Image, User, Location, Music } from './test.model';
import { Product, Category } from './model/model';
import { ODataServer } from '../lib/index';
import { testFactory } from './server.spec';
import * as fs from 'fs';
import * as path from 'path';
import * as streamBuffers from 'stream-buffers';
import { platform } from 'os';

const extend = Object.assign
const categories = require('./model/categories');

function createTest(testcase: string, server: typeof ODataServer, command: string, compare: any, body?: any) {
  const test = command.split(' ');
  const method = test[0].toLowerCase();
  const path = test.slice(1).join(' ');
  const testServer = new server();
  it(`${testcase} (${command})`, () => {

    const context: any = {};
    context.url = path;
    context.method = method;
    context.body = body;

    return new Promise((resolve, reject) => {
      testServer.write(context);
      testServer.on('data', (data) => { resolve(data); });
      testServer.on('error', (err) => { reject(err); });
      testServer.end();
    }).then((result) => {
      expect(result).toMatchObject(compare);
    });
  });
}

if (typeof describe == 'function') {
  describe('OData Stream', () => {
    testFactory(createTest);

    describe('OData CRUD', () => {
      it("should update foobar's foo property", () => {
        const testServer = new TestServer();

        return new Promise((resolve, reject) => {
          const context: any = {};
          context.url = '/EntitySet(1)/foo';
          context.method = 'PUT';
          context.body = { foo: 'PUT' };

          testServer.write(context);
          testServer.on('data', (data) => { resolve(data); });
          testServer.on('error', (err) => { reject(err); });
        })
          .then((result) => {
            expect(result).toEqual({ statusCode: 204 });

            return new Promise((resolve, reject) => {
              const context: any = {};
              context.url = '/EntitySet(1)';
              context.method = 'GET';

              testServer.write(context);
              testServer.on('data', (data) => { resolve(data); });
              testServer.on('error', (err) => { reject(err); });
            })
              .then((result) => {
                expect(result).toEqual({
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

      it("should delete foobar's foo property", () => {
        const testServer = new TestServer();

        return new Promise((resolve, reject) => {
          const context: any = {};
          context.url = '/EntitySet(1)/foo';
          context.method = 'DELETE';

          testServer.write(context);
          testServer.on('data', (data) => { resolve(data); });
          testServer.on('error', (err) => { reject(err); });
        })
          .then((result) => {
            expect(result).toEqual({ statusCode: 204 });

            return new Promise((resolve, reject) => {
              const context: any = {};
              context.url = '/EntitySet(1)';
              context.method = 'GET';

              testServer.write(context);
              testServer.on('data', (data) => { resolve(data); });
              testServer.on('error', (err) => { reject(err); });
            })
              .then((result) => {
                expect(result).toMatchObject({
                  statusCode: 200,
                  body: {
                    '@odata.context': 'http://localhost/$metadata#EntitySet/$entity',
                    '@odata.id': 'http://localhost/EntitySet(1)',
                    '@odata.editLink': 'http://localhost/EntitySet(1)',
                    'id': 1,
                    'foo': null
                  },
                  elementType: Foobar,
                  contentType: 'application/json'
                });
              });
          });
      });

      it("should delta update foobar's foo property", () => {
        const testServer = new TestServer();

        return new Promise((resolve, reject) => {
          const context: any = {};
          context.url = '/EntitySet(1)/foo';
          context.method = 'PATCH';
          context.body = { foo: 'bar' };

          testServer.write(context);
          testServer.on('data', (data) => { resolve(data); });
          testServer.on('error', (err) => { reject(err); });
        })
          .then((result) => {
            expect(result).toEqual({ statusCode: 204 });

            return new Promise((resolve, reject) => {
              const context: any = {};
              context.url = '/EntitySet(1)';
              context.method = 'GET';

              testServer.write(context);
              testServer.on('data', (data) => { resolve(data); });
              testServer.on('error', (err) => { reject(err); });
            })
              .then((result) => {
                expect(result).toEqual({
                  statusCode: 200,
                  body: {
                    '@odata.context': 'http://localhost/$metadata#EntitySet/$entity',
                    '@odata.id': 'http://localhost/EntitySet(1)',
                    '@odata.editLink': 'http://localhost/EntitySet(1)',
                    'id': 1,
                    'foo': 'bar'
                  },
                  elementType: Foobar,
                  contentType: 'application/json'
                });
              });
          });
      });

      it('should create product reference on category', () => {
        const testServer = new TestServer();

        return new Promise((resolve, reject) => {
          const context: any = {};
          context.url = `/Categories('578f2baa12eaebabec4af28e')/Products('578f2b8c12eaebabec4af242')/$ref`;
          context.method = 'POST';

          testServer.write(context);
          testServer.on('data', (data) => { resolve(data); });
          testServer.on('error', (err) => { reject(err); });
        })
          .then((result) => {
            expect(result).toEqual({ statusCode: 204 });

            return new Promise((resolve, reject) => {
              const context: any = {};
              context.url = `/Products('578f2b8c12eaebabec4af242')/Category`;
              context.method = 'GET';

              testServer.write(context);
              testServer.on('data', (data) => { resolve(data); });
              testServer.on('error', (err) => { reject(err); });
            })
              .then((result) => {
                expect(result).toEqual({
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
          });
      });

      it('should delete product reference on category', () => {
        const testServer = new TestServer();

        return new Promise((resolve, reject) => {
          const context: any = {};
          context.url = `/Categories('578f2baa12eaebabec4af28e')/Products('578f2b8c12eaebabec4af242')/$ref`;
          context.method = 'DELETE';

          testServer.write(context);
          testServer.on('data', (data) => { resolve(data); });
          testServer.on('error', (err) => { reject(err); });
        })
          .then((result) => {
            expect(result).toEqual({ statusCode: 204 });

            return new Promise((resolve, reject) => {
              const context: any = {};
              context.url = `/Products('578f2b8c12eaebabec4af242')/Category`;
              context.method = 'GET';

              testServer.write(context);
              testServer.on('data', (data) => { resolve(data); });
              testServer.on('error', (err) => { reject(err); });
            })
              .then((result) => {
                throw new Error('Category reference should be deleted.');
              })
              .catch((error) => {
                expect(error.name).toEqual('ResourceNotFoundError');
              });
          });
      });

      it('should update product reference on category', () => {
        const testServer = new TestServer();

        return new Promise((resolve, reject) => {
          const context: any = {};
          context.url = `/Categories('578f2baa12eaebabec4af28d')/Products('578f2b8c12eaebabec4af242')/$ref`;
          context.method = 'PUT';

          testServer.write(context);
          testServer.on('data', (data) => { resolve(data); });
          testServer.on('error', (err) => { reject(err); });
        })
          .then((result) => {
            expect(result).toEqual({ statusCode: 204 });

            return new Promise((resolve, reject) => {
              const context: any = {};
              context.url = `/Products('578f2b8c12eaebabec4af242')/Category`;
              context.method = 'GET';

              testServer.write(context);
              testServer.on('data', (data) => { resolve(data); });
              testServer.on('error', (err) => { reject(err); });
            })
              .then((result) => {
                expect(result).toEqual({
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
          });
      });

      it('should delete product reference on category by ref id', () => {
        const testServer = new TestServer();

        return new Promise((resolve, reject) => {
          const context: any = {};
          context.url = `/Categories('578f2baa12eaebabec4af28b')/Products/$ref?$id=http://localhost/Products('578f2b8c12eaebabec4af284')`;
          context.method = 'DELETE';

          testServer.write(context);
          testServer.on('data', (data) => { resolve(data); });
          testServer.on('error', (err) => { reject(err); });
        })
          .then((result) => {
            expect(result).toEqual({ statusCode: 204 });

            return new Promise((resolve, reject) => {
              const context: any = {};
              context.url = `/Products('578f2b8c12eaebabec4af284')/Category`;
              context.method = 'GET';

              testServer.write(context);
              testServer.on('data', (data) => { resolve(data); });
              testServer.on('error', (err) => { reject(err); });
            })
              .then((result) => {
                throw new Error('Category reference should be deleted.');
              })
              .catch((error) => {
                expect(error.name).toEqual('ResourceNotFoundError');
              });
          });
      });

      it('should delta update product reference on category', () => {
        const testServer = new TestServer();

        return new Promise((resolve, reject) => {
          const context: any = {};
          context.url = `/Categories('578f2baa12eaebabec4af28b')/Products('578f2b8c12eaebabec4af284')/$ref`;
          context.method = 'PATCH';

          testServer.write(context);
          testServer.on('data', (data) => { resolve(data); });
          testServer.on('error', (err) => { reject(err); });
        })
          .then((result) => {
            expect(result).toEqual({ statusCode: 204 });

            return new Promise((resolve, reject) => {
              const context: any = {};
              context.url = `/Products('578f2b8c12eaebabec4af284')/Category`;
              context.method = 'GET';

              testServer.write(context);
              testServer.on('data', (data) => { resolve(data); });
              testServer.on('error', (err) => { reject(err); });
            })
              .then((result) => {
                expect(result).toEqual({
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
          });
      });

      it('should create product reference on category', () => {
        const testServer = new TestServer();

        return new Promise((resolve, reject) => {
          const context: any = {};
          context.url = `/Products('578f2b8c12eaebabec4af286')/Category/$ref`;
          context.method = 'POST';
          context.body = {
            '@odata.id': "http://localhost/Categories(categoryId='578f2baa12eaebabec4af28c')"
          };

          testServer.write(context);
          testServer.on('data', (data) => { resolve(data); });
          testServer.on('error', (err) => { reject(err); });
        })
          .then((result) => {
            expect(result).toEqual({ statusCode: 204 });

            return new Promise((resolve, reject) => {
              const context: any = {};
              context.url = `/Products('578f2b8c12eaebabec4af286')/Category`;
              context.method = 'GET';

              testServer.write(context);
              testServer.on('data', (data) => { resolve(data); });
              testServer.on('error', (err) => { reject(err); });
            })
              .then((result) => {
                expect(result).toEqual({
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
          });
      });

      it('should delete category reference on product', () => {
        const testServer = new TestServer();

        return new Promise((resolve, reject) => {
          const context: any = {};
          context.url = `/Products('578f2b8c12eaebabec4af286')/Category/$ref`;
          context.method = 'DELETE';
          context.body = {
            '@odata.id': "http://localhost/Categories('578f2baa12eaebabec4af28c')"
          };

          testServer.write(context);
          testServer.on('data', (data) => { resolve(data); });
          testServer.on('error', (err) => { reject(err); });
        })
          .then((result) => {
            expect(result).toEqual({ statusCode: 204 });

            return new Promise((resolve, reject) => {
              const context: any = {};
              context.url = `/Products('578f2b8c12eaebabec4af286')/Category`;
              context.method = 'GET';

              testServer.write(context);
              testServer.on('data', (data) => { resolve(data); });
              testServer.on('error', (err) => { reject(err); });
            })
              .then((result) => {
                throw new Error('Category reference should be deleted.');
              })
              .catch((error) => {
                expect(error.name).toEqual('ResourceNotFoundError');
              });
          });
      });

      it('should update category reference on product', () => {
        const testServer = new TestServer();

        return new Promise((resolve, reject) => {
          const context: any = {};
          context.url = `/Products('578f2b8c12eaebabec4af286')/Category/$ref`;
          context.method = 'PUT';
          context.body = {
            '@odata.id': "http://localhost/Categories(categoryId='578f2baa12eaebabec4af289')"
          };

          testServer.write(context);
          testServer.on('data', (data) => { resolve(data); });
          testServer.on('error', (err) => { reject(err); });
        })
          .then((result) => {
            expect(result).toEqual({ statusCode: 204 });

            return new Promise((resolve, reject) => {
              const context: any = {};
              context.url = `/Products('578f2b8c12eaebabec4af286')/Category`;
              context.method = 'GET';

              testServer.write(context);
              testServer.on('data', (data) => { resolve(data); });
              testServer.on('error', (err) => { reject(err); });
            })
              .then((result) => {
                expect(result).toEqual({
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
          });
      });
    });

    let d = describe.skip
  
    // if (platform() == "linux") {
    //   d = describe
    // }
    
    d('Stream properties', () => {
      it('stream property POST', () => {
        const testServer = new TestServer();
        const readableStrBuffer = new streamBuffers.ReadableStreamBuffer();
        readableStrBuffer.put('tmp.png');

        return new Promise((resolve, reject) => {
          const context: any = {};
          context.url = `/ImagesControllerEntitySet(1)/Data`;
          context.method = 'POST';
          context.body = readableStrBuffer;

          testServer.write(context);
          testServer.on('data', (data) => resolve(data));
          testServer.on('error', reject);
        }).then((result) => {
          readableStrBuffer.stop();
          expect(result).toEqual({ statusCode: 204 });
        });
      });

      it('stream property GET', () => {
        const testServer = new TestServer();
        const writableStrBuffer = new streamBuffers.WritableStreamBuffer();

        return new Promise((resolve, reject) => {
          testServer.write({
            url: '/ImagesControllerEntitySet(1)/Data',
            method: 'GET',
            response: writableStrBuffer
          });
          testServer.on('data', (data) => resolve(data));
          testServer.on('error', reject);
        }).then((_) => {
          expect(writableStrBuffer.getContentsAsString()).toEqual('tmp.png');
        });
      });

      it('stream property with ODataStream POST', async () => {
        const testServer = new TestServer();

        return new Promise((resolve, reject) => {
          testServer.write({
            url: '/ImagesControllerEntitySet(1)/Data2',
            method: 'POST',
            body: fs.createReadStream(path.join(__dirname, 'fixtures', 'logo_jaystack.png'))
          });
          testServer.on('data', (data) => resolve(data));
          testServer.on('error', reject);
        }).then((result) => {

          expect(result).toEqual({
            statusCode: 204
          });

          expect(
            fs.readFileSync(path.join(__dirname, 'fixtures', 'logo_jaystack.png'))
          ).toEqual(
            fs.readFileSync(path.join(__dirname, 'fixtures', 'tmp.png'))
          );

          if (fs.existsSync(path.join(__dirname, 'fixtures', 'tmp.png'))) {
            fs.unlinkSync(path.join(__dirname, 'fixtures', 'tmp.png'));
          }
        });
      });

      it('stream property with ODataStream GET', () => new Promise((resolve, reject) => {
        const tmp = fs.createWriteStream(path.join(__dirname, 'fixtures', 'tmp.png'));
        tmp.on('open', (_) => {
          const testServer = new TestServer();
          testServer.write({
            url: '/ImagesControllerEntitySet(1)/Data2',
            method: 'GET',
            response: tmp
          });
          testServer.on('data', (data) => resolve(data));
          testServer.on('error', reject);
        }).on('error', reject);
      }).then((_) => {

        expect(fs.readFileSync(path.join(__dirname, 'fixtures', 'tmp.png'))).toEqual(fs.readFileSync(path.join(__dirname, 'fixtures', 'logo_jaystack.png')));

        if (fs.existsSync(path.join(__dirname, 'fixtures', 'tmp.png'))) {
          fs.unlinkSync(path.join(__dirname, 'fixtures', 'tmp.png'));
        }

      }));

      it('should return 204 after POST Data2 using generator function that yields stream', () => {
        const testServer = new TestServer();

        return new Promise((resolve, reject) => {
          testServer.write({
            url: '/Images2ControllerEntitySet(1)/Data2',
            method: 'POST',
            body: fs.createReadStream(path.join(__dirname, 'fixtures', 'logo_jaystack.png'))
          });
          testServer.on('data', (data) => resolve(data));
          testServer.on('error', reject);
        }).then((result) => {
          expect(result).toEqual({
            statusCode: 204
          });
          expect(fs.readFileSync(path.join(__dirname, 'fixtures', 'logo_jaystack.png'))).toEqual(fs.readFileSync(path.join(__dirname, 'fixtures', 'tmp.png')));
          if (fs.existsSync(path.join(__dirname, 'fixtures', 'tmp.png'))) {
            fs.unlinkSync(path.join(__dirname, 'fixtures', 'tmp.png'));
          }
        });
      });

      it('should return 200 after GET Data2 using generator function that yields stream', () => new Promise((resolve, reject) => {
        const tmp = fs.createWriteStream(path.join(__dirname, 'fixtures', 'tmp.png'));
        tmp.on('open', (_) => {
          const testServer = new TestServer();
          testServer.write({
            url: '/Images2ControllerEntitySet(1)/Data2',
            method: 'GET',
            response: tmp
          });
          testServer.on('data', (data) => resolve(data));
          testServer.on('error', reject);
        }).on('error', reject);
      }).then((_) => {
        expect(fs.readFileSync(path.join(__dirname, 'fixtures', 'tmp.png'))).toEqual(fs.readFileSync(path.join(__dirname, 'fixtures', 'logo_jaystack.png')));
        if (fs.existsSync(path.join(__dirname, 'fixtures', 'tmp.png'))) {
          fs.unlinkSync(path.join(__dirname, 'fixtures', 'tmp.png'));
        }
      }));
    });

    describe('Media entity', () => {
      it('media entity POST', () => {
        const testServer = new TestServer();
        const readableStrBuffer = new streamBuffers.ReadableStreamBuffer();
        readableStrBuffer.put('tmp.mp3');

        return new Promise((resolve, reject) => {
          const context: any = {};
          context.url = `/MusicControllerEntitySet(1)/$value`;
          context.method = 'POST';
          context.body = readableStrBuffer;

          testServer.write(context);
          testServer.on('data', (data) => resolve(data));
          testServer.on('error', (err) => reject(err));
        })
          .then((result) => expect(result).toEqual({ statusCode: 204 }));
      });
    });

    describe('Non existent entity', () => {
      it('should return cannot read property node error', () => {
        const testServer = new TestServer();

        return new Promise((resolve, reject) => {
          const context: any = {};
          context.url = `/NonExistent`;
          context.method = 'GET';

          testServer.write(context);
          testServer.on('data', (data) => { resolve(data); });
          testServer.on('error', (err) => { reject(err); });
        })
          .then((result) => {
            expect(result).toEqual({ statusCode: 204 });
          })
          .catch((error) => {
            expect(error.message).toEqual("Cannot read property 'node' of undefined");
          });
      });
    });
  });
}
