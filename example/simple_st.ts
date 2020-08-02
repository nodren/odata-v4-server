import { Edm, odata, ODataController, ODataQuery, ODataServer } from "../lib";

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
@odata.entitySet("ServiceTickets")
class ServiceTicketController extends ODataController {


  @odata.GET
  find(@odata.filter filter: ODataQuery) {
    // build query
    return []
  }

}

@odata.withController(ServiceTicketController, true)
class Server extends ODataServer {


};

// start server
Server.create("/odata", 3000)