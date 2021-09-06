const WebSocket = require('ws');
const util = require('util');

const webSocketsServerPort = 8000;
const webSocketServer = require('websocket').server;
const http = require('http');
// Http server and the websocket server.
const server = http.createServer();
server.listen(webSocketsServerPort);
const wsServer = new webSocketServer({
  httpServer: server
});

// Connections in this object
const clients = {};

// Unique userid for every user.
const getUniqueID = () => {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + s4() + '-' + s4();
};

const sendMessage = (json) => {
    // Send the current data to all connected clients
    Object.keys(clients).map((client) => {
      clients[client].sendUTF(json);
    });
  };

wsServer.on('request', function(request) {
  var userID = getUniqueID();
  console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');
  const connection = request.accept(null, request.origin);
  clients[userID] = connection;
  console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(clients));
});

const ws = new WebSocket('wss://observer.terra.dev');

let bLunaPrice;
let liquidationPrice;

ws.onopen = function () {
	console.log('connected to websocket. subscribing...')
    // subscribe to new_block events
    ws.send(JSON.stringify({subscribe: "new_block", chain_id: "columbus-4"}));

    ws.onmessage = async function (message) {
        
        /* process messages here */
        const data = await JSON.parse(message.data);

        
        const transactions = await data.data.txs;
        
            try {
            transactions.forEach( transaction => {
                
                transaction.logs.forEach( log => {
                    const logEvents = log.events;
                    let borrow_stable;
                    let borrower;
                    let borrow_amount;
                    let exchange_rates;
                    let bLunaDeposited;

                    logEvents.forEach(async logEvent => {
                        if (logEvent.type === 'aggregate_vote') {
                            const RatesAttributes = logEvent.attributes;
                            
                            RatesAttributes.forEach( RateAttribute => {
                                if (RateAttribute.key === 'exchange_rates') {
                                    exchange_rates = RateAttribute.value;
                                    const prices = exchange_rates.split(",");

                                    prices.forEach( price => {
                                        if (price.slice(-4) === 'uusd') {
                                            bLunaPrice = price.slice(0, -4);
                                        } 
                                    });
                                }
                            });
                        }

                        if(logEvent.type == 'from_contract') {
                            
                            if (!logEvent.attributes) {
                                return false;
                            }

                            logEvent.attributes.forEach( attribute => {
                                
                                if (attribute.key === "borrower") {
                                    borrower = attribute.value;
                                }

                                if (attribute.key === "borrow_amount") {
                                    borrow_amount = attribute.value;
                                }               

                                if (attribute.key === "action" && attribute.value === "deposit_collateral") {
                                    console.log(logEvent.attributes.slice(-1)[0].value);
                                    bLunaDeposited = logEvent.attributes.slice(-1)[0].value;
                                }

                                if(attribute.key === 'action' && attribute.value === 'borrow_stable') {
                                    borrow_stable = true;
                                }

                                if(borrower && borrow_amount && borrow_stable) {
                                    console.log("borrower: " + borrower + " | borrow_amount: " + borrow_amount);
                                    console.log("bLunaPrice: " + bLunaPrice);  
                                    let msg = new Object();
                                    msg.borrower = borrower;
                                    msg.borrow_amount = borrow_amount;
                                    msg.bLunaPrice = bLunaPrice;
                                    msg.bLunaDeposited = bLunaDeposited;
                                    msg.liquidationPrice = borrow_amount / ((bLunaPrice - bLunaDeposited) * 0.6)
                                    sendMessage(JSON.stringify(msg));
                                    console.log(msg);
                                }
                            });
                        }

                        if(logEvent.type == 'execute_contract') {
                            //console.log(util.inspect(logEvent, false, null, true /* enable colors */))

                        }
                    });
                
                });     
            });

        } catch (err) {
            console.log("Error occured");
        }
    }

    ws.onclose = function(e) {
        console.log('websocket closed. reopening...');
        setTimeout(function() {
            main();
        }, 1000);
    }
}