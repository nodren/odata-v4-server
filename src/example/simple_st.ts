import { Edm, odata, ODataController, ODataServer, ODataQuery } from "../lib";

@Edm.EntityType()
class ServiceTicket {

  @Edm.Key
  @Edm.Int16
  ID: number;

  @Edm.String
  @Edm.MaxLength(50)
  Title: string;

  @Edm.String
  @Edm.MaxLength(10240)
  Description: string;

}

@odata.type(ServiceTicket)
@Edm.EntitySet("ServiceTickets")
class ServiceTicketController extends ODataController {

}

@odata.namespace('default')
@odata.controller(ServiceTicketController, true)
class Server extends ODataServer {

  @odata.GET
  find(@odata.filter filter: ODataQuery) {
    // build query
    return []
  }

};

// start server
Server.create("/odata", 3000)