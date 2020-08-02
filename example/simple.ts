import { ObjectID } from 'mongodb';
import { createFilter } from 'odata-v4-inmemory';
import { odata, ODataController, ODataQuery, ODataServer } from '../lib/index';

const { GET, POST, PATCH, DELETE } = odata

const categories = require('./categories').map((category) => {
  category._id = category._id.toString();
  return category;
});

const products = require('./products').map((product) => {
  product._id = product._id.toString();
  product.CategoryId = product.CategoryId.toString();
  return product;
});

export class ProductsController extends ODataController {

  @GET
  find(@odata.filter filter: ODataQuery) {
    if (filter) { return products.filter(createFilter(filter)); }
    return products;
  }

  @GET
  findOne(@odata.key key: string) {
    return products.filter((product) => product._id == key)[0];
  }

  @POST
  insert(@odata.body product: any) {
    product._id = new ObjectID().toString();
    products.push(product);
    return product;
  }

  @PATCH
  update(@odata.key key: string, @odata.body delta: any) {
    const product = products.filter((product) => product._id == key)[0];
    for (const prop in delta) {
      product[prop] = delta[prop];
    }
  }

  @DELETE
  remove(@odata.key key: string) {
    products.splice(products.indexOf(products.filter((product) => product._id == key)[0]), 1);
  }
}

export class CategoriesController extends ODataController {

  @GET
  find(@odata.filter filter: ODataQuery) {
    if (filter) { return categories.filter(createFilter(filter)); }
    return categories;
  }

  @GET
  findOne(@odata.key key: string) {
    return categories.filter((category) => category._id == key)[0];
  }

  @POST
  insert(@odata.body category: any) {
    category._id = new ObjectID().toString();
    categories.push(category);
    return category;
  }

  @PATCH
  update(@odata.key key: string, @odata.body delta: any) {
    const category = categories.filter((category) => category._id == key)[0];
    for (const prop in delta) {
      category[prop] = delta[prop];
    }
  }

  @DELETE
  remove(@odata.key key: string) {
    categories.splice(categories.indexOf(categories.filter((category) => category._id == key)[0]), 1);
  }

}

@odata.cors
@odata.controller(ProductsController, true)
@odata.controller(CategoriesController, true)
export class NorthwindODataServer extends ODataServer { }

const server = NorthwindODataServer.create("/odata", 3000)

server.on("listening", () => console.log(`server started at ${server.address()['port']}`));
